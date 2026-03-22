import { ActraWasm } from "../src/actra-wasm";

console.log("TEST STARTED");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION");
  console.dir(err, { depth: null });
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION");
  console.dir(err, { depth: null });
});

const wasmUrl = new URL("../src/actra_wasm.wasm", import.meta.url);

// test runner

async function run(): Promise<void> {

  console.log("Loading WASM...");

  let actra;

  try {
    actra = await ActraWasm.load(wasmUrl);
  } catch (e) {
    console.error("load failed:");
    console.dir(e, { depth: null });
    throw e;
  }

  console.log("loaded");

  // schema & policy

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

  // create

  const instanceId: number = actra.create(schema, policy);

  if (typeof instanceId !== "number") {
    throw new Error("Invalid instanceId");
  }

  console.log("Instance:", instanceId);

  // eval

  const input = {
    action: { type: "refund", amount: 1500 },
    actor: { role: "support" },
    snapshot: {}
  };

  const result = actra.evaluate(instanceId, input);

  console.log("Result:", result);

  if (result.effect !== "block") {
    throw new Error("Expected block");
  }

  // policy hash

  const hash: string = actra.policyHash(instanceId);

  if (!hash || typeof hash !== "string") {
    throw new Error("Invalid policy hash");
  }

  console.log("Policy Hash:", hash);

  // compiler version

  const version: string = actra.compilerVersion();

  if (!version || typeof version !== "string") {
    throw new Error("Invalid compiler version");
  }

  console.log("Compiler:", version);

  // stress test

  console.log("Running mini stress...");

  for (let i = 0; i < 10_000; i++) {
    const r = actra.evaluate(instanceId, input);

    if (r.effect !== "block") {
      throw new Error("Unexpected result during stress");
    }
  }

  console.log("Stress passed");

  // instance churn test

  console.log("Running churn test...");

  for (let i = 0; i < 1000; i++) {
    const id = actra.create(schema, policy);
    actra.free(id);
  }

  console.log("Churn passed");

  // cleanup

  actra.free(instanceId);

  console.log("Freed instance");

  // memory check

  const mem = (actra as any)["memory"] as WebAssembly.Memory;
  console.log(
    "Memory (approx):",
    Math.round(mem.buffer.byteLength / 1024),
    "KB"
  );

  console.log("\nall test passwed");
}

// run

run().catch((err: unknown) => {
  console.error("TEST FAILED");

  console.error("TYPE:", typeof err);
  console.error("RAW:", err);

  if (err instanceof Error) {
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);
  } else {
    console.error("NON-ERROR THROWN");
    console.dir(err, { depth: null });
  }

  process.exit(1);
});