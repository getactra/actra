"""
Explain Call Example

Demonstrates how to inspect policy evaluation for a
function call without executing the function.
"""

from actra import Actra, ActraRuntime


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
runtime = ActraRuntime(policy)

def refund(amount: int):
    print("Refund executed:", amount)

# This reproduces exactly what would happen if the function were executed with @runtime.admit
runtime.explain_call(refund, amount=1500)
