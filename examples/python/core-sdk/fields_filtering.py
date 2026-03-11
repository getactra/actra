"""
Field Filtering Example

This example demonstrates how to restrict which parameters
become part of the Actra action object.

This is useful when functions contain additional arguments
that should not be exposed to the policy engine.
"""

from actra import Actra
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------

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


# ------------------------------------------------------------
# 2. Policy
# ------------------------------------------------------------

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


# ------------------------------------------------------------
# 3. Compile policy and create runtime
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


runtime.set_actor_resolver(lambda ctx: {"role": "support"})
runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})


# ------------------------------------------------------------
# 4. Protect function with field filtering
# ------------------------------------------------------------

@runtime.admit(fields=["amount"])
def refund(amount: int, currency: str):
    print(f"Refund executed: {amount} {currency}")


# ------------------------------------------------------------
# 5. Calls
# ------------------------------------------------------------

print("\nAllowed call")
refund(amount=200, currency="USD")

print("\nBlocked call")
refund(amount=1500, currency="USD")