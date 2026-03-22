import { loadActraWasm } from "./loader.mjs";

const wasmUrl = new URL("./actra_wasm.wasm", import.meta.url);

const { exports: wasm, memory } =
  await loadActraWasm(wasmUrl);

// helpers

function toWasmBuffer(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const ptr = wasm.actra_write_buffer(bytes.length);

  const mem = new Uint8Array(memory.buffer);
  mem.set(bytes, ptr);

  return wasm.actra_buffer_from_js(ptr, bytes.length);
}

function readBuffer(val) {
  const ptr = Number(val >> 32n);
  const len = Number(val & 0xffffffffn);

  const bytes = new Uint8Array(memory.buffer, ptr, len);
  const str = new TextDecoder().decode(bytes);

  wasm.actra_buffer_free(ptr);

  return str;
}

function parseResult(buf) {
  const raw = readBuffer(buf);
  const parsed = JSON.parse(raw);

  if (parsed.ok !== "true") {
    throw new Error(parsed.error || "Unknown WASM error");
  }

  return parsed.data;
}

function formatResult(obj) {
  if (!obj) {
    throw new Error("Invalid evaluation result");
  }

  return {
    effect: obj.effect,
    matched_rule:
      obj.matched_rule === "" ? null : obj.matched_rule
  };
}

// test

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
`.trimStart();

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
`.trimStart();

// create

const schemaBuf = toWasmBuffer(schema);
const policyBuf = toWasmBuffer(policy);

const createBuf = wasm.actra_create(
  schemaBuf,
  policyBuf,
  0n
);

if (!createBuf) {
  throw new Error("actra_create returned null/0");
}

const instanceId = Number(parseResult(createBuf));

console.log("INSTANCE:", instanceId);

// eval

const input = {
  action: { type: "refund", amount: 1500 },
  actor: { role: "support" },
  snapshot: {}
};

const inputBuf = toWasmBuffer(JSON.stringify(input));

const evalBuf = wasm.actra_evaluate(
  instanceId,
  inputBuf
);

if (!evalBuf) {
  throw new Error("actra_evaluate returned null/0");
}

const evalResult = formatResult(parseResult(evalBuf));

console.log("EVAL:", evalResult);

// assert

if (evalResult.effect !== "block") {
  wasm.actra_free(instanceId);
  throw new Error("Expected block");
}

// cleanup

wasm.actra_free(instanceId);

console.log("Test passed");