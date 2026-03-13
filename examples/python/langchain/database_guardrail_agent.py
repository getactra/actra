"""
Actra Guardrail Example
=======================

This example demonstrates how Actra prevents unsafe actions
triggered by an LLM.

Scenario
--------

An AI system has access to infrastructure tools such as:

    - scaling services
    - restarting systems
    - deleting databases

Deleting a production database is dangerous. Actra policies
ensure that unsafe actions are blocked deterministically.

Flow
----

User > LLM > Tool Call > Actra Policy > Allow / Block

If the policy blocks the action, the tool execution never occurs

In a real agent system, the LLM would decide to call the tool
Here we simulate that decision by invoking the tool directly
"""

from langchain.tools import tool
from langchain_community.llms.fake import FakeListLLM

from actra import Actra, ActraRuntime, ActraPolicyError, ActraContext


# ---------------------------------------------------------------------
# 1. Schema
# ---------------------------------------------------------------------

schema_yaml = """
version: 1

actions:
  delete_database:
    fields:
      database: string
      environment: string

actor:
  fields:
    role: string

snapshot:
  fields:
    maintenance_window: boolean
"""


# ---------------------------------------------------------------------
# 2. Policy
# ---------------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  - id: block_delete_production_database
    scope:
      action: delete_database
    when:
      subject:
        domain: action
        field: environment
      operator: equals
      value:
        literal: "production"
    effect: block
"""


policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ---------------------------------------------------------------------
# 3. Runtime Context
# ---------------------------------------------------------------------

runtime.set_context_resolver(
    lambda args, kwargs: ActraContext(user={"role": "engineer"})
)

runtime.set_actor_resolver(
    lambda ctx: {"role": ctx.user.get("role")}
)

runtime.set_snapshot_resolver(
    lambda ctx: {"maintenance_window": False}
)


# ---------------------------------------------------------------------
# 4. Protected Tool
# ---------------------------------------------------------------------

@tool
@runtime.admit()
def delete_database(database: str, environment: str) -> str:
    """
    Delete a database.

    This tool is protected by Actra admission control.
    """

    return f"Database {database} deleted in {environment}"


# ---------------------------------------------------------------------
# 5. Fake LLM (simulated decision)
# ---------------------------------------------------------------------

llm = FakeListLLM(
    responses=[
        "Delete the users database in production"
    ]
)


# ---------------------------------------------------------------------
# 6. Simulated LLM → Tool Execution
# ---------------------------------------------------------------------

print("\n--- LLM Attempt ---\n")

prompt = "Delete the users database in production"
response = llm.invoke(prompt)

print("LLM request:", response)

try:
    result = delete_database.invoke(
        {
            "database": "users",
            "environment": "production"
        }
    )

    print("Result:", result)

except ActraPolicyError:
    print("Action blocked by Actra policy")