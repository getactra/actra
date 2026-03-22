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
use std::cell::RefCell;


use actra::ast::PolicyAst;
use actra::compiler::{compile_policy, compile_with_governance};
use actra::engine::{evaluate, EvaluationInput};
use actra::governance::GovernanceAst;
use actra::ir::{CompiledPolicy, Effect};
use actra::schema::{Schema, SchemaAst};
use actra::compiler_version as core_compiler_version;




fn safe_exec<T, F>(f: F) -> u64
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

//wasm is 32 bit
fn pack(ptr: *mut u8, len: usize) -> u64 {
    ((ptr as u64) << 32) | (len as u64)
}

fn to_buffer(s: String) -> u64 {
    let mut bytes = s.into_bytes();
    let len = bytes.len();

    let total = len + 8;

    let mut full = Vec::with_capacity(total);

    // store TOTAL length (not just string len)
    full.extend_from_slice(&(total as u64).to_le_bytes());
    full.append(&mut bytes);

    let base_ptr = full.as_mut_ptr();

    std::mem::forget(full);

    // return pointer AFTER header
    let data_ptr = unsafe { base_ptr.add(8) };

    pack(data_ptr, len)
}

fn read_buffer(buf: u64, name: &str) -> Result<&str, String> {
    if buf == 0 {
        return Err(format!("{} buffer is null", name));
    }

    let ptr = (buf >> 32) as *const u8;
    let len = (buf & 0xffffffff) as usize;

    if len == 0 {
        return Err(format!("{} empty buffer", name));
    }

    if ptr.is_null() {
        return Err(format!("{} null pointer", name));
    }

    unsafe {
        std::str::from_utf8(std::slice::from_raw_parts(ptr, len))
            .map_err(|_| format!("Invalid {}", name))
    }
}

/*function readWasmBuffer(wasm, memory, val) {
  const ptr = Number(val >> 32n);
  const len = Number(val & 0xffffffffn);

  const bytes = new Uint8Array(memory.buffer, ptr, len);
  const str = new TextDecoder().decode(bytes);

  wasm.actra_buffer_free(ptr);

  return str;
}
*/
#[no_mangle]
pub extern "C" fn actra_buffer_free(ptr: *mut u8) {
    if ptr.is_null() {
        return;
    }

    unsafe {
        let base = ptr.sub(8);

        // optional: basic sanity check (cheap guard)
        let total_len = *(base as *const u64) as usize;

        if total_len < 8 {
            return; // corrupted
        }

        let _ = Vec::from_raw_parts(base, 0, total_len);
    }
}

struct ActraInstance {
    compiled_policy: Arc<CompiledPolicy>,
}

//Allows freeing slots without shifting indices
//Prevents ID corruption
//Keeps instance IDs stable
// TODO: Replace Vec<Option<...>> with Slab for O(1) allocation and cleaner semantics
static INSTANCES: OnceLock<Mutex<Vec<Option<ActraInstance>>>> = OnceLock::new();

fn get_instances() -> &'static Mutex<Vec<Option<ActraInstance>>> {
    INSTANCES.get_or_init(|| Mutex::new(Vec::new()))
}

#[no_mangle]
pub extern "C" fn actra_create(
    schema_buf: u64,
    policy_buf: u64,
    gov_buf: u64,
) -> u64 {
    safe_exec(|| {

        let schema_yaml = read_buffer(schema_buf, "schema")?;
        let policy_yaml = read_buffer(policy_buf, "policy")?;
        
        let governance_yaml = if gov_buf != 0 {
            Some(read_buffer(gov_buf, "governance")?)
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
    input_buf: u64,
) -> u64 {
safe_exec(|| {

    if instance_id < 0 {
        return Err("invalid instance_id".to_string());
    }

    let input_str = read_buffer(input_buf, "input")?;

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
pub extern "C" fn actra_buffer_from_js(
    ptr: *const u8,
    len: usize,
) -> u64 {
    if ptr.is_null() || len == 0 {
        return 0;
    }

    unsafe {
        let input = std::slice::from_raw_parts(ptr, len);

        let total = len + 8;
        let mut full = Vec::with_capacity(total);

        full.extend_from_slice(&(total as u64).to_le_bytes());
        full.extend_from_slice(input);

        let base_ptr = full.as_mut_ptr();
        std::mem::forget(full);

        let data_ptr = base_ptr.add(8);

        pack(data_ptr, len)
    }
}

thread_local! {
    static WRITE_BUF: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}
//Reuse buffer using static scratch space : O(1) memory growth
#[no_mangle]
pub extern "C" fn actra_write_buffer(len: usize) -> *mut u8 {
    if len == 0 {
        return std::ptr::null_mut();
    }

    WRITE_BUF.with(|buf| {
        let mut buf = buf.borrow_mut();

        let cap = buf.capacity();
        if cap < len {
            buf.reserve_exact(len - cap);
        }

        unsafe {
            buf.set_len(len);
        }

        buf.as_mut_ptr()
    })
}



#[no_mangle]
pub extern "C" fn actra_policy_hash(instance_id: i32) -> u64 {
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
pub extern "C" fn actra_compiler_version() -> u64 {
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
fn ok<T: Serialize>(data: T) -> u64 {
    let res = WasmResponse::Ok { data };
    to_buffer(serde_json::to_string(&res).unwrap())
}

//JSON Return helper
fn err(msg: String) -> u64 {
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