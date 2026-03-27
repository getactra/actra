"""
Actra Hero Example
AI Agent Guardrails

Control what your AI is allowed to do.

This example demonstrates how Actra enforces safety policies
for AI agents executing real-world actions.

AI agent can:
- issue refunds
- delete users

Actra ensures:
- AI cannot issue large refunds
- only supervisors can delete users
- risky actions require approval
"""

from actra import Actra, ActraRuntime, ActraPolicyError


# ------------------------------------------------------------
# 1. Schema
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
# 2. Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  # AI cannot issue refunds above 500
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


  # Large refunds require approval
  - id: require_approval_large_refund
    scope:
      action: issue_refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 300
    effect: require_approval


  # Only supervisors can delete users
  - id: restrict_delete_user
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
# 3. Setup
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# 4. Context
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
# 5. Tools (business logic)
# ------------------------------------------------------------

@runtime.admit(action_type="issue_refund")
def refund(amount: int, currency: str, ctx=None):
    print(f"Refund executed: {amount} {currency}")


@runtime.admit(action_type="delete_user")
def delete_user(user_id: str, ctx=None):
    print(f"User deleted: {user_id}")


# ------------------------------------------------------------
# 6. Simulated AI Agent
# ------------------------------------------------------------

def run_agent():

    ai = AgentContext(role="assistant", agent_type="ai")
    supervisor = AgentContext(role="supervisor", agent_type="human")

    print("\n--- AI small refund (allowed) ---")
    refund(amount=100, currency="USD", ctx=ai)

    print("\n--- AI medium refund (requires approval) ---")
    try:
        refund(amount=400, currency="USD", ctx=ai)
    except ActraPolicyError as e:
        if e.decision.effect == "require_approval":
            print("Requires approval:", e.matched_rule)

    print("\n--- AI large refund (blocked) ---")
    try:
        refund(amount=1000, currency="USD", ctx=ai)
    except ActraPolicyError as e:
        print("Blocked:", e.matched_rule)

    print("\n--- AI delete user (blocked) ---")
    try:
        delete_user(user_id="user_123", ctx=ai)
    except ActraPolicyError as e:
        print("Blocked:", e.matched_rule)

    print("\n--- Supervisor delete user (allowed) ---")
    delete_user(user_id="user_123", ctx=supervisor)


# ------------------------------------------------------------
# Run
# ------------------------------------------------------------

if __name__ == "__main__":
    run_agent()