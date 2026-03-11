"""
Manual Runtime Evaluation Example

This example demonstrates how to use ActraRuntime directly
without decorators.

This pattern is useful for integrations such as:
- API frameworks
- MCP servers
- background workers
- CLI tools

The application constructs an action object and asks
the runtime to evaluate it.
"""

from actra import Actra
from actra.runtime import ActraRuntime

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

# ------------------------------------------------------------
# 4. Create runtime
# ------------------------------------------------------------

runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# 5. Context resolvers
# ------------------------------------------------------------

runtime.set_actor_resolver(lambda ctx: {"role": "support"})
runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})

# ------------------------------------------------------------
# 6. Build an action manually
# ------------------------------------------------------------
# In many integrations the action will come from:
# - HTTP requests
# - tool calls
# - message queues
#

action = runtime.build_action(
    action_type="refund",
    args=(),
    kwargs={"amount": 200},
    ctx=None
)

# ------------------------------------------------------------
# 7. Evaluate the action
# ------------------------------------------------------------

result = runtime.evaluate(action)

print("\nEvaluation result:")
print(result)

# ------------------------------------------------------------
# 8. Blocked example
# ------------------------------------------------------------

blocked_action = runtime.build_action(
    action_type="refund",
    args=(),
    kwargs={"amount": 1500},
    ctx=None
)

blocked_result = runtime.evaluate(blocked_action)

print("\nBlocked evaluation result:")
print(blocked_result)