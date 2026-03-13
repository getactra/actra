"""
Actra Helper Example — allow()

The allow() helper evaluates the policy and returns True
if the action is permitted

This is useful when the application only needs a boolean
decision instead of the full policy result
"""

from actra import Actra
from actra.runtime import ActraRuntime


# ------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:
  scale_service:
    fields:
      service: string
      replicas: number

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
  - id: block_large_scale
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        literal: 10
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

runtime.set_actor_resolver(lambda ctx: {"role": "operator"})


# ------------------------------------------------------------
# 5. Use allow()
# ------------------------------------------------------------

print("\n--- Allowed scaling ---")

if runtime.allow("scale_service", service="search", replicas=5):
    print("Scaling service to 5 replicas")


print("\n--- Blocked scaling ---")

if not runtime.allow("scale_service", service="search", replicas=20):
    print("Scaling request denied by policy")