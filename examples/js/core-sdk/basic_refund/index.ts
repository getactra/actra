import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema definition
// ------------------------------------------------------------
const schemaYaml = `
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

// ------------------------------------------------------------
// 2. Policy definition
// ------------------------------------------------------------
const policyYaml = `
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

// ------------------------------------------------------------
// 3. Compile policy
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);

// ------------------------------------------------------------
// 4. Create runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Register context resolvers
// ------------------------------------------------------------
runtime.setActorResolver(() => ({ role: "support" }));
runtime.setSnapshotResolver(() => ({ fraud_flag: false }));

// ------------------------------------------------------------
// 6. Protect a function with Actra
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

const protectedRefund = runtime.admit(
  "refund",
  refund,
  (args) => ({ amount: args[0] })
);

// ------------------------------------------------------------
// 7.  Assertion helper
// ------------------------------------------------------------
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error("ERROR: " + message);
  }
}

// ------------------------------------------------------------
// 8. Execute
// ------------------------------------------------------------
async function run() {
  console.log("\n--- Allowed call ---");
  await protectedRefund(200);

  console.log("\n--- Blocked call ---");

  let blocked = false;

  try {
    await protectedRefund(1500);
  } catch (e) {
    if (e instanceof ActraPolicyError) {
      blocked = true;
      console.log("Refund blocked by policy");
      console.log("Rule:", e.matchedRule);
    } else {
      throw e; // unexpected error fail fast
    }
  }

  // validation
  assert(blocked, "Expected refund > 1000 to be blocked");

  console.log("\nExample passed");
}

// top-level await safe runner
run().catch((err) => {
  console.error("\nExample failed");
  console.error(err);
  process.exit(1);
});


//Simple (fields mapping — recommended default)
/*function refund(amount: number, currency: string) {}

runtime.admit("refund", refund, {
  fields: ["amount", "currency"]
})*/


//Advanced - builder override
/*runtime.admit("refund", refund, {
  builder: (type, kwargs, ctx) => ({
    amount: kwargs.amount
  })
})*/


//Object-style
/*function refund(input: { amount: number; currency: string }) {}

runtime.admit("refund", refund)

refund({ amount: 200, currency: "USD" })*/