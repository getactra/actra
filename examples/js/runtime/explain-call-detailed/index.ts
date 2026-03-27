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
// 2. Policy (FIXED)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: block_fraud_account
    scope:
      global: true
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block

  - id: block_large_refund_by_support
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 1000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "support"
    effect: block
`;

// ------------------------------------------------------------
// 3. Compile
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);

// ------------------------------------------------------------
// 4. Runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Context
// ------------------------------------------------------------
class RequestContext {
  constructor(public role: string) {}
}

// ------------------------------------------------------------
// 6. Resolvers
// ------------------------------------------------------------
runtime.setActorResolver((ctx: RequestContext) => ({
  role: ctx.role
}));

runtime.setSnapshotResolver(() => ({
  fraud_flag: false
}));

// ------------------------------------------------------------
// 7. Function
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

// ------------------------------------------------------------
// 8. Context instance
// ------------------------------------------------------------
const ctx = new RequestContext("support");

// ------------------------------------------------------------
// 9. Allowed execution
// ------------------------------------------------------------
console.log("\n--- Allowed ---");

const decision1 = runtime.explainCall(refund, {
  args: [500],
  actionName: "refund",
  ctx
});

console.log(decision1);

// ------------------------------------------------------------
// 10. Blocked (support limit)
// ------------------------------------------------------------
console.log("\n--- Blocked (support limit) ---");

const decision2 = runtime.explainCall(refund, {
  args: [2000],
  actionName: "refund",
  ctx
});

console.log(decision2);

// ------------------------------------------------------------
// 11. Fraud case (global rule)
// ------------------------------------------------------------
const fraudRuntime = new ActraRuntime(policy);

fraudRuntime.setActorResolver((ctx: RequestContext) => ({
  role: ctx.role
}));

fraudRuntime.setSnapshotResolver(() => ({
  fraud_flag: true
}));

console.log("\n--- Blocked (fraud account) ---");

const decision3 = fraudRuntime.explainCall(refund, {
  args: [50],
  actionName: "refund",
  ctx
});

console.log(decision3);