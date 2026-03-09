//! Python bindings for Actra.
//!
//! This module exposes a thin wrapper around the core engine.
//!
//! Responsibilities:
//! - Deserialize YAML inputs
//! - Compile policies
//! - Convert Python dictionaries into engine input
//! - Convert evaluation results into Python objects
//!
//! All semantic validation is performed by the Rust core.
//! This layer performs no business logic.

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyModule};
use pyo3::Bound;

use actra_core::ast::PolicyAst;
use actra_core::compiler::{compile_policy, compile_with_governance};
use actra_core::compiler_version;
use actra_core::engine::{evaluate, EvaluationInput};
use actra_core::governance::GovernanceAst;
use actra_core::ir::CompiledPolicy;
use actra_core::ir::Effect;
use actra_core::ir::ScalarValue;
use actra_core::schema::{Schema, SchemaAst};

/// Python-exposed Actra class.
///
/// This is a thin wrapper around `CompiledPolicy`.
/// Compilation occurs during initialization.
/// Evaluation is deterministic and stateless.
#[pyclass]
pub struct PyActra {
    compiled_policy: CompiledPolicy,
}

#[pymethods]
impl PyActra {
    /// Creates a new Actra instance.
    ///
    /// Arguments:
    /// - `schema_yaml`: YAML schema definition
    /// - `policy_yaml`: YAML policy definition
    /// - `governance_yaml`: Optional governance constraints
    ///
    /// Raises:
    /// - `ValueError` if parsing or compilation fails
    #[new]
    fn new(schema_yaml: &str, policy_yaml: &str, governance_yaml: Option<&str>) -> PyResult<Self> {
        let schema_ast: SchemaAst = serde_yaml::from_str(schema_yaml).map_err(to_py_err)?;
        let schema = Schema::from_ast(schema_ast);

        let policy_ast: PolicyAst = serde_yaml::from_str(policy_yaml).map_err(to_py_err)?;

        let compiled_policy = if let Some(gov_yaml) = governance_yaml {
            let governance_ast: GovernanceAst =
                serde_yaml::from_str(gov_yaml).map_err(to_py_err)?;
            compile_with_governance(&schema, policy_ast, &governance_ast).map_err(to_py_err)?
        } else {
            compile_policy(&schema, policy_ast).map_err(to_py_err)?
        };

        Ok(Self { compiled_policy })
    }

    /// Evaluates the compiled policy against runtime input.
    ///
    /// Expected input format:
    /// {
    ///     "action": { ... },
    ///     "actor": { ... },
    ///     "snapshot": { ... }
    /// }
    ///
    /// Missing keys are treated as empty maps.
    ///
    /// Returns:
    /// {
    ///     "effect": "allow" | "block" | "require_approval",
    ///     "matched_rule": Optional[str]
    /// }
    fn evaluate(&self, py: Python<'_>, input: Bound<'_, PyDict>) -> PyResult<PyObject> {
        let action = extract_map(input.get_item("action")?)?;
        let actor = extract_map(input.get_item("actor")?)?;
        let snapshot = extract_map(input.get_item("snapshot")?)?;

        let eval_input = EvaluationInput {
            action,
            actor,
            snapshot,
        };

        let result = evaluate(&self.compiled_policy, &eval_input);

        let output = PyDict::new_bound(py);
        output.set_item("effect", effect_to_str(&result.effect))?;
        output.set_item("matched_rule", result.matched_rule)?;

        Ok(output.into())
    }

    fn policy_hash(&self) -> PyResult<String> {
        Ok(self.compiled_policy.policy_hash())
    }

    #[staticmethod]
    pub fn compiler_version() -> &'static str {
        compiler_version()
    }
}

/// Python module entry point.
///
/// Must match the compiled library name to satisfy Python's
/// `PyInit_<module>` symbol requirements.
#[pymodule]
fn actra(_py: Python<'_>, m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<PyActra>()?;
    Ok(())
}

/// Converts Rust errors into Python `ValueError`.
///
/// Compilation and validation failures are surfaced as ValueError
/// to Python callers.
fn to_py_err<E: std::fmt::Display>(err: E) -> PyErr {
    pyo3::exceptions::PyValueError::new_err(err.to_string())
}

/// Converts a Python dictionary into a `HashMap<String, ScalarValue>`.
///
/// Supported value types:
/// - str : ScalarValue::String
/// - float/int : ScalarValue::Number
/// - bool : ScalarValue::Boolean
///
/// Unsupported types raise `TypeError`.
///
/// Missing dictionaries are treated as empty maps.
fn extract_map(
    obj: Option<Bound<'_, PyAny>>,
) -> PyResult<std::collections::HashMap<String, ScalarValue>> {
    use std::collections::HashMap;

    let mut map = HashMap::new();

    if let Some(any) = obj {
        // Ensure the object is a dictionary and clone it for safe iteration.
        let dict = any.downcast::<PyDict>()?.clone();

        for (key, value) in dict.iter() {
            let key_str: String = key.extract::<String>()?;

            let scalar = if let Ok(v) = value.extract::<String>() {
                ScalarValue::String(v)
            } else if let Ok(v) = value.extract::<f64>() {
                ScalarValue::Number(v)
            } else if let Ok(v) = value.extract::<bool>() {
                ScalarValue::Boolean(v)
            } else {
                return Err(pyo3::exceptions::PyTypeError::new_err(
                    "Unsupported value type",
                ));
            };

            map.insert(key_str, scalar);
        }
    }

    Ok(map)
}

/// Converts internal effect enum to Python string representation.
fn effect_to_str(effect: &Effect) -> &'static str {
    match effect {
        Effect::Allow => "allow",
        Effect::Block => "block",
        Effect::RequireApproval => "require_approval",
    }
}
