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
    membership_active: boolean
`;

// ------------------------------------------------------------
// 2. Operational Policy (violates governance)
// ------------------------------------------------------------
const policyYaml = `
version: 1

rules:

  - id: allow_loyal_customer_refund
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: snapshot
            field: membership_active
          operator: equals
          value:
            literal: true

        - subject:
            domain: action
            field: amount
          operator: less_than
          value:
            literal: 200
    effect: allow

  - id: block_large_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 2000
    effect: block
`;

// ------------------------------------------------------------
// 3. Governance Policy
// ------------------------------------------------------------
const governanceYaml = `
version: 1

governance:
  rules:
    - id: require_fraud_protection
      applies_to:
        actions:
          - refund
      select:
        where:
          when:
            subject:
              domain: snapshot
              field: fraud_flag
      must:
        min_count: 1
      error: "Refund policies must include fraud protection logic"

    - id: forbid_global_blocks
      select:
        where:
          scope:
            global: true
          effect: block
      must:
        forbid: true
      error: "Global block rules are not allowed"

    - id: limit_block_rules
      select:
        where:
          effect: block
      must:
        max_count: 1
      error: "Only one block rule allowed"

    - id: restrict_refund_fields
      applies_to:
        actions:
          - refund
      select:
        where:
          effect: allow
      must:
        allowed_fields:
          - snapshot.fraud_flag
          - action.amount
      error: "Refund policies may only reference fraud_flag and amount"
`;

// ------------------------------------------------------------
// 4. Compile policy with governance
// ------------------------------------------------------------
console.log("\nCompiling policy with enterprise governance rules...\n");

try {
  const policy = await Actra.fromStrings(
    schemaYaml,
    policyYaml,
    governanceYaml
  );

  console.log("Policy compiled successfully");
  console.log("Policy hash:", policy.policyHash());

} catch (e: any) {
  console.log("Governance violation detected");
  console.log(e.message || e);
}