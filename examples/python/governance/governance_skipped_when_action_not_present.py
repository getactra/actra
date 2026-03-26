"""
Example: Governance Action-Specific Rules

This test verifies that governance rules targeting specific
actions are skipped when the policy does not contain rules
for those actions.

Scenario:

• Governance requires refund policies to include a block rule
• The policy only defines chargeback rules
• Governance rule should be skipped
• Compilation should succeed
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

# Should compile successfully because no refund rules exist in the policy
policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)

assert policy.policy_hash() is not None

print("Policy compiled successfully:", policy.policy_hash())