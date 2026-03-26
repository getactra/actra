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
// 2. Policy (INVALID - 2 block rules)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: fraud_block
    scope:
      action: refund
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block

  - id: large_refund_block
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
// 3. Governance
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: limit_block_rules
      select:
        where:
          effect: block
      must:
        max_count: 1
      error: "Only one block rule allowed"
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

  console.log("Policy compiled successfully");

} catch (e: any) {
  console.log("Governance violation detected");
  console.log(e.message || e);
}