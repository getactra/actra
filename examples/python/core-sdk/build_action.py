"""
Build Action Example

This example demonstrates how to use `ActraRuntime.build_action`
when evaluating actions outside of decorators

This pattern is useful for integrations where the application
does not call a protected function, such as:

- API frameworks
- message queues
- MCP servers
- background workers
"""

from actra import Actra, ActraRuntime


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
# 5. Example external input
# ------------------------------------------------------------
# Imagine this comes from an API request or message queue

request_data = {
    "amount": 200
}


# ------------------------------------------------------------
# 6. Define a handler signature
# ------------------------------------------------------------
# build_action uses the function signature to determine which
# fields are valid action parameters.
#
# The function is NOT executed. It is only used for introspection.

def fake_handler(amount):
    pass


action = runtime.build_action(
    func=fake_handler,
    action_type="refund",
    args=(),
    kwargs=request_data,
    ctx=None
)


# ------------------------------------------------------------
# 7. Evaluate decision
# ------------------------------------------------------------

decision = runtime.evaluate(action)

print("Decision:", decision)