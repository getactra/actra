//! Error types used across ActionGate.
//!
//! This module defines compile-time validation errors that can occur
//! while transforming declarative policy definitions into an executable
//! intermediate representation (IR).
//!
//! These errors are deterministic and represent invalid configuration,
//! schema mismatch, or governance violations — not runtime evaluation failures.

use thiserror::Error;
use crate::governance::GovernanceViolation;

/// Errors that can occur during policy compilation.
///
/// `CompileError` represents structural or semantic issues in:
/// - Schema definitions
/// - Policy declarations
/// - Governance overlays
///
/// These errors prevent a policy from being compiled into a valid IR.
#[derive(Debug, Error)]
pub enum CompileError {
    /// A referenced action is not declared in the schema.
    #[error("unknown action '{0}' in scope")]
    UnknownAction(String),

    /// A referenced actor is not declared in the schema.
    #[error("unknown actor '{0}' in scope")]
    UnknownActor(String),

    /// The declared scope configuration is structurally invalid.
    #[error("invalid scope configuration")]
    InvalidScope,

    /// A referenced domain (e.g., action/actor/snapshot) is not recognized.
    #[error("unknown domain '{0}'")]
    UnknownDomain(String),

    /// A referenced field does not exist within the given domain.
    #[error("unknown field '{field}' in domain '{domain}'")]
    UnknownField {
        domain: String,
        field: String,
    },

    /// The specified operator is not supported by the compiler.
    #[error("unknown operator '{0}'")]
    UnknownOperator(String),

    /// Logical conditions must contain at least two operands.
    #[error("invalid logical condition: must contain at least two conditions")]
    InvalidLogicalCondition,

    /// The effect value is not recognized or unsupported.
    #[error("invalid effect")]
    InvalidEffect,

    /// The left and right sides of an expression are type-incompatible.
    #[error("type mismatch: left is '{left}', right is '{right}'")]
    TypeMismatch {
        left: String,
        right: String,
    },

    /// The operator is not valid for the given field type.
    #[error("operator '{operator}' not supported for type '{field_type}'")]
    InvalidOperatorForType {
        operator: String,
        field_type: String,
    },

    /// One or more governance constraints were violated during compilation.
    ///
    /// Governance validation is executed after policy compilation
    /// and may reject policies that violate higher-order constraints.
    #[error("governance validation failed: {0:?}")]
    Governance(Vec<GovernanceViolation>),
}