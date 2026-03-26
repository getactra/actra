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
// 2. Policy (INVALID - contains global block)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: block_everything
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
`;

// ------------------------------------------------------------
// 3. Governance
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: forbid_global_blocks
      select:
        where:
          scope:
            global: true
          effect: block
      must:
        forbid: true
      error: "Global block rules are not allowed"
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