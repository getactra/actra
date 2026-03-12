"""
Custom Actor and Snapshot Resolvers Example

Demonstrates how runtime context can be used to dynamically
resolve actor identity and external system state.

Resolvers allow applications to supply policy inputs
from runtime context such as:

- authenticated user identity
- request metadata
- system state

"""

from actra import Actra, ActraRuntime, ActraPolicyError

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
  - id: block_large_refund_for_support
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
# 3. Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# 4. Example request context
# ------------------------------------------------------------
class RequestContext:
    def __init__(self, role, fraud_flag):
        self.role = role
        self.fraud_flag = fraud_flag


# ------------------------------------------------------------
# 5. Register resolvers
# ------------------------------------------------------------

# Actor resolver extracts identity information

runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.role}
)

# Snapshot resolver extracts system state
runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": ctx.fraud_flag}
)

# ------------------------------------------------------------
# 6. Create runtime context
# ------------------------------------------------------------

ctx = RequestContext(role="support", fraud_flag=False)

# ------------------------------------------------------------
# 8. Build action
# ------------------------------------------------------------

action = runtime.build_action(
    action_type="refund",
    args=(),
    kwargs={"amount": 2000},
    ctx=ctx
)

# ------------------------------------------------------------
# 9. Evaluate policy
# ------------------------------------------------------------

decision = runtime.evaluate(action, ctx)
print(decision)