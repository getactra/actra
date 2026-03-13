"""
Context Resolver Example

Shows how runtime context can be extracted from
function arguments.
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


class RequestContext:
    def __init__(self, role):
        self.role = role


runtime.set_context_resolver(
    lambda args, kwargs: kwargs.get("ctx")
)

runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.role}
)


@runtime.admit(action_type="refund")
def refund(amount: int, ctx=None):
    print("Refund executed:", amount)


ctx = RequestContext(role="support")

refund(amount=200, ctx=ctx)
refund(amount=2000, ctx=ctx)
