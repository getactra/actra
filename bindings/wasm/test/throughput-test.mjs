import { loadActraWasm } from "./loader.mjs";

const wasmUrl = new URL("./actra_wasm.wasm", import.meta.url);

const { exports: wasm, memory } =
  await loadActraWasm(wasmUrl);

// helpers

function toWasmBuffer(str) {
  const bytes = new TextEncoder().encode(str);

  const ptr = wasm.actra_write_buffer(bytes.length);
  new Uint8Array(memory.buffer).set(bytes, ptr);

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
  const parsed = JSON.parse(readBuffer(buf));

  if (parsed.ok !== "true") {
    throw new Error(parsed.error);
  }

  return parsed.data;
}

// test setup

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

// create instance

const schemaBuf = toWasmBuffer(schema);
const policyBuf = toWasmBuffer(policy);

const instanceId = Number(
  parseResult(wasm.actra_create(schemaBuf, policyBuf, 0n))
);

console.log("Instance:", instanceId);

// input

const inputStr = JSON.stringify({
  action: { type: "refund", amount: 1500 },
  actor: { role: "support" },
  snapshot: {}
});

// reuse buffer to avoid JS overhead
const inputBuf = toWasmBuffer(inputStr);

// benchmark

const ITERATIONS = 2000_000;

console.log(`Running ${ITERATIONS} evaluations...`);

const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
  const res = wasm.actra_evaluate(instanceId, inputBuf);

  if (!res) throw new Error("null result");

  const out = parseResult(res);

  if (out.effect !== "block") {
    throw new Error("unexpected result");
  }
}

const end = performance.now();

// results


const totalMs = end - start;
const perOp = totalMs / ITERATIONS;
const throughput = (ITERATIONS / totalMs) * 1000;

console.log("\n=== RESULTS ===");
console.log("Total time:", totalMs.toFixed(2), "ms");
console.log("Per eval:", perOp.toFixed(4), "ms");
console.log("Throughput:", Math.round(throughput), "ops/sec");

// memory check

console.log("\nMemory (approx):", memory.buffer.byteLength / 1024, "KB");

// cleanup

wasm.actra_free(instanceId);

console.log("\nDone");