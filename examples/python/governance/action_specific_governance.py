"""
Governance Example
Action-Specific Governance

This example demonstrates how governance policies can apply
only to specific actions.

The governance rule requires refund policies to include
at least one safety block rule.

However, the operational policy in this example only defines
rules for the `chargeback` action.

Because no refund rules exist, the governance rule does not
apply and the policy compiles successfully.

This allows governance constraints to target specific actions
without affecting unrelated policies.
"""

from actra import Actra


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
"""


policy_yaml = """
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
"""


governance_yaml = """
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
"""


print("\nCompiling policy with governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)
    print("Policy compiled successfully", policy.policy_hash())

except Exception as e:
    print("Governance violation detected")
    print(e)