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
    membership_active: boolean
`;

// ------------------------------------------------------------
// 2. Operational Policy (INVALID - uses disallowed field)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:
  - id: refund_rule
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 100
        - subject:
            domain: snapshot
            field: membership_active
          operator: equals
          value:
            literal: true
    effect: allow
`;

// ------------------------------------------------------------
// 3. Governance Policy
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: restrict_fields
      select:
        where:
          effect: allow
      must:
        allowed_fields:
          - snapshot.fraud_flag
          - action.amount
      error: "Policies may only reference fraud_flag & action.amount"
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