"""
Actra Advanced Example
AI Multi-Step Safety Guardrails

This example demonstrates how Actra can enforce safety rules across
multiple operations performed by automation or AI agents

Certain operations may be safe individually but dangerous when
combined together

Scenario
--------

An AI agent manages infrastructure operations such as:

• restarting services
• disabling monitoring
• deleting databases

Deleting a database is normally restricted, but becomes even more
dangerous if monitoring has already been disabled

Actra prevents this by using snapshot state to detect unsafe
multi-step sequences

Policy Rules
------------

• AI agents cannot delete databases in production
• If monitoring is disabled, database deletion requires approval
"""

from actra import Actra, ActraRuntime, ActraPolicyError

# ------------------------------------------------------------
# Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:

  disable_monitoring:
    fields:
      service: string

  delete_database:
    fields:
      database: string
      environment: string

  restart_service:
    fields:
      service: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    monitoring_disabled: boolean
"""

# ------------------------------------------------------------
# Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  # AI agents cannot delete production databases
  - id: block_ai_db_delete
    scope:
      action: delete_database
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
            field: environment
          operator: equals
          value:
            literal: "prod"
    effect: block


  # If monitoring is disabled, deletion requires approval
  - id: delete_requires_approval_when_monitoring_disabled
    scope:
      action: delete_database
    when:
      subject:
        domain: snapshot
        field: monitoring_disabled
      operator: equals
      value:
        literal: true
    effect: require_approval
"""

# ------------------------------------------------------------
# Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# Context
# ------------------------------------------------------------

class RequestContext:
    def __init__(self, role, agent_type, monitoring_disabled=False):
        self.role = role
        self.agent_type = agent_type
        self.monitoring_disabled = monitoring_disabled


runtime.set_actor_resolver(
    lambda ctx: {
        "role": ctx.role,
        "agent_type": ctx.agent_type
    }
)

runtime.set_snapshot_resolver(
    lambda ctx: {
        "monitoring_disabled": ctx.monitoring_disabled
    }
)


# ------------------------------------------------------------
# Protected operations
# ------------------------------------------------------------

@runtime.admit()
def disable_monitoring(service, ctx=None):
    print(f"Monitoring disabled for {service}")


@runtime.admit()
def delete_database(database, environment, ctx=None):
    print(f"Database {database} deleted")


@runtime.admit()
def restart_service(service, ctx=None):
    print(f"Restarting service {service}")

# ------------------------------------------------------------
# Contexts
# ------------------------------------------------------------

ai_agent = RequestContext(
    role="automation",
    agent_type="ai",
    monitoring_disabled=True
)

operator = RequestContext(
    role="operator",
    agent_type="human",
    monitoring_disabled=True
)

# ------------------------------------------------------------
# Safe operation
# ------------------------------------------------------------

restart_service("search-api", ctx=ai_agent)


# ------------------------------------------------------------
# Risky multi-step operation
# ------------------------------------------------------------

try:
    delete_database("customer-db", environment="staging", ctx=ai_agent)
except ActraPolicyError as e:
    if e.decision.get("effect") == "require_approval":
        print("Database deletion requires approval because monitoring is disabled")


# ------------------------------------------------------------
# Debug policy decision
# ------------------------------------------------------------

print("\nExplain decision")

runtime.explain_call(
    delete_database,
    action_type="delete_database",
    database="customer-db",
    environment="staging",
    ctx=operator
)