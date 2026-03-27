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

// ------------------------------------------------------------
// 4. Runtime
// ------------------------------------------------------------
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 5. Decision observer
// ------------------------------------------------------------
runtime.setDecisionObserver((event) => {
  console.log(
    `Decision: ${event.decision.effect} rule=${event.decision.matched_rule}`
  );
});

// ------------------------------------------------------------
// 6. Function
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

// ------------------------------------------------------------
// 7. Audit mode (NO blocking)
// ------------------------------------------------------------
const auditedRefund = runtime.audit("refund", refund);

// ------------------------------------------------------------
// 8. Calls
// ------------------------------------------------------------
await auditedRefund(200);
await auditedRefund(2000);