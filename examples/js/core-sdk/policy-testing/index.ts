import { Actra } from "@getactra/actra";

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
const policy = await Actra.fromStrings(schemaYaml, policyYaml);

// ------------------------------------------------------------
// 4. Test contexts
// ------------------------------------------------------------
const allowContext = {
  action: { type: "refund", amount: 200 },
  actor: { role: "support" },
  snapshot: { fraud_flag: false }
};

const blockContext = {
  action: { type: "refund", amount: 2000 },
  actor: { role: "support" },
  snapshot: { fraud_flag: false }
};

// ------------------------------------------------------------
// 5. Assertions
// ------------------------------------------------------------
await policy.assertEffect(allowContext, "allow");
await policy.assertEffect(blockContext, "block");

console.log("Policy tests passed.");