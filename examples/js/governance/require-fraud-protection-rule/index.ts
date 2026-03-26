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
// 2. Operational Policy (MISSING fraud protection)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: allow_small_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: less_than
      value:
        literal: 500
    effect: allow
`;

// ------------------------------------------------------------
// 3. Governance Policy
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: require_fraud_protection
      select:
        where:
          when:
            subject:
              domain: snapshot
              field: fraud_flag
      must:
        min_count: 1
      error: "Refund policies must include fraud protection logic"
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