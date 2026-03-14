"""
Governance Example
Enterprise Policy Governance

This example demonstrates how Actra governance policies can enforce
organization-wide safety standards for operational policies.

Scenario
--------

A financial platform allows teams to define policies controlling
operations such as refunds and chargebacks.

However, a central security team defines governance policies that
validate all operational policies before they are accepted.

Governance rules enforce:

- Refund policies must include fraud protection rules
- Global block rules are not allowed
- Refund policies may only reference approved safety fields
- Refund policies may not contain excessive block rules

If an operational policy violates these rules, compilation fails.
"""

from actra import Actra


# ------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------

schema_yaml = """
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
"""


# ------------------------------------------------------------
# 2. Operational Policy (violates governance)
# ------------------------------------------------------------

policy_yaml = """
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
"""


# ------------------------------------------------------------
# 3. Governance Policy
# ------------------------------------------------------------

governance_yaml = """
version: 1

governance:
  rules:
    # Refund policies must contain fraud protection
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

    # Prevent overly broad global block rules
    - id: forbid_global_blocks
      select:
        where:
          scope:
            global: true
          effect: block
      must:
        forbid: true
      error: "Global block rules are not allowed"

    # Limit number of block rules
    - id: limit_block_rules
      select:
        where:
          effect: block
      must:
        max_count: 1
      error: "Only one block rule allowed"

    # Restrict which fields refund policies can reference
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
"""


# ------------------------------------------------------------
# 4. Compile policy with governance
# ------------------------------------------------------------

print("\nCompiling policy with enterprise governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)

    print("Policy compiled successfully")
    print(f"Policy hash: {policy.policy_hash()}")

except Exception as e:

    print("Governance violation detected")
    print(e)