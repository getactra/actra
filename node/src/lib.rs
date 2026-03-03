//! Node.js (N-API) bindings for ActionGate.
//!
//! This module exposes a thin wrapper around the core engine using `napi-rs`.
//!
//! Responsibilities:
//! - Deserialize YAML schema and policy definitions
//! - Compile policies into IR
//! - Convert JavaScript objects into engine input
//! - Convert evaluation results back into JavaScript objects
//!
//! All semantic validation is handled by the Rust core.
//! This layer contains no business logic.
//! 
use napi::bindgen_prelude::*;
use napi_derive::napi;

use actiongate_core::ast::PolicyAst;
use actiongate_core::compiler::{compile_policy, compile_with_governance};
use actiongate_core::engine::{evaluate, EvaluationInput};
use actiongate_core::governance::GovernanceAst;
use actiongate_core::ir::{Effect, ScalarValue};
use actiongate_core::schema::{Schema, SchemaAst};
use std::collections::HashMap;
use actiongate_core::ir::CompiledPolicy;
use actiongate_core::compiler_version as core_compiler_version;

/// JavaScript-exposed ActionGate class.
///
/// Compilation occurs during construction.
/// Evaluation is stateless and deterministic.
#[napi]
pub struct ActionGate {
    compiled_policy: CompiledPolicy,
}

#[napi]
impl ActionGate {
    /// Creates a new ActionGate instance.
    ///
    /// Parameters:
    /// - `schema_yaml`: YAML schema definition
    /// - `policy_yaml`: YAML policy definition
    /// - `governance_yaml`: Optional governance constraints
    ///
    /// Throws:
    /// - `Error` if parsing or compilation fails.
    #[napi(constructor)]
    pub fn new(
        schema_yaml: String,
        policy_yaml: String,
        governance_yaml: Option<String>,
    ) -> Result<Self> {
        let schema_ast: SchemaAst = serde_yaml::from_str(&schema_yaml).map_err(to_napi_err)?;
        let schema = Schema::from_ast(schema_ast);

        let policy_ast: PolicyAst = serde_yaml::from_str(&policy_yaml).map_err(to_napi_err)?;

        let compiled_policy = if let Some(gov_yaml) = governance_yaml {
            let governance_ast: GovernanceAst =
                serde_yaml::from_str(&gov_yaml).map_err(to_napi_err)?;
            compile_with_governance(&schema, policy_ast, &governance_ast).map_err(to_napi_err)?
        } else {
            compile_policy(&schema, policy_ast).map_err(to_napi_err)?
        };

        Ok(Self { compiled_policy })
    }

    /// Evaluates the compiled policy against runtime input.
    ///
    /// Expected input format:
    /// {
    ///   action: { ... },
    ///   actor: { ... },
    ///   snapshot: { ... }
    /// }
    ///
    /// Missing keys should be provided as empty objects.
    ///
    /// Returns:
    /// {
    ///   effect: "allow" | "block" | "require_approval",
    ///   matched_rule: string
    /// }
    #[napi]
    pub fn evaluate(&self, env: Env, input: Object) -> Result<Object<'_>> {
        let action: HashMap<String, ScalarValue> =
            extract_map(&input.get_named_property("action")?)?;
        let actor = extract_map(&input.get_named_property("actor")?)?;
        let snapshot = extract_map(&input.get_named_property("snapshot")?)?;

        let eval_input = EvaluationInput {
            action,
            actor,
            snapshot,
        };

        let result = evaluate(&self.compiled_policy, &eval_input);

        let mut output = Object::new(&env)?;

        output.set_named_property("effect", env.create_string(effect_to_str(&result.effect))?)?;

        output.set_named_property(
            "matched_rule",
            env.create_string(&result.matched_rule.unwrap_or_default())?,
        )?;

        Ok(output)
    }

    #[napi]
    pub fn policy_hash(&self) -> String {
        self.compiled_policy.policy_hash()
    }

    #[napi]
    pub fn compiler_version() -> String {
        core_compiler_version().to_string()
    }
}

/// Converts Rust errors into JavaScript `Error` objects.
fn to_napi_err<E: std::fmt::Display>(err: E) -> napi::Error {
    napi::Error::from_reason(err.to_string())
}

/// Converts a JavaScript object into a `HashMap<String, ScalarValue>`.
///
/// Supported JavaScript types:
/// - string : ScalarValue::String
/// - number : ScalarValue::Number
/// - boolean : ScalarValue::Boolean
///
/// Unsupported types throw a JavaScript Error.
///
/// Note:
/// This function performs runtime coercion using N-API helpers.
/// Invalid or uncoercible values will result in failure.
fn extract_map(obj: &Object) -> Result<HashMap<String, ScalarValue>> {
    let mut map = HashMap::new();

    let keys = obj.get_property_names()?;

    for i in 0..keys.get_array_length()? {
        let key: String = keys.get_element::<String>(i)?;
        let value = obj.get_named_property::<Unknown>(&key)?;

        let scalar = if let Ok(v) = value.coerce_to_string() {
            ScalarValue::String(v.into_utf8()?.into_owned()?)
        } else if let Ok(v) = value.coerce_to_number() {
            ScalarValue::Number(v.get_double()?)
        } else if let Ok(v) = value.coerce_to_bool() {
            ScalarValue::Boolean(v)
        } else {
            return Err(napi::Error::from_reason("Unsupported value type"));
        };

        map.insert(key, scalar);
    }

    Ok(map)
}

/// Converts internal effect enum to JavaScript string representation.
fn effect_to_str(effect: &Effect) -> &'static str {
    match effect {
        Effect::Allow => "allow",
        Effect::Block => "block",
        Effect::RequireApproval => "require_approval",
    }
}
