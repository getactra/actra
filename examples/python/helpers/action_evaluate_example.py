"""
Actra Helper Example — action() + evaluate()

This example demonstrates how to construct an action
programmatically using `runtime.action()` and evaluate
the policy decision directly

This pattern is useful when there is no Python function
to decorate (for example APIs, agents, or event systems)
"""

from actra import Actra
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Schema definition
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:
  deploy:
    fields:
      service: string
      env: string

actor:
  fields:
    role: string

snapshot:
  fields:
    maintenance_mode: boolean
"""


# ------------------------------------------------------------
# 2. Policy definition
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: block_prod_deploy
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


# ------------------------------------------------------------
# 3. Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)


# ------------------------------------------------------------
# 4. Create runtime
# ------------------------------------------------------------

runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# 5. Register resolvers
# ------------------------------------------------------------

runtime.set_actor_resolver(lambda ctx: {"role": "devops"})
runtime.set_snapshot_resolver(lambda ctx: {"maintenance_mode": False})


# ------------------------------------------------------------
# 6. Evaluate actions
# ------------------------------------------------------------

print("\n--- Allowed deployment ---")

decision = runtime.evaluate(
    runtime.action(
        "deploy",
        service="billing",
        env="staging"
    )
)

print("Decision:", decision)


print("\n--- Blocked deployment ---")

decision = runtime.evaluate(
    runtime.action(
        "deploy",
        service="billing",
        env="prod"
    )
)

print("Decision:", decision)