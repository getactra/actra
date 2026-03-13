"""
Actra Advanced Example
AI Agent Tool Guardrails

This example demonstrates how Actra can enforce safety policies
for AI agents executing external tools

Large language model agents often have access to powerful tools such as:

• sending emails
• issuing refunds
• deleting resources
• executing infrastructure operations

Without guardrails, an AI agent may accidentally perform destructive
or high-impact operations

Actra acts as a deterministic admission control layer between the
AI agent and the underlying tools

The policy in this example enforces:

• AI agents cannot issue refunds above a safe limit
• Only human supervisors can delete users
• High-value refunds require supervisor role

This pattern allows AI systems to remain autonomous while still
operating within strict operational boundaries
"""

from actra import Actra, ActraRuntime, ActraPolicyError


# ------------------------------------------------------------
# Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:

  issue_refund:
    fields:
      amount: number
      currency: string

  delete_user:
    fields:
      user_id: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    daily_refund_total: number
"""

# ------------------------------------------------------------
# Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  # AI agents cannot issue refunds above $500
  - id: ai_refund_limit
    scope:
      action: issue_refund
    when:
      all:
        - subject:
            domain: actor
            field: agent_type
          operator: equals
          value:
            literal: "ai"

        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 500
    effect: block


  # Only supervisors can delete users
  - id: restrict_user_deletion
    scope:
      action: delete_user
    when:
      subject:
        domain: actor
        field: role
      operator: not_equals
      value:
        literal: "supervisor"
    effect: block
"""

# ------------------------------------------------------------
# Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)

# ------------------------------------------------------------
# Runtime Context
# ------------------------------------------------------------

class AgentContext:
    def __init__(self, role, agent_type):
        self.role = role
        self.agent_type = agent_type


runtime.set_actor_resolver(
    lambda ctx: {
        "role": ctx.role,
        "agent_type": ctx.agent_type
    }
)

runtime.set_snapshot_resolver(
    lambda ctx: {
        "daily_refund_total": 1200
    }
)

# ------------------------------------------------------------
# AI Agent Tools
# ------------------------------------------------------------

@runtime.admit(action_type="issue_refund")
def refund(amount, currency, ctx=None):
    print(f"Issuing refund: {amount} {currency}")


@runtime.admit(action_type="delete_user")
def delete_user(user_id, ctx=None):
    print(f"Deleting user {user_id}")

# ------------------------------------------------------------
# Contexts
# ------------------------------------------------------------

ai_agent = AgentContext(role="assistant", agent_type="ai")
supervisor = AgentContext(role="supervisor", agent_type="human")

# ------------------------------------------------------------
# Allowed operation
# ------------------------------------------------------------

refund(200, "USD", ctx=ai_agent)


# ------------------------------------------------------------
# Blocked AI refund
# ------------------------------------------------------------

try:
    refund(1000, "USD", ctx=ai_agent)
except ActraPolicyError:
    print("AI agent cannot issue large refunds")

# ------------------------------------------------------------
# Blocked user deletion
# ------------------------------------------------------------

try:
    delete_user("user_123", ctx=ai_agent)
except ActraPolicyError:
    print("Only supervisors can delete users")

# ------------------------------------------------------------
# Debug a decision
# ------------------------------------------------------------

print("\nExplain refund decision")
runtime.explain_call(
    refund,
    action_type="issue_refund",
    amount=800,
    currency="USD",
    ctx=ai_agent
)
