import { loadActraWasm } from "./loader.js";

// ======================
// UI helpers
// ======================

function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
}

function setOutput(msg) {
  document.getElementById("output").textContent = msg;
}

// ======================
// Result helpers
// ======================

function formatResult(obj) {
  if (!obj) {
    throw new Error("Invalid evaluation result");
  }

  return {
    effect: obj.effect,
    matched_rule:
      obj.matched_rule === "" || obj.matched_rule == null
        ? null
        : obj.matched_rule
  };
}

// ======================
// WASM helpers (NEW ABI)
// ======================

function toWasmBuffer(wasm, memory, str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const ptr = wasm.actra_write_buffer(bytes.length);

  const mem = new Uint8Array(memory.buffer);
  mem.set(bytes, ptr);

  return wasm.actra_buffer_from_js(ptr, bytes.length);
}

function readBuffer(wasm, memory, val) {
  const v = BigInt(val);

  const ptr = Number(v >> 32n);
  const len = Number(v & 0xffffffffn);

  if (!ptr || len <= 0) {
    throw new Error("Invalid WASM buffer");
  }

  const bytes = new Uint8Array(memory.buffer, ptr, len);
  const str = new TextDecoder().decode(bytes);

  wasm.actra_buffer_free(ptr);

  return str;
}

function parseResult(wasm, memory, buf) {
  const raw = readBuffer(wasm, memory, buf);
  const parsed = JSON.parse(raw);

  if (parsed.ok !== "true") {
    throw new Error(parsed.error || "Unknown WASM error");
  }

  return parsed.data;
}

// ======================
// MAIN TEST
// ======================

async function run() {
  try {
    setOutput("Loading WASM...");

    const wasmUrl = new URL("./actra_wasm.wasm", import.meta.url);

    const { exports: wasm, memory } =
      await loadActraWasm(wasmUrl);

    log("WASM loaded");

    // ======================
    // Schema & Policy
    // ======================

    const schema = `
version: 1
actions:
  refund:
    fields:
      amount: number
actor:
  fields:
    role: string
snapshot:
  fields:
    fraud_flag: boolean
`.trim();

    const policy = `
version: 1
rules:
  - id: block_large_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
`.trim();

    // ======================
    // CREATE
    // ======================

    const schemaBuf = toWasmBuffer(wasm, memory, schema);
    const policyBuf = toWasmBuffer(wasm, memory, policy);

    const createBuf = wasm.actra_create(
      schemaBuf,
      policyBuf,
      0n
    );

    if (!createBuf) {
      throw new Error("actra_create returned null/0");
    }

    const instanceId = Number(
      parseResult(wasm, memory, createBuf)
    );

    log("Instance ID: " + instanceId);

    // ======================
    // EVALUATE
    // ======================

    const input = {
      action: { type: "refund", amount: 1500 },
      actor: { role: "support" },
      snapshot: {}
    };

    const inputBuf = toWasmBuffer(
      wasm,
      memory,
      JSON.stringify(input)
    );

    const evalBuf = wasm.actra_evaluate(
      instanceId,
      inputBuf
    );

    if (!evalBuf) {
      throw new Error("actra_evaluate returned null/0");
    }

    const result = formatResult(
      parseResult(wasm, memory, evalBuf)
    );

    log("EVAL: " + JSON.stringify(result, null, 2));

    // ======================
    // ASSERT
    // ======================

    if (result.effect !== "block") {
      throw new Error("Expected block");
    }

    // ======================
    // CLEANUP
    // ======================

    wasm.actra_free(instanceId);

    setOutput("Test Passed");
  } catch (err) {
    console.error(err);
    log("ERROR: " + err.message);
    setOutput("Failed");
  }
}

// auto-run
run();

// optional button
document.getElementById("runBtn")?.addEventListener("click", run);