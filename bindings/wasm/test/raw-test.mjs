import { loadActraWasm } from "./loader.mjs";

const wasmUrl = new URL("./actra_wasm.wasm", import.meta.url);

const { exports: wasm, memory } =
  await loadActraWasm(wasmUrl);

//helpers

function formatResult(obj) {
  const matchedRule =
    obj.matched_rule === "" || obj.matched_rule == null
      ? null
      : obj.matched_rule;

  return {
    effect: obj.effect,
    matched_rule: matchedRule
  };
}

function allocString(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const ptr = wasm.actra_alloc(bytes.length);

  const mem = new Uint8Array(memory.buffer, ptr, bytes.length);
  mem.set(bytes);

  return { ptr, len: bytes.length };
}

function readBuffer(val) {
  const v = BigInt(val);

  //len first
  const ptr = Number(v >> 32n);

  if(ptr < 0){
      throw new Error("Invalid WASM pointer");
  }
    
  const lenView = new DataView(memory.buffer, ptr, 8);
  const len = Number(lenView.getBigUint64(0, true));

  //check valid len
  if (len <= 0 || len > memory.buffer.byteLength) {
    throw new Error("Invalid WASM length");
  }

  const bytes = new Uint8Array(memory.buffer, ptr + 8, len);
  const str = new TextDecoder().decode(bytes);

  wasm.actra_string_free(ptr, len + 8);

  return str;
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

// create
const s = allocString(schema);
const p = allocString(policy);

const createBuf = wasm.actra_create(
  s.ptr, s.len,
  p.ptr, p.len,
  0, 0
);

//check
if (!createBuf) {
  throw new Error("actra_create returned null/0");
}

//DALLOAC !! IMPORTANT
wasm.actra_dealloc(s.ptr, s.len);
wasm.actra_dealloc(p.ptr, p.len);

console.log("RAW RETURN:", BigInt(createBuf).toString());

const createOut = readBuffer(createBuf);
const createParsed = JSON.parse(createOut);

console.log("CREATE:", createParsed);

if (createParsed.ok !== "true") {
  throw new Error(createParsed.error);
}

const instanceId = parseInt(createParsed.data, 10);

// eval
const input = {
  action: { type: "refund", amount: 1500 },
  actor: { role: "support" },
  snapshot: {}
};

const inputStr = JSON.stringify(input);
const i = allocString(inputStr);

const evalBuf = wasm.actra_evaluate(
  instanceId,
  i.ptr,
  i.len
);

if (!evalBuf) {
  throw new Error("actra_evaluate returned null/0");
}

wasm.actra_dealloc(i.ptr, i.len);

const evalOut = readBuffer(evalBuf);
const evalParsed = JSON.parse(evalOut);

console.log("EVAL:", formatResult(evalParsed.data));

// EXPECT BLOCK
if (evalParsed.data.effect !== "block") {
  // CLEANUP
  wasm.actra_free(instanceId);
  throw new Error("Expected block");
}

// CLEANUP
wasm.actra_free(instanceId);

console.log("Test passed");