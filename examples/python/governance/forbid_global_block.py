"""
Governance Example
Forbid Global Block Rules

This example demonstrates how governance policies can prevent
operational policies from defining overly broad rules.

Global block rules can disable entire systems and are often
considered unsafe.

Governance prevents policies from defining rules with
`scope.global = true`.
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
"""


governance_yaml = """
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
"""


print("\nCompiling policy with governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)
    print("Policy compiled successfully")

except Exception as e:
    print("Governance violation detected")
    print(e)