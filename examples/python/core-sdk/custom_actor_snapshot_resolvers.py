"""
Custom Actor and Snapshot Resolvers Example

Demonstrates how runtime context can be used to dynamically
resolve actor and system state.
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
    fraud_flag: boolean
"""


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


policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# Example request context
class RequestContext:
    def __init__(self, role, fraud_flag):
        self.role = role
        self.fraud_flag = fraud_flag


# Actor resolver
runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.role}
)

# Snapshot resolver
runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": ctx.fraud_flag}
)


ctx = RequestContext(role="support", fraud_flag=False)


action = runtime.build_action(
    action_type="refund",
    args=(),
    kwargs={"amount": 2000},
    ctx=ctx
)

decision = runtime.evaluate(action, ctx)

print(decision)