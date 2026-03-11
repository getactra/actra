"""
Policy Direct Evaluation Example

Demonstrates how to evaluate policies without using the runtime.
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

decision = policy.evaluate({
    "action": {"type": "refund", "amount": 1500},
    "actor": {"role": "support"},
    "snapshot": {"fraud_flag": False}
})

print(decision)