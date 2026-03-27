import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

// ------------------------------------------------------------
// 1. Example application context
// ------------------------------------------------------------
class RequestContext {
  role: string;

  constructor(role: string) {
    this.role = role;
  }
}

// ------------------------------------------------------------
// 2. Schema
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
// 3. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: block_large_refund
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
// 4. Compile policy and create runtime
// ------------------------------------------------------------
const policy = await Actra.fromStrings(schemaYaml, policyYaml);
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Actor resolver (uses ctx)
// ------------------------------------------------------------
runtime.setActorResolver((ctx: RequestContext) => ({
  role: ctx?.role
}));

// ------------------------------------------------------------
// 6. Snapshot resolver
// ------------------------------------------------------------
runtime.setSnapshotResolver(() => ({
  fraud_flag: false
}));

// ------------------------------------------------------------
// 7. Protected function
// ------------------------------------------------------------
// IMPORTANT:
// ctx is passed via `.call(ctx, ...)`
// and excluded via `fields: ["amount"]`

function refund(amount: number) {
  console.log(`Refund executed: ${amount}`);
}

const protectedRefund = runtime.admit(
  "refund",
  refund,
  {
    fields: ["amount"] // exclude ctx from action
  }
);

// ------------------------------------------------------------
// 8. Calls
// ------------------------------------------------------------
const supportCtx = new RequestContext("support");

console.log("\n--- Allowed call ---");

await protectedRefund.call(supportCtx, 200);

console.log("\n--- Blocked call ---");

try {
  await protectedRefund.call(supportCtx, 2000);
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Refund blocked by policy");
    console.log("Rule:", e.matchedRule);
  } else {
    throw e;
  }
}