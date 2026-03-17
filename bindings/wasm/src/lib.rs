//! WebAssembly bindings for Actra.
//!
//! This module exposes the Actra policy engine to JavaScript environments
//! using `wasm-bindgen`. The binding layer performs minimal work and
//! delegates all semantic processing to the Rust core.
//!
//! Responsibilities:
//! - Deserialize YAML schema and policy definitions
//! - Compile policies into IR
//! - Convert JavaScript objects into engine input
//! - Convert evaluation results back into JavaScript objects
//!
//! All validation and evaluation logic resides in `actra-core`.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};

use actra::ast::PolicyAst;
use actra::compiler::{compile_policy, compile_with_governance};
use actra::engine::{evaluate, EvaluationInput};
use actra::governance::GovernanceAst;
use actra::ir::{CompiledPolicy, Effect};
use actra::schema::{Schema, SchemaAst};
use actra::compiler_version as core_compiler_version;

/// JavaScript-facing evaluation input structure.
#[derive(Deserialize)]
pub struct JsEvaluationInput {
    pub action: std::collections::HashMap<String, actra::ir::ScalarValue>,
    pub actor: std::collections::HashMap<String, actra::ir::ScalarValue>,
    pub snapshot: std::collections::HashMap<String, actra::ir::ScalarValue>,
}

/// JavaScript-facing evaluation output.
#[derive(Serialize)]
pub struct JsEvaluationOutput {
    pub effect: String,
    pub matched_rule: String,
}

/// JavaScript-exposed Actra class.
///
/// The compiled policy is stored internally.  
/// Evaluation operations are pure and deterministic.
#[wasm_bindgen (js_name = Actra)]
pub struct Actra {
    compiled_policy: CompiledPolicy,
}

#[wasm_bindgen]
impl Actra {
    /// Creates a new Actra engine instance.
    ///
    /// Compilation happens immediately during construction.
    ///
    /// Parameters
    /// ----------
    /// schema_yaml:
    ///     YAML schema definition describing data structure.
    ///
    /// policy_yaml:
    ///     YAML policy rules.
    ///
    /// governance_yaml:
    ///     Optional governance constraints.
    ///
    /// Returns
    /// -------
    /// Actra instance with compiled policy.
    ///
    /// Throws
    /// ------
    /// JavaScript Error if parsing or compilation fails.
    #[wasm_bindgen(constructor)]
    pub fn new(
        schema_yaml: String,
        policy_yaml: String,
        governance_yaml: Option<String>,
    ) -> Result<Actra, JsValue> {

        let schema_ast: SchemaAst =
            serde_yaml::from_str(&schema_yaml).map_err(to_js_err)?;

        let schema = Schema::from_ast(schema_ast);

        let policy_ast: PolicyAst =
            serde_yaml::from_str(&policy_yaml).map_err(to_js_err)?;

        let compiled_policy = if let Some(gov_yaml) = governance_yaml {

            let governance_ast: GovernanceAst =
                serde_yaml::from_str(&gov_yaml).map_err(to_js_err)?;

            compile_with_governance(
                &schema,
                policy_ast,
                &governance_ast,
            ).map_err(to_js_err)?

        } else {

            compile_policy(
                &schema,
                policy_ast,
            ).map_err(to_js_err)?
        };

        Ok(Self { compiled_policy })
    }

    /// Evaluates the compiled policy against runtime input.
    ///
    /// Expected input format:
    ///
    /// ```
    /// {
    ///   action: { ... },
    ///   actor: { ... },
    ///   snapshot: { ... }
    /// }
    /// ```
    ///
    /// Returns:
    ///
    /// ```
    /// {
    ///   effect: "allow" | "block" | "require_approval",
    ///   matched_rule: string
    /// }
    /// ```
    #[wasm_bindgen]
    pub fn evaluate(&self, input: JsValue) -> Result<JsValue, JsValue> {

    let js_input: JsEvaluationInput =
        from_value(input).map_err(|e| JsValue::from_str(&format!(
            "Invalid evaluation input: {}",
            e
        )))?;

        let eval_input = EvaluationInput {
            action: js_input.action,
            actor: js_input.actor,
            snapshot: js_input.snapshot,
        };

        let result = evaluate(
            &self.compiled_policy,
            &eval_input,
        );

        let output = JsEvaluationOutput {
            effect: effect_to_str(&result.effect).to_string(),
            matched_rule: result.matched_rule.unwrap_or_default(),
        };

        to_value(&output).map_err(|e| e.into())
    }

    /// Returns the deterministic policy hash.
    ///
    /// Useful for:
    /// - caching
    /// - auditing
    /// - reproducibility
    #[wasm_bindgen]
    pub fn policy_hash(&self) -> String {
        self.compiled_policy.policy_hash()
    }

    /// Returns the compiler version of the Actra core.
    ///
    /// This can be used to verify compatibility between
    /// compiled policies and runtime engines.
    #[wasm_bindgen]
    pub fn compiler_version() -> String {
        core_compiler_version().to_string()
    }
}

/// Converts Rust errors into JavaScript errors.
fn to_js_err<E: std::fmt::Display>(err: E) -> JsValue {
    JsValue::from_str(&err.to_string())
}

/// Converts internal effect enum to string representation.
fn effect_to_str(effect: &Effect) -> &'static str {
    match effect {
        Effect::Allow => "allow",
        Effect::Block => "block",
        Effect::RequireApproval => "require_approval",
    }
}