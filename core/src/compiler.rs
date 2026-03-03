//! Compiler: converts validated AST + Schema into IR.
//!
//! The compiler is responsible for:
//! - Resolving domain references
//! - Validating field existence
//! - Enforcing type compatibility
//! - Validating operator legality
//! - Partitioning rules by scope
//!
//! The output (`CompiledPolicy`) is guaranteed to be:
//! - Structurally valid
//! - Type-safe
//! - Ready for deterministic evaluation
//!
//! The evaluation engine performs no structural validation.
//! All semantic guarantees are enforced here.

use crate::ast::*;
use crate::errors::CompileError;
use crate::governance::{GovernanceAst, validate_governance};
use crate::ir::*;
use crate::schema::FieldType;
use crate::schema::Schema;

use std::collections::HashMap;

/// Internal representation of a compiled rule paired with its scope.
///
/// Used during compilation before final partitioning into the IR.
#[derive(Debug)]
struct CompiledRuleWithScope {
    scope: CompiledScope,
    rule: CompiledRule,
}

/// Internal scope classification used for rule partitioning.
#[derive(Debug)]
enum CompiledScope {
    Action(String),
    Actor(String),
    Global,
}

/// Compiles a single rule:
/// - Validates scope
/// - Validates condition
/// - Converts effect
/// - Produces a scope-tagged compiled rule
fn compile_rule(schema: &Schema, rule: RuleAst) -> Result<CompiledRuleWithScope, CompileError> {
    let scope = compile_scope(schema, &rule.scope)?;
    let action_scope = match &scope {
        CompiledScope::Action(action) => Some(action),
        _ => None,
    };

    let condition = compile_condition(schema, rule.when, action_scope)?;

    let effect = match rule.effect {
        EffectAst::Allow => Effect::Allow,
        EffectAst::Block => Effect::Block,
        EffectAst::RequireApproval => Effect::RequireApproval,
    };

    let compiled_rule = CompiledRule {
        rule_id: rule.id,
        condition,
        effect,
    };

    Ok(CompiledRuleWithScope {
        scope,
        rule: compiled_rule,
    })
}

/// Validates and compiles rule scope.
///
/// Action scope requires the action to exist in the schema.
/// Actor scope currently does not validate against a registry
/// (future extension point).
fn compile_scope(schema: &Schema, scope: &ScopeAst) -> Result<CompiledScope, CompileError> {
    match scope {
        ScopeAst::Action { action } => {
            if !schema.actions.contains_key(action) {
                return Err(CompileError::UnknownAction(action.clone()));
            }
            Ok(CompiledScope::Action(action.clone()))
        }
        ScopeAst::Actor { actor } => {
            // Minimal: no actor registry yet
            Ok(CompiledScope::Actor(actor.clone()))
        }
        ScopeAst::Global { global } => {
            if !global {
                return Err(CompileError::InvalidScope);
            }
            Ok(CompiledScope::Global)
        }
    }
}

/// Compiles a subject reference into a resolved `SubjectRef`.
///
/// Domain is validated immediately.
/// Field existence is validated for actor and snapshot domains.
/// Action fields are validated later using the resolved action scope.
fn compile_subject(schema: &Schema, subject: &SubjectAst) -> Result<SubjectRef, CompileError> {
    let domain = match subject.domain.as_str() {
        "action" => Domain::Action,
        "actor" => Domain::Actor,
        "snapshot" => Domain::Snapshot,
        other => return Err(CompileError::UnknownDomain(other.to_string())),
    };

    let field_exists = match domain {
        Domain::Action => {
            // NOTE: Field existence validated later against action scope if needed.
            true
        }
        Domain::Actor => schema.actor_fields.contains_key(&subject.field),
        Domain::Snapshot => schema.snapshot_fields.contains_key(&subject.field),
    };

    if !field_exists {
        return Err(CompileError::UnknownField {
            domain: subject.domain.clone(),
            field: subject.field.clone(),
        });
    }

    Ok(SubjectRef {
        domain,
        field: subject.field.clone(),
    })
}

fn compile_operator(op: &str) -> Result<Operator, CompileError> {
    match op {
        "equals" => Ok(Operator::Equals),
        "not_equals" => Ok(Operator::NotEquals),
        "greater_than" => Ok(Operator::GreaterThan),
        "less_than" => Ok(Operator::LessThan),
        "in" => Ok(Operator::In),
        "not_in" => Ok(Operator::NotIn),
        other => Err(CompileError::UnknownOperator(other.to_string())),
    }
}

fn compile_value(schema: &Schema, value: ValueAst) -> Result<ValueRef, CompileError> {
    match value {
        ValueAst::Literal { literal } => {
            let scalar = match literal {
                LiteralValueAst::String(s) => ScalarValue::String(s),
                LiteralValueAst::Number(n) => ScalarValue::Number(n),
                LiteralValueAst::Boolean(b) => ScalarValue::Boolean(b),
            };
            Ok(ValueRef::Literal(scalar))
        }
        ValueAst::Subject { subject } => {
            let compiled = compile_subject(schema, &subject)?;
            Ok(ValueRef::Subject(compiled))
        }
    }
}

/// Ensures that an operator is valid for the given field type.
///
/// This prevents semantically invalid comparisons such as:
/// - greater_than on strings
/// - in on booleans
fn validate_operator_for_type(
    operator: &Operator,
    field_type: &FieldType,
) -> Result<(), CompileError> {
    match field_type {
        FieldType::Number => match operator {
            Operator::Equals | Operator::NotEquals | Operator::GreaterThan | Operator::LessThan => {
                Ok(())
            }
            _ => Err(CompileError::InvalidOperatorForType {
                operator: format!("{:?}", operator),
                field_type: "number".into(),
            }),
        },
        FieldType::String => match operator {
            Operator::Equals | Operator::NotEquals => Ok(()),
            _ => Err(CompileError::InvalidOperatorForType {
                operator: format!("{:?}", operator),
                field_type: "string".into(),
            }),
        },
        FieldType::Boolean => match operator {
            Operator::Equals | Operator::NotEquals => Ok(()),
            _ => Err(CompileError::InvalidOperatorForType {
                operator: format!("{:?}", operator),
                field_type: "boolean".into(),
            }),
        },
    }
}

/// Compiles and fully validates an atomic comparison.
/// 
/// Enforces:
/// - Field existence
/// - Operator validity
/// - Type compatibility
fn compile_atomic(
    schema: &Schema,
    atom: AtomicConditionAst,
    action_scope: Option<&String>,
) -> Result<AtomicCondition, CompileError> {
    //Compile LHS
    let lhs = compile_subject(schema, &atom.subject)?;
    let lhs_type = get_field_type(schema, &lhs, action_scope)?;

    //Compile operator
    let operator = compile_operator(&atom.operator)?;

    //Compile RHS
    let rhs = compile_value(schema, atom.value)?;

    //Determine RHS type
    let rhs_type = match &rhs {
        ValueRef::Literal(lit) => match lit {
            ScalarValue::String(_) => FieldType::String,
            ScalarValue::Number(_) => FieldType::Number,
            ScalarValue::Boolean(_) => FieldType::Boolean,
        },
        ValueRef::Subject(subject) => get_field_type(schema, subject, action_scope)?,
    };

    //Enforce type match
    if lhs_type != rhs_type {
        return Err(CompileError::TypeMismatch {
            left: format!("{:?}", lhs_type),
            right: format!("{:?}", rhs_type),
        });
    }

    //Validate operator compatibility
    validate_operator_for_type(&operator, &lhs_type)?;

    Ok(AtomicCondition { lhs, operator, rhs })
}

/// Compiles logical conditions.
///
/// Logical blocks (`All` / `Any`) must contain at least two operands.
/// Single-element logical blocks are rejected to avoid ambiguous semantics.
fn compile_condition(
    schema: &Schema,
    condition: ConditionAst,
    action_scope: Option<&String>,
) -> Result<CompiledCondition, CompileError> {
    match condition {
        ConditionAst::Atomic(atom) => {
            let compiled = compile_atomic(schema, atom, action_scope)?;
            Ok(CompiledCondition::Atomic(compiled))
        }
        ConditionAst::All { all } => {
            if all.len() < 2 {
                return Err(CompileError::InvalidLogicalCondition);
            }

            let compiled = all
                .into_iter()
                .map(|a| compile_atomic(schema, a, action_scope))
                .collect::<Result<Vec<_>, _>>()?;

            Ok(CompiledCondition::All(compiled))
        }
        ConditionAst::Any { any } => {
            if any.len() < 2 {
                return Err(CompileError::InvalidLogicalCondition);
            }

            let compiled = any
                .into_iter()
                .map(|a| compile_atomic(schema, a, action_scope))
                .collect::<Result<Vec<_>, _>>()?;

            Ok(CompiledCondition::Any(compiled))
        }
    }
}

/// Compiles a full policy AST into a `CompiledPolicy`.
///
/// Rules are partitioned by scope to enable efficient evaluation:
/// - Action-scoped rules
/// - Actor-scoped rules
/// - Global rules
///
/// The resulting structure is optimized for runtime lookup.
pub fn compile_policy(schema: &Schema, policy: PolicyAst) -> Result<CompiledPolicy, CompileError> {
    let mut action_rules: HashMap<String, Vec<CompiledRule>> = HashMap::new();
    let mut actor_rules: HashMap<String, Vec<CompiledRule>> = HashMap::new();
    let mut global_rules: Vec<CompiledRule> = Vec::new();

    for rule in policy.rules {
        let compiled_rule = compile_rule(schema, rule)?;

        match &compiled_rule.scope {
            CompiledScope::Action(action) => {
                action_rules
                    .entry(action.clone())
                    .or_default()
                    .push(compiled_rule.rule);
            }
            CompiledScope::Actor(actor) => {
                actor_rules
                    .entry(actor.clone())
                    .or_default()
                    .push(compiled_rule.rule);
            }
            CompiledScope::Global => {
                global_rules.push(compiled_rule.rule);
            }
        }
    }

    Ok(CompiledPolicy {
        action_rules,
        actor_rules,
        global_rules,
    })
}

/// Resolves the field type for a subject reference.
///
/// Action fields require an active action scope.
/// Accessing action fields outside action scope is invalid.
fn get_field_type(
    schema: &Schema,
    subject: &SubjectRef,
    action_scope: Option<&String>,
) -> Result<FieldType, CompileError> {
    match subject.domain {
        Domain::Actor => schema
            .actor_fields
            .get(&subject.field)
            .cloned()
            .ok_or_else(|| CompileError::UnknownField {
                domain: "actor".into(),
                field: subject.field.clone(),
            }),

        Domain::Snapshot => schema
            .snapshot_fields
            .get(&subject.field)
            .cloned()
            .ok_or_else(|| CompileError::UnknownField {
                domain: "snapshot".into(),
                field: subject.field.clone(),
            }),

        Domain::Action => {
            if let Some(action_name) = action_scope {
                schema
                    .actions
                    .get(action_name)
                    .and_then(|a| a.fields.get(&subject.field))
                    .cloned()
                    .ok_or_else(|| CompileError::UnknownField {
                        domain: "action".into(),
                        field: subject.field.clone(),
                    })
            } else {
                Err(CompileError::UnknownField {
                    domain: "action".into(),
                    field: subject.field.clone(),
                })
            }
        }
    }
}

/// Compiles a policy with governance validation.
///
/// Governance validation runs before compilation and may reject
/// structurally valid policies that violate higher-order constraints.
pub fn compile_with_governance(
    schema: &Schema,
    policy: PolicyAst,
    governance: &GovernanceAst,
) -> Result<CompiledPolicy, CompileError> {
    validate_governance(&policy, governance).map_err(CompileError::Governance)?;

    compile_policy(schema, policy)
}
