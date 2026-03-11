"""
Policy Testing Example

Demonstrates how to verify policy behaviour using assertions.
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
  - id: block_large_refund
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


policy = Actra.from_strings(schema_yaml, policy_yaml)


allow_context = {
    "action": {"type": "refund", "amount": 200},
    "actor": {"role": "support"},
    "snapshot": {"fraud_flag": False},
}

block_context = {
    "action": {"type": "refund", "amount": 2000},
    "actor": {"role": "support"},
    "snapshot": {"fraud_flag": False},
}


policy.assert_effect(allow_context, "allow")
policy.assert_effect(block_context, "block")

print("Policy tests passed.")