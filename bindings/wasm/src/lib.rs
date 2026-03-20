//! WebAssembly bindings for Actra using raw WASM ABI
//! This module exposes the Actra policy engine to JavaScript environments
//! The binding layer performs minimal work and
//! delegates all semantic processing to the Rust core.
//!
//! Responsibilities:
//! - Deserialize YAML schema and policy definitions
//! - Compile policies into IR
//! - Convert JavaScript objects into engine input
//! - Convert evaluation results back into JavaScript objects
//!
//! All validation and evaluation logic resides in `actra-core`.

use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::sync::Arc;
use std::panic::{catch_unwind, AssertUnwindSafe};

use actra::ast::PolicyAst;
use actra::compiler::{compile_policy, compile_with_governance};
use actra::engine::{evaluate, EvaluationInput};
use actra::governance::GovernanceAst;
use actra::ir::{CompiledPolicy, Effect};
use actra::schema::{Schema, SchemaAst};
use actra::compiler_version as core_compiler_version;




fn safe_exec<T, F>(f: F) -> WasmBuffer
where
    T: Serialize,
    F: FnOnce() -> Result<T, String>,
{
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(result) => match result {
            Ok(data) => ok(data),
            Err(err_msg) => err(err_msg),
        },
        Err(_) => err("internal panic occurred".to_string()),
    }
}

//Whenever done with JS instance
//wasm.actra_free(instanceId); 
#[no_mangle]
pub extern "C" fn actra_free(instance_id: i32) {
    let _ = catch_unwind(AssertUnwindSafe(|| {
        if instance_id < 0 {
            return;
        }

        let mut instances = get_instances().lock().unwrap();

        if let Some(slot) = instances.get_mut(instance_id as usize) {
            *slot = None;
        }
    }));
}

fn read_str(ptr: *const u8, len: usize, name: &str) -> Result<&str, String> {
    if len > 0 && ptr.is_null() {
        return Err(format!("{} null pointer", name));
    }

    if len == 0 {
        return Ok("");
    }

    unsafe {
        std::str::from_utf8(std::slice::from_raw_parts(ptr, len))
            .map_err(|_| format!("Invalid {}", name))
    }
}

#[repr(C)]
#[derive(Copy, Clone)]
pub struct WasmBuffer {
    pub ptr: *mut u8,
    pub len: usize,
}

fn to_buffer(s: String) -> WasmBuffer {
    let mut bytes = s.into_bytes();
    let buffer = WasmBuffer {
        ptr: bytes.as_mut_ptr(),
        len: bytes.len(),
    };
    std::mem::forget(bytes);
    buffer
}

//To free allocated strings via WasmBuffer
//Important contract at JS Layer
/*function readWasmString(wasm, memory, buffer) {
  const bytes = new Uint8Array(memory.buffer, buffer.ptr, buffer.len);
  const str = new TextDecoder().decode(bytes);

  //CRITICAL: free memory after reading
  wasm.actra_string_free(buffer.ptr, buffer.len);

  return str;
}
  
//Usage example 
const buffer = wasm.actra_create(
  schemaPtr, schemaLen,
  policyPtr, policyLen,
  govPtr, govLen
);

const result = readWasmString(wasm, memory, buffer);

//policy hash
const buffer = wasm.actra_policy_hash(instanceId);
const hash = readWasmString(wasm, memory, buffer);
*/
#[no_mangle]
pub extern "C" fn actra_string_free(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }

    unsafe {
        // Reconstruct and drop
        let _ = Vec::from_raw_parts(ptr, len, len);
    }
}

//Raw memory alloc
#[no_mangle]
pub extern "C" fn actra_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }

    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

//Raw memory dealloc
#[no_mangle]
pub extern "C" fn actra_dealloc(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }

    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}

struct ActraInstance {
    compiled_policy: Arc<CompiledPolicy>,
}

//Allows freeing slots without shifting indices
//Prevents ID corruption
//Keeps instance IDs stable
static INSTANCES: OnceLock<Mutex<Vec<Option<ActraInstance>>>> = OnceLock::new();

fn get_instances() -> &'static Mutex<Vec<Option<ActraInstance>>> {
    INSTANCES.get_or_init(|| Mutex::new(Vec::new()))
}

#[no_mangle]
pub extern "C" fn actra_create(
    schema_ptr: *const u8,
    schema_len: usize,
    policy_ptr: *const u8,
    policy_len: usize,
    gov_ptr: *const u8,
    gov_len: usize,
) -> WasmBuffer {
    safe_exec(|| {

        let schema_yaml = read_str(schema_ptr, schema_len, "schema")?;
        let policy_yaml = read_str(policy_ptr, policy_len, "policy")?;

        let governance_yaml = if gov_len > 0 {
            Some(read_str(gov_ptr, gov_len, "governance")?)
        } else {
            None
        };

        let compiled_policy = Actra::compile(
            schema_yaml,
            policy_yaml,
            governance_yaml,
        )?;

        let mut instances = get_instances().lock().unwrap();

        //Slot reuse
        let instance = ActraInstance {
            compiled_policy: Arc::new(compiled_policy),
        };

        if let Some((idx, slot)) = instances.iter_mut().enumerate().find(|(_, s)| s.is_none()) {
            *slot = Some(instance);
            Ok(idx.to_string())
        } else {
            instances.push(Some(instance));
            Ok((instances.len() - 1).to_string())
        }
        
    })
}

#[no_mangle]
pub extern "C" fn actra_evaluate(
    instance_id: i32,
    input_ptr: *const u8,
    input_len: usize,
) -> WasmBuffer {
safe_exec(|| {

    if instance_id < 0 {
        return Err("invalid instance_id".to_string());
    }

    let input_str = read_str(input_ptr, input_len, "input")?;

    let input: JsEvaluationInput = 
        serde_json::from_str(input_str).map_err(|e| e.to_string())?;

    let compiled_policy = {
        let instances = get_instances().lock().unwrap();

        match instances.get(instance_id as usize) {
            Some(Some(i)) => Arc::clone(&i.compiled_policy),
            _ => return Err("invalid instance_id".to_string()),
        }
    };

    let eval_input = EvaluationInput {
        action: input.action,
        actor: input.actor,
        snapshot: input.snapshot,
    };

    let result = evaluate(compiled_policy.as_ref(), &eval_input);

    Ok(JsEvaluationOutput {
        effect: effect_to_str(&result.effect).to_string(),
        matched_rule: result.matched_rule.unwrap_or_default(),
    })
})
}


#[no_mangle]
pub extern "C" fn actra_policy_hash(instance_id: i32) -> WasmBuffer {
    safe_exec(|| {
    if instance_id < 0 {
        return Err("invalid instance_id".to_string());
    }

    let compiled_policy = {
        let instances = get_instances().lock().unwrap();

        match instances.get(instance_id as usize) {
            Some(Some(i)) => Arc::clone(&i.compiled_policy),
            _ => return Err("invalid instance_id".to_string()),
        }
    };

    Ok(compiled_policy.policy_hash())
})
}

#[no_mangle]
pub extern "C" fn actra_compiler_version() -> WasmBuffer {
    safe_exec(|| {
        Ok(core_compiler_version().to_string())
    })
}

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

//JSON response
#[derive(Serialize)]
#[serde(tag = "ok")]
pub enum WasmResponse<T> {
    #[serde(rename = "true")]
    Ok { data: T },

    #[serde(rename = "false")]
    Err { error: String },
}

//JSON Return helper
fn ok<T: Serialize>(data: T) -> WasmBuffer {
    let res = WasmResponse::Ok { data };
    to_buffer(serde_json::to_string(&res).unwrap())
}

//JSON Return helper
fn err(msg: String) -> WasmBuffer {
    let res: WasmResponse<()> = WasmResponse::Err { error: msg };
    to_buffer(serde_json::to_string(&res).unwrap())
}

/// JavaScript-exposed Actra class.
///
/// The compiled policy is stored internally.  
/// Evaluation operations are pure and deterministic.
pub struct Actra {
    compiled_policy: CompiledPolicy,
}

impl Actra {

    pub fn compile(
        schema_yaml: &str,
        policy_yaml: &str,
        governance_yaml: Option<&str>,
    ) -> Result<CompiledPolicy, String> {

        if schema_yaml.trim().is_empty() {
            return Err("Schema cannot be empty".to_string());
        }

        if policy_yaml.trim().is_empty() {
            return Err("Policy cannot be empty".to_string());
        }

        if let Some(gov) = governance_yaml {
            if gov.trim().is_empty() {
                return Err("Governance cannot be empty".to_string());
            }
        }

        let schema_ast: SchemaAst =
            serde_yaml::from_str(schema_yaml).map_err(|e| e.to_string())?;

        let schema = Schema::from_ast(schema_ast);

        let policy_ast: PolicyAst =
            serde_yaml::from_str(policy_yaml).map_err(|e| e.to_string())?;

        let compiled_policy = if let Some(gov_yaml) = governance_yaml {

            let governance_ast: GovernanceAst =
                serde_yaml::from_str(gov_yaml).map_err(|e| e.to_string())?;

            compile_with_governance(
                &schema,
                policy_ast,
                &governance_ast,
            ).map_err(|e| e.to_string())?

        } else {

            compile_policy(
                &schema,
                policy_ast,
            ).map_err(|e| e.to_string())?
        };

        Ok(compiled_policy)
    }

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
    pub fn new(
        schema_yaml: &str,
        policy_yaml: &str,
        governance_yaml: Option<&str>,
    ) -> Result<Actra, String> {

        let compiled_policy = Self::compile(
            schema_yaml,
            policy_yaml,
            governance_yaml,
        )?;

        Ok(Self { compiled_policy })
    }

    /// Evaluates the compiled policy against runtime input.
    ///
    /// Expected input format:
    ///
    /// ```text
    /// {
    ///   action: { ... },
    ///   actor: { ... },
    ///   snapshot: { ... }
    /// }
    /// ```
    ///
    /// Returns:
    ///
    /// ```text
    /// {
    ///   effect: "allow" | "block" | "require_approval",
    ///   matched_rule: string
    /// }
    /// ```
    pub fn evaluate(&self, input: String) -> Result<JsEvaluationOutput, String> {

        let js_input: JsEvaluationInput =
            serde_json::from_str(input.as_str()).map_err(|e| e.to_string())?;

        let eval_input = EvaluationInput {
            action: js_input.action,
            actor: js_input.actor,
            snapshot: js_input.snapshot,
        };

        let result = evaluate(&self.compiled_policy, &eval_input);

        Ok(JsEvaluationOutput {
            effect: effect_to_str(&result.effect).to_string(),
            matched_rule: result.matched_rule.unwrap_or_default(),
        })
    }

    /// Returns the deterministic policy hash.
    ///
    /// Useful for:
    /// - caching
    /// - auditing
    /// - reproducibility
    pub fn policy_hash(&self) -> String {
        self.compiled_policy.policy_hash()
    }

    /// Returns the compiler version of the Actra core.
    ///
    /// This can be used to verify compatibility between
    /// compiled policies and runtime engines.
    pub fn compiler_version() -> String {
        core_compiler_version().to_string()
    }
}

/// Converts internal effect enum to string representation.
fn effect_to_str(effect: &Effect) -> &'static str {
    match effect {
        Effect::Allow => "allow",
        Effect::Block => "block",
        Effect::RequireApproval => "require_approval",
    }
}