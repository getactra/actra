"""
Context Resolver Example

This example demonstrates how ActraRuntime can extract
execution context from function arguments

Context resolvers are useful when integrations provide
additional runtime information such as:

- authenticated user identity
- request metadata
- agent information
- session state

The context resolver extracts this information and makes
it available to actor and snapshot resolvers
"""

from actra import Actra, ActraPolicyError
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Example application context
# ------------------------------------------------------------

class RequestContext:
    """
    Example request context used by the application
    """

    def __init__(self, role: str):
        self.role = role


# ------------------------------------------------------------
# 2. Schema
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
# 3. Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: block_large_refund
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 1000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "support"
    effect: block
"""


# ------------------------------------------------------------
# 4. Compile policy and create runtime
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# 5. Context resolver
# ------------------------------------------------------------
# Extract the RequestContext object from function arguments

def extract_context(args, kwargs):
    return kwargs.get("ctx")


runtime.set_context_resolver(extract_context)


# ------------------------------------------------------------
# 6. Actor resolver
# ------------------------------------------------------------
# Use context information to build the actor domain

def resolve_actor(ctx):
    return {"role": ctx.role}


runtime.set_actor_resolver(resolve_actor)


# ------------------------------------------------------------
# 7. Snapshot resolver
# ------------------------------------------------------------

runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})


# ------------------------------------------------------------
# 8. Protected function
# ------------------------------------------------------------

# IMPORTANT:
# ctx is application context and should not be included
# in the policy action. Therefore we restrict fields to
# ["amount"].
@runtime.admit(fields=["amount"])
def refund(amount: int, ctx: RequestContext):
    print(f"Refund executed: {amount}")


# ------------------------------------------------------------
# 9. Calls
# ------------------------------------------------------------

support_ctx = RequestContext(role="support")

print("\n--- Allowed call ---")
refund(amount=200, ctx=support_ctx)


print("\n--- Blocked call ---")

try:
    refund(amount=2000, ctx=support_ctx)

except ActraPolicyError as e:
    print("Refund blocked by policy")
    print("Rule:", e.matched_rule)