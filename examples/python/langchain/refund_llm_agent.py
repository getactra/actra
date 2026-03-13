"""
Actra + LangChain Guardrail Example
===================================

This example demonstrates how Actra can enforce deterministic
policy decisions for tools invoked by an LLM agent

Flow:

User > LLM > Tool Call > Actra Policy > Allow / Block

If the policy blocks the action, the tool execution does not occur
and the LLM must respond accordingly

This pattern is critical for safe agentic systems where AI may attempt
to perform actions such as:

    - issuing refunds
    - modifying infrastructure
    - deleting resources
    - sending emails

Actra acts as the deterministic guardrail controlling those actions.

In a real agent system, the LLM would decide to call the tool
Here we simulate that decision by invoking the tool directly
"""

from langchain.tools import tool
from langchain_community.llms.fake import FakeListLLM

from actra import Actra, ActraRuntime, ActraPolicyError, ActraContext

# ------------------------------------------------------------
# Schema
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
# Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: support_refund_limit
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

# ------------------------------------------------------------
# Resolvers
# ------------------------------------------------------------

runtime.set_context_resolver(
    lambda args, kwargs: ActraContext(
        user={"role": "support"}
    )
)

runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.user.get("role")}
)

runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": False}
)


# ------------------------------------------------------------
# Protected Tool
# ------------------------------------------------------------

@tool
@runtime.admit()
def refund(amount: int) -> str:
    """Refund tool protected by Actra."""
    return f"Refund executed: {amount}"


# ------------------------------------------------------------
# Fake LLM
# ------------------------------------------------------------

llm = FakeListLLM(
    responses=[
        "Call refund with amount=200",
        "Call refund with amount=5000",
    ]
)


# ------------------------------------------------------------
# Simulated LLM Agent Behavior
# ------------------------------------------------------------

def run_agent():
    print("\n--- LLM Attempt 1 ---")

    response = llm.invoke("refund customer")
    print(response)

    try:
        print(refund.invoke({"amount": 200}))
    except ActraPolicyError:
        print("Blocked by policy")

    print("\n--- LLM Attempt 2 ---")

    response = llm.invoke("refund customer")
    print(response)

    try:
        print(refund.invoke({"amount": 5000}))
    except ActraPolicyError:
        print("Blocked by policy")


# ------------------------------------------------------------
# Execute
# ------------------------------------------------------------

if __name__ == "__main__":
    run_agent()