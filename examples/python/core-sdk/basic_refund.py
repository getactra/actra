"""
Basic Actra Example

This example shows how Actra can enforce admission
control policies on normal Python functions.

Actra evaluates a policy BEFORE the function executes
and blocks the call if the policy denies it.
"""

from actra import Actra, ActraPolicyError
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Schema definition
# ------------------------------------------------------------
# The schema defines the structure of data that policies
# are allowed to reference.
#
# Domains:
# - action   : parameters passed to the function
# - actor    : identity of the caller
# - snapshot : external system state
#
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
# 2. Policy definition
# ------------------------------------------------------------
# This policy blocks refunds larger than 1000
#
# Scope limits the rule to the "refund" action
# The rule inspects the action.amount field
#
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

# ------------------------------------------------------------
# 4. Create runtime
# ------------------------------------------------------------

runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# 5. Register context resolvers
# ------------------------------------------------------------
# Resolvers dynamically supply runtime context used by policies.
#
# actor_resolver   : information about the caller
# snapshot_resolver: external system state
#

runtime.set_actor_resolver(lambda ctx: {"role": "support"})
runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})


# ------------------------------------------------------------
# 6. Protect a function with Actra
# ------------------------------------------------------------
# The @runtime.admit decorator intercepts the function call
# and evaluates policies before execution.
#
# 1. Default mapping
#    @runtime.admit() : all kwargs become action fields
#
# 2. Field filtering
#    @runtime.admit(fields=["amount"])
#
# 3. Custom action builder
#    @runtime.admit(action_builder=my_builder)
#

@runtime.admit()
def refund(amount: int):
    print("Refund executed:", amount)


# ------------------------------------------------------------
# 7. Execute calls
# ------------------------------------------------------------

print("\n--- Allowed call ---")
refund(amount=200)


print("\n--- Blocked call ---")
try:
    refund(amount=1500)
except ActraPolicyError as e:
    print("Refund blocked by policy")
    print("Rule:", e.matched_rule )