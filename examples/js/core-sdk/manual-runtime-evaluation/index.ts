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
// 3. Compile policy
// ------------------------------------------------------------
console.log("manual-runtime-evaluation");
const policy = await Actra.fromStrings(schemaYaml, policyYaml);

// ------------------------------------------------------------
// 4. Create runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Context resolvers
// ------------------------------------------------------------
runtime.setActorResolver(() => ({ role: "support" }));
runtime.setSnapshotResolver(() => ({ fraud_flag: false }));

// ------------------------------------------------------------
// 6. Build an action manually
// ------------------------------------------------------------
// Typical sources:
// - HTTP requests
// - tool calls
// - message queues

const action = {
  type: "refund",
  amount: 200
};

// ------------------------------------------------------------
// 7. Evaluate the action
// ------------------------------------------------------------
const result = runtime.evaluate(action);

console.log("\nEvaluation result:");
console.log(result);

// ------------------------------------------------------------
// 8. Blocked example
// ------------------------------------------------------------
const blockedAction = {
  type: "refund",
  amount: 1500
};

const blockedResult = runtime.evaluate(blockedAction);

console.log("\nBlocked evaluation result:");
console.log(blockedResult);