"""
Decision Observer Example

Demonstrates how to observe policy decisions using
the DecisionEvent observer mechanism.
"""

from actra import Actra, ActraRuntime, ActraPolicyError


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


runtime.set_actor_resolver(lambda ctx: {"role": "support"})


def observer(event):
    print(
        f"[Actra] action={event.action_type} "
        f"effect={event.effect} "
        f"rule={event.matched_rule} "
        f"timestamp={event.timestamp} "
        f"time={event.duration_ms:.2f}ms"
    )


runtime.set_decision_observer(observer)


@runtime.admit()
def refund(amount: int):
    print("Refund executed:", amount)

refund(amount=200)
try:
    refund(amount=2000)
except ActraPolicyError as e:
    print("Blocked Rule:", e.matched_rule )
