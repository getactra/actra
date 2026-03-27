import { Actra, ActraRuntime } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Schema
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
// 2. Policy
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
// Assertion helper
// ------------------------------------------------------------
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error("ERROR: " + message);
  }
}

// ------------------------------------------------------------
// Main execution
// ------------------------------------------------------------
async function run() {

  // ------------------------------------------------------------
  // 3. Compile policy
  // ------------------------------------------------------------
  const policy = await Actra.fromStrings(schemaYaml, policyYaml);
  const runtime = new ActraRuntime(policy);

  // ------------------------------------------------------------
  // 4. Register resolvers
  // ------------------------------------------------------------
  runtime.setActorResolver(() => ({ role: "support" }));
  runtime.setSnapshotResolver(() => ({ fraud_flag: false }));

  // ------------------------------------------------------------
  // 5. Example external input
  // ------------------------------------------------------------
  const requestData = {
    amount: 200
  };

  // ------------------------------------------------------------
  // 6. Build action
  // ------------------------------------------------------------
  const action = runtime.buildAction(
    "refund",
    requestData
  );

  // ------------------------------------------------------------
  // 7. Evaluate decision
  // ------------------------------------------------------------
  const decision = runtime.evaluate(action);

  console.log("Decision:", decision);

  // ------------------------------------------------------------
  // 8. Minimal validation
  // ------------------------------------------------------------
  assert(decision !== undefined, "Expected decision to be returned");

  console.log("\nExample passed");
}

// runner
run().catch((err) => {
  console.error("\nExample failed");
  console.error(err);
  process.exit(1);
});