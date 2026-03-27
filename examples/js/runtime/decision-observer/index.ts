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
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Actor resolver
// ------------------------------------------------------------
runtime.setActorResolver(() => ({ role: "support" }));

// ------------------------------------------------------------
// 5. Decision observer
// ------------------------------------------------------------
runtime.setDecisionObserver((event) => {
  console.log(
    `[Actra] action=${event.action.type} ` +
    `effect=${event.decision.effect} ` +
    `rule=${event.decision.matched_rule} ` +
    `timestamp=${event.timestamp} ` +
    `time=${event.durationMs}ms`
  );
});

// ------------------------------------------------------------
// 6. Function
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

// ------------------------------------------------------------
// 7. Protected function
// ------------------------------------------------------------
const protectedRefund = runtime.admit("refund", refund);

// ------------------------------------------------------------
// 8. Calls
// ------------------------------------------------------------
await protectedRefund(200);

try {
  await protectedRefund(2000);
} catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log("Blocked Rule:", e.matchedRule);
  } else {
    throw e;
  }
}