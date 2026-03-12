"""
Custom Action Builder Example

This example demonstrates how to provide a custom function
to construct the Actra action object.

Custom builders are useful when application inputs do not
map directly to policy fields.
"""

from actra import Actra, ActraPolicyError
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
# 3. Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# 4. Register resolvers
# ------------------------------------------------------------

runtime.set_actor_resolver(lambda ctx: {"role": "support"})
runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})


# ------------------------------------------------------------
# 5. Custom action builder
# ------------------------------------------------------------

def build_refund_action(action_type, args, kwargs, ctx):
    """
    Convert application inputs into the policy action object.
    Only fields defined in the policy schema should be included
    """

    return {
        "type": action_type,
        "amount": kwargs["amount"]
    }


# ------------------------------------------------------------
# 6. Protect function using custom builder
# ------------------------------------------------------------

@runtime.admit(action_builder=build_refund_action)
def refund(amount: int, currency: str):
    print(f"Refund executed: {amount} {currency}")


# ------------------------------------------------------------
# 7. Calls
# ------------------------------------------------------------

print("\nAllowed call")
refund(amount=200, currency="USD")

print("\nBlocked call")

try:
  refund(amount=1500, currency="USD")
except ActraPolicyError as e:
   print("Refund blocked by policy")
   print("Rule:", e.matched_rule)