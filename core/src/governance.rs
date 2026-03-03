//! Governance validation layer.
//!
//! Governance rules operate on the raw Policy AST before compilation.
//!
//! This layer enables higher-order constraints such as:
//! - Requiring certain rules to exist
//! - Limiting rule counts
//! - Restricting allowed fields
//! - Forbidding specific rule patterns
//!
//! Governance validation runs before compilation and may reject
//! structurally valid policies that violate organizational constraints.
use serde::Deserialize;

use crate::ast::{EffectAst, PolicyAst, ScopeAst};

/// Root governance configuration loaded from YAML.
///
/// Governance rules are evaluated against the policy AST
/// prior to compilation.
#[derive(Debug, Deserialize)]
pub struct GovernanceAst {
    pub version: u32,
    pub governance: GovernanceBlock,
}

#[derive(Debug, Deserialize)]
pub struct GovernanceBlock {
    pub rules: Vec<GovernanceRule>,
}

/// Single governance rule.
///
/// A governance rule:
/// - Selects a subset of policy rules
/// - Applies a constraint
/// - Emits a custom error message if violated
#[derive(Debug, Deserialize)]
pub struct GovernanceRule {
    pub id: String,
    pub applies_to: Option<AppliesTo>,
    pub select: Selector,
    pub must: Constraint,
    pub error: String,
}

#[derive(Debug, Deserialize)]
pub struct AppliesTo {
    pub actions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct Selector {
    #[serde(rename = "where")]
    pub where_clause: RuleFilter,
}

#[derive(Debug, Deserialize)]
pub struct RuleFilter {
    pub id: Option<String>,
    pub scope: Option<ScopeFilter>,
    pub effect: Option<String>,
    pub when: Option<WhenFilter>,
}

#[derive(Debug, Deserialize)]
pub struct WhenFilter {
    pub subject: Option<SubjectFilter>,
}

#[derive(Debug, Deserialize)]
pub struct SubjectFilter {
    pub domain: Option<String>,
    pub field: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ScopeFilter {
    pub global: Option<bool>,
    pub action: Option<String>,
}

/// Constraint applied to selected policy rules.
///
/// Untagged enum allows concise DSL structure in YAML.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum Constraint {
    Exists { exists: bool },
    MinCount { min_count: usize },
    MaxCount { max_count: usize },
    Forbid { forbid: bool },
    AllowedFields { allowed_fields: Vec<String> },
}

/// Represents a governance violation detected during validation.
///
/// These are aggregated and returned as a batch.
#[derive(Debug)]
pub struct GovernanceViolation {
    pub rule_id: String,
    pub message: String,
}

/// Validates a policy against governance rules.
///
/// Returns:
/// - `Ok(())` if all governance rules pass
/// - `Err(Vec<GovernanceViolation>)` if one or more constraints fail
///
/// Validation flow:
/// 1. Check applicability
/// 2. Select matching policy rules
/// 3. Evaluate constraint
pub fn validate_governance(
    policy: &PolicyAst,
    governance: &GovernanceAst,
) -> Result<(), Vec<GovernanceViolation>> {
    let mut violations = Vec::new();

    for rule in &governance.governance.rules {
        if !applies_to_matches(policy, rule) {
            continue;
        }
        // Step 1: select matching rules
        let selected = select_rules(policy, rule);

        // Step 2: evaluate constraint
        if !evaluate_constraint(&selected, &rule.must) {
            violations.push(GovernanceViolation {
                rule_id: rule.id.clone(),
                message: rule.error.clone(),
            });
        }
    }

    if violations.is_empty() {
        Ok(())
    } else {
        Err(violations)
    }
}

/// Determines whether a governance rule applies to the given policy.
///
/// If `applies_to.actions` is specified, the rule applies only if
/// at least one policy rule targets one of those actions.
fn applies_to_matches(policy: &PolicyAst, rule: &GovernanceRule) -> bool {
    if let Some(applies) = &rule.applies_to {
        let target_actions = &applies.actions;

        for policy_rule in &policy.rules {
            if let crate::ast::ScopeAst::Action { action } = &policy_rule.scope {
                if target_actions.contains(action) {
                    return true;
                }
            }
        }

        false
    } else {
        true
    }
}

/// Selects policy rules matching the governance selector.
fn select_rules<'a>(policy: &'a PolicyAst, rule: &GovernanceRule) -> Vec<&'a crate::ast::RuleAst> {
    policy
        .rules
        .iter()
        .filter(|r| matches_selector(r, &rule.select.where_clause))
        .collect()
}

/// Evaluates whether a policy rule matches the selector filter.
///
/// Matching is conjunctive:
/// All specified filter fields must match.
fn matches_selector(rule: &crate::ast::RuleAst, filter: &RuleFilter) -> bool {
    // Match ID
    if let Some(ref id) = filter.id {
        if &rule.id != id {
            return false;
        }
    }

    // Match Effect
    if let Some(ref expected_effect) = filter.effect {
        let matches = match (&rule.effect, expected_effect.as_str()) {
            (EffectAst::Allow, "allow") => true,
            (EffectAst::Block, "block") => true,
            (EffectAst::RequireApproval, "require_approval") => true,
            _ => false,
        };

        if !matches {
            return false;
        }
    }

    // Match Scope
    // Scope filter must match if specified.
    // If `global: true`, only global rules match.
    // If `action` is specified, rule must target that action.
    if let Some(ref scope_filter) = filter.scope {
        if let Some(global) = scope_filter.global {
            match &rule.scope {
                ScopeAst::Global { global: g } => {
                    if g != &global {
                        return false;
                    }
                }
                _ => {
                    if global {
                        return false;
                    }
                }
            }
        }

        if let Some(ref action) = scope_filter.action {
            match &rule.scope {
                ScopeAst::Action { action: a } => {
                    if a != action {
                        return false;
                    }
                }
                _ => return false,
            }
        }
    }

    // Match When
    if let Some(ref when_filter) = filter.when {
        if let Some(ref subject_filter) = when_filter.subject {
            match &rule.when {
                crate::ast::ConditionAst::Atomic(atom) => {
                    let subject = &atom.subject;

                    if let Some(ref domain) = subject_filter.domain {
                        if &subject.domain != domain {
                            return false;
                        }
                    }

                    if let Some(ref field) = subject_filter.field {
                        if &subject.field != field {
                            return false;
                        }
                    }
                }

                crate::ast::ConditionAst::All { all } => {
                    let mut found = false;

                    for atom in all {
                        let subject = &atom.subject;

                        let domain_match = subject_filter
                            .domain
                            .as_ref()
                            .map_or(true, |d| &subject.domain == d);

                        let field_match = subject_filter
                            .field
                            .as_ref()
                            .map_or(true, |f| &subject.field == f);

                        if domain_match && field_match {
                            found = true;
                            break;
                        }
                    }

                    if !found {
                        return false;
                    }
                }

                crate::ast::ConditionAst::Any { any } => {
                    let mut found = false;

                    for atom in any {
                        let subject = &atom.subject;

                        let domain_match = subject_filter
                            .domain
                            .as_ref()
                            .map_or(true, |d| &subject.domain == d);

                        let field_match = subject_filter
                            .field
                            .as_ref()
                            .map_or(true, |f| &subject.field == f);

                        if domain_match && field_match {
                            found = true;
                            break;
                        }
                    }

                    if !found {
                        return false;
                    }
                }
            }
        }
    }

    true
}

/// Evaluates a governance constraint against selected policy rules.
fn evaluate_constraint(selected: &Vec<&crate::ast::RuleAst>, constraint: &Constraint) -> bool {
    match constraint {
        Constraint::Exists { exists } => {
            if *exists {
                !selected.is_empty()
            } else {
                selected.is_empty()
            }
        }

        Constraint::MinCount { min_count } => selected.len() >= *min_count,

        Constraint::MaxCount { max_count } => selected.len() <= *max_count,

        Constraint::AllowedFields { allowed_fields } => {
            for rule in selected {
                if !rule_uses_only_allowed_fields(rule, allowed_fields) {
                    return false;
                }
            }
            true
        }

        Constraint::Forbid { forbid } => {
            if *forbid {
                selected.is_empty()
            } else {
                true
            }
        }
    }
}

/// Ensures that a rule references only fields in the allowed set.
///
/// Allowed fields must be specified in "domain.field" format.
fn rule_uses_only_allowed_fields(
    rule: &crate::ast::RuleAst,
    allowed_fields: &Vec<String>,
) -> bool {

    let mut subjects = Vec::new();

    match &rule.when {
        crate::ast::ConditionAst::Atomic(atom) => {
            subjects.push(&atom.subject);
        }

        crate::ast::ConditionAst::All { all } => {
            for atom in all {
                subjects.push(&atom.subject);
            }
        }

        crate::ast::ConditionAst::Any { any } => {
            for atom in any {
                subjects.push(&atom.subject);
            }
        }
    }

    for subject in subjects {
        let field_key = format!("{}.{}", subject.domain, subject.field);

        if !allowed_fields.contains(&field_key) {
            return false;
        }
    }

    true
}