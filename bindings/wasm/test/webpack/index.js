import { loadActraWasm } from "./loader.js";

// UI helpers

function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
}

function setOutput(msg) {
  document.getElementById("output").textContent = msg;
}

// Normalize result
function formatResult(obj) {
  return {
    effect: obj.effect,
    matched_rule:
      obj.matched_rule === "" || obj.matched_rule == null
        ? null
        : obj.matched_rule
  };
}

// WASM helpers

function allocString(wasm, memory, str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const ptr = wasm.actra_alloc(bytes.length);

  const mem = new Uint8Array(memory.buffer, ptr, bytes.length);
  mem.set(bytes);

  return { ptr, len: bytes.length };
}

function readBuffer(wasm, memory, val) {
  const v = BigInt(val);

  const ptr = Number(v >> 32n);

  if (ptr <= 0) {
    throw new Error("Invalid WASM pointer");
  }

  // Read length prefix (8 bytes)
  const lenView = new DataView(memory.buffer, ptr, 8);
  const len = Number(lenView.getBigUint64(0, true));

  if (len <= 0 || len > memory.buffer.byteLength) {
    throw new Error("Invalid WASM length");
  }

  const bytes = new Uint8Array(memory.buffer, ptr + 8, len);
  const str = new TextDecoder().decode(bytes);

  // Free (len + 8 prefix)
  wasm.actra_string_free(ptr, len + 8);

  return str;
}

// MAIN TEST

async function run() {
  try {
    setOutput("Loading WASM...");

    const wasmUrl = new URL("./actra_wasm.wasm", import.meta.url);

    const { exports: wasm, memory } =
      await loadActraWasm(wasmUrl);

    log("WASM loaded");

    //Schema & Policy

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
`;

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
`;

    // CREATE

    const s = allocString(wasm, memory, schema);
    const p = allocString(wasm, memory, policy);

    const createBuf = wasm.actra_create(
      s.ptr, s.len,
      p.ptr, p.len,
      0, 0
    );

    // Free input buffers immediately
    wasm.actra_dealloc(s.ptr, s.len);
    wasm.actra_dealloc(p.ptr, p.len);

    if (!createBuf) {
      throw new Error("actra_create returned null/0");
    }

    const createOut = readBuffer(wasm, memory, createBuf);
    const createParsed = JSON.parse(createOut);

    log("CREATE RAW: " + createOut);

    if (createParsed.ok !== "true") {
      throw new Error(createParsed.error);
    }

    const instanceId = parseInt(createParsed.data, 10);

    log("Instance ID: " + instanceId);

    // EVALUATE

    const input = {
      action: { type: "refund", amount: 1500 },
      actor: { role: "support" },
      snapshot: {}
    };

    const inputStr = JSON.stringify(input);
    const i = allocString(wasm, memory, inputStr);

    const evalBuf = wasm.actra_evaluate(
      instanceId,
      i.ptr,
      i.len
    );

    wasm.actra_dealloc(i.ptr, i.len);

    if (!evalBuf) {
      throw new Error("actra_evaluate returned null/0");
    }

    const evalOut = readBuffer(wasm, memory, evalBuf);
    const evalParsed = JSON.parse(evalOut);

    log("EVAL RAW: " + evalOut);

    if (evalParsed.ok !== "true") {
      throw new Error(evalParsed.error);
    }

    const result = formatResult(evalParsed.data);

    log("EVAL FORMATTED: " + JSON.stringify(result, null, 2));

    // ASSERT

    if (result.effect !== "block") {
      throw new Error("Expected block");
    }

    // CLEANUP

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