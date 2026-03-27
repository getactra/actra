import { Actra, ActraRuntime, ActraPolicyError } from "@getactra/actra";

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
`;

// ------------------------------------------------------------
// 2. Policy
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: support_limit
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
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Context class
// ------------------------------------------------------------
class RequestContext {
  constructor(public role: string) {}
}

// ------------------------------------------------------------
// 5. Actor resolver (uses ctx)
// ------------------------------------------------------------
runtime.setActorResolver((ctx: RequestContext) => ({
  role: ctx?.role
}));

// ------------------------------------------------------------
// 6. Function
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

// ------------------------------------------------------------
// 7. Protect function
// IMPORTANT: exclude ctx using fields
// ------------------------------------------------------------
const protectedRefund = runtime.admit(
  "refund",
  refund,
  {
    fields: ["amount"] //prevents ctx leakage
  }
);

// ------------------------------------------------------------
// 8. Calls
// ------------------------------------------------------------
const ctx = new RequestContext("support");

console.log("\n--- Allowed ---");
await protectedRefund.call(ctx, 200);

console.log("\n--- Blocked ---");

try {
  await protectedRefund.call(ctx, 2000);
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Blocked Rule:", e.matchedRule);
  } else {
    throw e;
  }
}