"""
Audit Mode Example

Shows how policy violations can be observed without
blocking execution.
"""

from actra import Actra, ActraRuntime, DecisionEvent


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

def observer(event:DecisionEvent):
    print(
        f"Decision: {event.effect} "
        f"rule={event.matched_rule}"
    )


runtime.set_decision_observer(observer)


@runtime.audit()
def refund(amount: int):
    print("Refund executed:", amount)


refund(amount=200)
refund(amount=2000)