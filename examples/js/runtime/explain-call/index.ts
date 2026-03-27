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
const runtime = new ActraRuntime(policy);

// ------------------------------------------------------------
// 4. Function (NOT executed)
// ------------------------------------------------------------
function refund(amount: number) {
  console.log("Refund executed:", amount);
}

// ------------------------------------------------------------
// 5. Explain call (no execution)
// ------------------------------------------------------------
const decision = runtime.explainCall(refund, {
  args: [1500],       // equivalent to amount=1500
  actionName: "refund"
});

// ------------------------------------------------------------
// 6. Output
// ------------------------------------------------------------
console.log("\nExplain result:");
console.log(decision);