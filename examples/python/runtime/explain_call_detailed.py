"""
Actra explain_call Example
--------------------------

This example demonstrates how to debug a policy decision using
`runtime.explain_call()` without executing the protected function

`explain_call()` simulates the same evaluation flow used by the
`@runtime.admit` decorator, but instead of executing the function,
it prints a human-readable explanation of the policy decision

Use this when you want to understand:

• why a function call is allowed or blocked
• which rule triggered
• what runtime context was used during evaluation

This is extremely useful when developing or debugging policies.
"""

from actra import Actra, ActraRuntime

# ------------------------------------------------------------
# Schema
# ------------------------------------------------------------

# Defines the structure of data that policies can reference.
#
# Domains:
# action   -> information about the operation being performed
# actor    -> identity of the caller
# snapshot -> external system state
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
# Policy
# ------------------------------------------------------------
# Rule:
# Support agents are not allowed to issue refunds greater
# than 1000.
#

policy_yaml = """
version: 1

rules:
    - id: support_limit
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
    effect: block

  """

policy_yaml = """
version: 1

rules:
  - id: block_fraud_account
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

  - id: block_large_refund_by_support
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
# Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)

# ------------------------------------------------------------
# Create runtime
# ------------------------------------------------------------
# The runtime connects application code to the policy engine.
#

runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# Example request context
# ------------------------------------------------------------
# Many frameworks provide request context objects.
# The runtime resolvers can extract actor information from them.
#

class RequestContext:
    def __init__(self, role):
        self.role = role

# ------------------------------------------------------------
# Actor resolver
# ------------------------------------------------------------
# Converts the application context into an Actra actor object.
#

runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.role}
)

# ------------------------------------------------------------
# Snapshot resolver
# ------------------------------------------------------------
# Converts system state into Snapshot object.
#
runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": False}
)

# ------------------------------------------------------------
# Protected function
# ------------------------------------------------------------
# The function is protected using the Actra admission decorator.
#
# If the policy effect is "block", ActraPolicyError will be raised
# and the function will NOT execute.
#

@runtime.admit(fields=["amount"])
def refund(amount: int, ctx=None):
    print("Refund executed:", amount)

# ------------------------------------------------------------
# Create a context where the user is a support agent
# ------------------------------------------------------------
ctx = RequestContext(role="support")

# ------------------------------------------------------------
# Example 1: Allowed execution
# ------------------------------------------------------------
# Refund below the limit should succeed.
#

refund(500, ctx=ctx)

# ------------------------------------------------------------
# Example 2: Debug a blocked call
# ------------------------------------------------------------
# Instead of executing the function (which would raise an error),
# we ask Actra to explain the policy decision.
#

runtime.explain_call(refund, amount=2000, ctx=ctx)

# ------------------------------------------------------------
# Example 3: Debug a blocked call for Fraud Account
# ------------------------------------------------------------
# Instead of executing the function (which would raise an error),
# we ask Actra to explain the policy decision.
#

fraud_runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# Actor resolver
# ------------------------------------------------------------
# Converts the application context into an Actra actor object.
#
fraud_runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.role}
)

# ------------------------------------------------------------
# Snapshot resolver
# ------------------------------------------------------------
# Converts system state into Snapshot object.
#
fraud_runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": True}
)

fraud_runtime.explain_call(refund, 50, ctx)