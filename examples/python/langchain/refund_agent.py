"""
Actra + LangChain Example

This example demonstrates how Actra can protect LangChain tools
executed by an LLM agent

The LLM may decide to call a tool, but Actra evaluates a policy
decision before the tool executes

In a real agent system, the LLM would decide to call the tool
Here we simulate that decision by invoking the tool directly
"""

from langchain.tools import tool

from actra import Actra, ActraRuntime, ActraContext

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
# LangChain Tool
# ------------------------------------------------------------

@tool
@runtime.admit()
def refund(amount: int) -> str:
    """Issue a refund to the customer."""
    return f"Refund executed: {amount}"


# ------------------------------------------------------------
# Example Tool Calls
# ------------------------------------------------------------

print(refund.invoke({"amount": 200}))

try:
    print(refund.invoke({"amount": 2000}))
except Exception as e:
    print("Blocked:", e)