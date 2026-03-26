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

  chargeback:
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
  - id: allow_chargeback
    scope:
      action: chargeback
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 10
    effect: allow
`;

// ------------------------------------------------------------
// 3. Governance
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: refund_must_have_block
      applies_to:
        actions:
          - refund
      select:
        where:
          effect: block
      must:
        min_count: 1
      error: "Refund policies must include a block rule"
`;

// ------------------------------------------------------------
// 4. Compile
// ------------------------------------------------------------
console.log("\nCompiling policy with governance rules...\n");

try {
  const policy = await Actra.fromStrings(
    schemaYaml,
    policyYaml,
    governanceYaml
  );

  console.log("Policy compiled successfully", policy.policyHash());

} catch (e: any) {
  console.log("Governance violation detected");
  console.log(e.message || e);
}