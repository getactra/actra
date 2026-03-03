//! Schema definition and validation layer.
//!
//! This module defines:
//! - The raw YAML-deserialized schema (`SchemaAst`)
//! - The validated, strongly-typed schema (`Schema`)
//!
//! The AST layer represents unvalidated user input.
//! The `Schema` layer is normalized and used by the compiler.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Root schema loaded from YAML.
///
/// This structure directly mirrors the YAML configuration and
/// is deserialized without additional validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaAst {
    /// Schema version for forward compatibility.
    pub version: u32,

    /// Declared action types and their field definitions.
    pub actions: HashMap<String, ActionSchemaAst>,

    /// Actor field definitions.
    pub actor: ActorSchemaAst,

    /// Snapshot field definitions.
    pub snapshot: SnapshotSchemaAst,
}

/// Action definition as provided in YAML.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionSchemaAst {
    pub fields: HashMap<String, FieldTypeAst>,
}

/// Actor schema definition as provided in YAML.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActorSchemaAst {
    pub fields: HashMap<String, FieldTypeAst>,
}

/// Snapshot schema definition as provided in YAML.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotSchemaAst {
    pub fields: HashMap<String, FieldTypeAst>,
}

/// Field type representation in YAML.
///
/// This enum is deserialized directly from schema configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldTypeAst {
    String,
    Number,
    Boolean,
}

/// Strongly-typed field type used internally by the engine.
///
/// This type is used after validation and normalization.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FieldType {
    String,
    Number,
    Boolean,
}

/// Validated schema used by the compiler.
///
/// This structure represents the normalized, type-safe schema
/// used during policy compilation and evaluation.
#[derive(Debug, Clone)]
pub struct Schema {
    /// Action definitions keyed by action name.
    pub actions: HashMap<String, ActionSchema>,

    /// Actor field definitions.
    pub actor_fields: HashMap<String, FieldType>,

    /// Snapshot field definitions.
    pub snapshot_fields: HashMap<String, FieldType>,
}

/// Validated action schema.
///
/// Unlike `ActionSchemaAst`, this contains strongly-typed field definitions.
#[derive(Debug, Clone)]
pub struct ActionSchema {
    pub fields: HashMap<String, FieldType>,
}

impl Schema {
    /// Converts a raw `SchemaAst` into a validated `Schema`.
    ///
    /// This performs normalization but assumes that the YAML
    /// structure has already been syntactically validated.
    ///
    /// Semantic validation (e.g., field references inside policies)
    /// is performed later during compilation.
    pub fn from_ast(ast: SchemaAst) -> Self {
        let actions = ast
            .actions
            .into_iter()
            .map(|(name, action_ast)| {
                let fields = action_ast
                    .fields
                    .into_iter()
                    .map(|(field_name, field_type_ast)| {
                        (field_name, field_type_ast.into())
                    })
                    .collect();

                (name, ActionSchema { fields })
            })
            .collect();

        let actor_fields = ast
            .actor
            .fields
            .into_iter()
            .map(|(k, v)| (k, v.into()))
            .collect();

        let snapshot_fields = ast
            .snapshot
            .fields
            .into_iter()
            .map(|(k, v)| (k, v.into()))
            .collect();

        Self {
            actions,
            actor_fields,
            snapshot_fields,
        }
    }
}

impl From<FieldTypeAst> for FieldType {
    fn from(ast: FieldTypeAst) -> Self {
        match ast {
            FieldTypeAst::String => FieldType::String,
            FieldTypeAst::Number => FieldType::Number,
            FieldTypeAst::Boolean => FieldType::Boolean,
        }
    }
}