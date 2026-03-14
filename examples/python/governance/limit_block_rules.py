"""
Governance Example
Limit Block Rules

This example demonstrates how governance policies can limit
the number of block rules allowed in operational policies.

Too many block rules can make systems unusable.
"""

from actra import Actra


schema_yaml = """
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
"""


policy_yaml = """
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
"""


governance_yaml = """
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
"""


print("\nCompiling policy with governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)
    print("Policy compiled successfully")

except Exception as e:
    print("Governance violation detected")
    print(e)