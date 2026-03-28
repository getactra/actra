//! DSL Abstract Syntax Tree (AST) representation.
//!
//! This module defines the raw declarative policy structure as
//! deserialized directly from YAML.
//!
//! The AST layer:
//! - Represents unvalidated user input
//! - Preserves the DSL structure
//! - Is later transformed into a validated intermediate representation (IR)
//!
//! No semantic validation is performed at this stage.

use serde::{Deserialize, Serialize};

/// Root policy structure as defined in YAML.
///
/// This structure is deserialized directly from configuration input.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyAst {
    /// Policy version for forward compatibility.
    pub version: u32,

    /// Ordered list of rule definitions.
    ///
    /// Rule order may be preserved depending on compilation strategy.
    pub rules: Vec<RuleAst>,
}

/// Single rule definition.
///
/// A rule consists of:
/// - A unique identifier
/// - A scope definition
/// - A condition
/// - An effect
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleAst {
    /// Unique rule identifier.
    pub id: String,

    /// Scope restriction determining where the rule applies.
    pub scope: ScopeAst,

    /// Conditional logic block.
    pub when: ConditionAst,

    /// Effect applied if condition matches.
    pub effect: EffectAst,
}

/// Scope definition.
///
/// Untagged enum allows concise DSL syntax in YAML.
///
/// Examples:
/// ```yaml
/// scope:
///   action: delete_user
/// ```
///
/// ```yaml
/// scope:
///   global: true
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ScopeAst {
    /// Applies only to a specific action type.
    Action { action: String },

    /// Applies to rules scoped to a specific actor type.
    Actor { actor: String },

    /// Applies globally.
    ///
    /// `global: true` indicates rule applies without scoping.
    Global { global: bool },
}

/// Condition block.
///
/// Untagged enum enables flexible DSL structure:
/// - Single atomic condition
/// - Logical AND (`all`)
/// - Logical OR (`any`)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConditionAst {
    /// Single atomic condition.
    Atomic(AtomicConditionAst),

    /// All conditions must evaluate to true (logical AND).
    All { all: Vec<AtomicConditionAst> },

    /// At least one condition must evaluate to true (logical OR).
    Any { any: Vec<AtomicConditionAst> },
}

/// Atomic condition.
///
/// Represents a single comparison expression:
/// Current supported operator 
///     "equals" 
///     "not_equals"
///     "greater_than"
///     "less_than"
///     "in"
///     "not_in"
///
/// `<subject> <operator> <value>`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtomicConditionAst {
    /// Left-hand side subject reference.
    pub subject: SubjectAst,

    /// Operator (validated later by compiler).
    pub operator: String,

    /// Right-hand side value (literal or subject reference).
    pub value: ValueAst,
}

/// Subject reference.
///
/// Identifies a field within a domain (e.g., action, actor, snapshot).
///
/// Example:
/// ```yaml
/// subject:
///   domain: action
///   field: type
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectAst {
    /// Domain name (e.g., "action", "actor", "snapshot").
    pub domain: String,

    /// Field within the domain.
    pub field: String,
}

/// Value definition.
///
/// Allows either:
/// - Literal value
/// - Reference to another subject
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ValueAst {
    /// Literal constant.
    Literal { literal: LiteralValueAst },

    /// Subject reference (field-to-field comparison).
    Subject { subject: SubjectAst },
}

/// Literal values supported in DSL.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum LiteralValueAst {
    String(String),
    Number(f64),
    Boolean(bool),
}

/// Rule effect.
///
/// Determines the outcome when a rule condition evaluates to true.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EffectAst {
    Allow,
    Block,
    RequireApproval,
}