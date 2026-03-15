//! Compiled policy representation used by the evaluation engine.
//!
//! The IR (Intermediate Representation) is produced by the compiler
//! after full schema validation and semantic verification.
//!
//! Important invariants:
//! - Schema validation has already occurred.
//! - Field existence has already been verified.
//! - Operator validity has already been checked.
//! - Type compatibility has already been enforced.
//!
//! The evaluation engine assumes this structure is fully valid
//! and performs no structural validation at runtime.

use std::collections::HashMap;
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};

/// Fully compiled and validated policy.
///
/// Rules are partitioned by scope to enable efficient evaluation:
/// - `action_rules` are keyed by action name
/// - `actor_rules` are keyed by actor type
/// - `global_rules` apply unconditionally
///
/// This partitioning avoids scanning irrelevant rules at runtime.
#[derive(Debug, Clone)]
pub struct CompiledPolicy {
    pub action_rules: HashMap<String, Vec<CompiledRule>>,
    pub actor_rules: HashMap<String, Vec<CompiledRule>>,
    pub global_rules: Vec<CompiledRule>,
}

/// Single compiled rule.
///
/// Contains a pre-validated condition and effect.
#[derive(Debug, Clone)]
pub struct CompiledRule {
    /// Unique rule identifier.
    pub rule_id: String,

    /// Pre-compiled condition tree.
    pub condition: CompiledCondition,

    /// Effect to apply if condition evaluates to true.
    pub effect: Effect,
}

/// Condition ready for evaluation.
///
/// Logical structure is flattened during compilation:
/// - `All` represents logical AND
/// - `Any` represents logical OR
#[derive(Debug, Clone)]
pub enum CompiledCondition {
    Atomic(AtomicCondition),
    All(Vec<AtomicCondition>),
    Any(Vec<AtomicCondition>),
}

/// Atomic comparison condition.
///
/// Represents a fully-resolved comparison:
///
/// `<lhs> <operator> <rhs>`
#[derive(Debug, Clone)]
pub struct AtomicCondition {
    /// Left-hand side subject reference.
    pub lhs: SubjectRef,

    /// Validated operator.
    pub operator: Operator,

    /// Right-hand side value reference.
    pub rhs: ValueRef,
}

/// Reference to a field in a specific domain.
///
/// Domain resolution is performed during compilation.
#[derive(Debug, Clone)]
pub struct SubjectRef {
    pub domain: Domain,
    pub field: String,
}

/// Value used in condition.
///
/// Values are either:
/// - Literal constants
/// - Field references
#[derive(Debug, Clone)]
pub enum ValueRef {
    Literal(ScalarValue),
    Subject(SubjectRef),
}

/// Scalar values supported by the engine.
///
/// These correspond to validated schema field types.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ScalarValue {
    String(String),
    Number(f64),
    Boolean(bool),
}

/// Domain of a subject reference.
///
/// Determines where the engine retrieves field values from
/// during evaluation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Domain {
    Action,
    Actor,
    Snapshot,
}

/// Supported operators.
///
/// Only validated operators appear in the IR.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Operator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    In,
    NotIn,
}

/// Effect applied when rule condition evaluates to true.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Effect {
    Allow,
    Block,
    RequireApproval,
}

impl CompiledPolicy {
    /// Computes a deterministic hash of the compiled policy.
    ///
    /// The hash is derived from a canonical debug representation
    /// of the IR structure. This allows:
    ///
    /// - Policy version tracking
    /// - Integrity verification
    /// - Cache invalidation
    /// - Change detection
    ///
    /// NOTE:
    /// The stability of this hash depends on deterministic
    /// struct layout and rule ordering.
    pub fn policy_hash(&self) -> String {
        let canonical = format!("{:?}", self);
        let mut hasher = Sha256::new();
        hasher.update(canonical.as_bytes());
        let result = hasher.finalize();
        hex::encode(result)
    }
}