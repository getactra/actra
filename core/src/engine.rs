//! Evaluation engine for compiled policies.
//! Deterministic evaluation engine for compiled policies.
//!
//! The engine operates on a fully validated `CompiledPolicy`.
//! No structural or semantic validation occurs at runtime.
//!
//! Evaluation characteristics:
//! - Deterministic rule scanning
//! - First-match-wins semantics within a rule set
//! - Scope-prioritized evaluation (action > global)
//! - Fail-safe comparison behavior (invalid resolution returns false)
use crate::ir::*;
use std::collections::HashMap;

/// Input provided to the evaluation engine.
///
/// All maps are expected to conform to the validated schema
/// used during compilation.
#[derive(Debug)]
pub struct EvaluationInput {
    pub action: HashMap<String, ScalarValue>,
    pub actor: HashMap<String, ScalarValue>,
    pub snapshot: HashMap<String, ScalarValue>,
}

/// Result of policy evaluation.
///
/// If no rule matches, the default effect is applied.
#[derive(Debug)]
pub struct EvaluationResult {
    pub effect: Effect,
    pub matched_rule: Option<String>,
}

/// Evaluate a compiled policy against runtime input.
///
/// Evaluation order:
/// 1. Action-scoped rules (if action.type exists)
/// 2. Global rules
/// 3. Default allow
///
/// First matching rule within a scope wins.
pub fn evaluate(
    policy: &CompiledPolicy,
    input: &EvaluationInput,
) -> EvaluationResult {
    // 1. Check action-specific rules
    // Action rules require `action.type` to be present and string-typed.
    if let Some(action_type) = input.action.get("type") {
        if let ScalarValue::String(action_name) = action_type {
            if let Some(rules) = policy.action_rules.get(action_name) {
                if let Some(result) = evaluate_rules(rules, input) {
                    return result;
                }
            }
        }
    }

    // 2. Check actor-specific rules (optional future expansion)
    // Actor-scoped evaluation not yet implemented.

    // 3. Check global rules
    if let Some(result) = evaluate_rules(&policy.global_rules, input) {
        return result;
    }

    // 4. Default allow
    EvaluationResult {
        effect: Effect::Allow,
        matched_rule: None,
    }
}

/// Evaluates rules sequentially and returns the first match.
///
/// Rule ordering is preserved from compilation.
/// First matching rule determines the outcome.
fn evaluate_rules(
    rules: &[CompiledRule],
    input: &EvaluationInput,
) -> Option<EvaluationResult> {
    for rule in rules {
        if evaluate_condition(&rule.condition, input) {
            return Some(EvaluationResult {
                effect: rule.effect.clone(),
                matched_rule: Some(rule.rule_id.clone()),
            });
        }
    }
    None
}

/// Evaluates a compiled condition tree.
///
/// Logical semantics:
/// - `All` logical AND
/// - `Any` logical OR
fn evaluate_condition(
    condition: &CompiledCondition,
    input: &EvaluationInput,
) -> bool {
    match condition {
        CompiledCondition::Atomic(atom) => evaluate_atomic(atom, input),
        CompiledCondition::All(conditions) => {
            conditions.iter().all(|c| evaluate_atomic(c, input))
        }
        CompiledCondition::Any(conditions) => {
            conditions.iter().any(|c| evaluate_atomic(c, input))
        }
    }
}

/// Evaluates a single atomic comparison.
///
/// If either side cannot be resolved, the condition evaluates to false.
fn evaluate_atomic(
    atom: &AtomicCondition,
    input: &EvaluationInput,
) -> bool {
    let lhs = resolve_subject(&atom.lhs, input);
    let rhs = resolve_value(&atom.rhs, input);

    match (lhs, rhs) {
        (Some(l), Some(r)) => compare_values(&l, &atom.operator, &r),
        _ => false,
    }
}

/// Resolves a subject reference to a runtime value.
///
/// Returns `None` if the field is missing.
/// Missing fields are treated as non-matching.
fn resolve_subject(
    subject: &SubjectRef,
    input: &EvaluationInput,
) -> Option<ScalarValue> {
    let map = match subject.domain {
        Domain::Action => &input.action,
        Domain::Actor => &input.actor,
        Domain::Snapshot => &input.snapshot,
    };

    map.get(&subject.field).cloned()
}

fn resolve_value(
    value: &ValueRef,
    input: &EvaluationInput,
) -> Option<ScalarValue> {
    match value {
        ValueRef::Literal(v) => Some(v.clone()),
        ValueRef::Subject(subject) => resolve_subject(subject, input),
    }
}

/// Compares two scalar values using the validated operator.
///
/// Only type-compatible comparisons are expected.
/// Any unsupported operator-type combination returns false.
fn compare_values(
    lhs: &ScalarValue,
    operator: &Operator,
    rhs: &ScalarValue,
) -> bool {
    match (lhs, rhs) {
        (ScalarValue::Number(l), ScalarValue::Number(r)) => match operator {
            Operator::Equals => l == r,
            Operator::NotEquals => l != r,
            Operator::GreaterThan => l > r,
            Operator::LessThan => l < r,
            _ => false,
        },
        (ScalarValue::String(l), ScalarValue::String(r)) => match operator {
            Operator::Equals => l == r,
            Operator::NotEquals => l != r,
            _ => false,
        },
        (ScalarValue::Boolean(l), ScalarValue::Boolean(r)) => match operator {
            Operator::Equals => l == r,
            Operator::NotEquals => l != r,
            _ => false,
        },
        _ => false,
    }
}

