"""
Manual Evaluation Example

Shows how to evaluate actions programmatically while
still emitting DecisionEvent objects.
"""

from actra import Actra, ActraRuntime, DecisionEvent

schema_yaml = """
version: 1

actions:
  deploy:
    fields:
      env: string

actor:
  fields:
    role: string

snapshot:
    fields:
"""

policy_yaml = """
version: 1

rules:
  - id: block_prod
    scope:
      action: deploy
    when:
      subject:
        domain: action
        field: env
      operator: equals
      value:
        literal: "prod"
    effect: block
"""

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


def observer(event:DecisionEvent):
    print("Decision:", event.effect)


runtime.set_decision_observer(observer)


action = runtime.build_action(
    action_type="deploy",
    args=(),
    kwargs={"env": "prod"},
    ctx=None,
    func=None,
)

runtime.evaluate(action)