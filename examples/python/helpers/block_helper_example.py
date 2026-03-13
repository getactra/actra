"""
Actra Helper Example — block()

The block() helper returns True if the policy decision
blocks the requested action

This pattern is useful for guard checks before executing
sensitive operations
"""

from actra import Actra
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:
  delete_cluster:
    fields:
      name: string
      env: string

actor:
  fields:
    role: string

snapshot:
  fields:
"""


# ------------------------------------------------------------
# 2. Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: protect_prod_cluster
    scope:
      action: delete_cluster
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
# 4. Runtime
# ------------------------------------------------------------

runtime = ActraRuntime(policy)

runtime.set_actor_resolver(lambda ctx: {"role": "admin"})


# ------------------------------------------------------------
# 5. Use block()
# ------------------------------------------------------------

print("\n--- Attempting staging deletion ---")

if runtime.block("delete_cluster", name="search-cluster", env="staging"):
    print("Deletion blocked")
else:
    print("Cluster deleted")


print("\n--- Attempting production deletion ---")

if runtime.block("delete_cluster", name="prod-cluster", env="prod"):
    print("Deletion blocked by policy")
else:
    print("Cluster deleted")