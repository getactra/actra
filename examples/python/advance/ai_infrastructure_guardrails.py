"""
Actra Advanced Example
AI Infrastructure Guardrails

This example demonstrates how Actra can enforce cloud infrastructure
operations performed by humans, automation systems, or AI agents

The policy enforces safety controls for common platform operations such as:

• Scaling services
• Deploying new versions
• Deleting services

The example showcases several Actra capabilities:

- Multiple action types defined in the schema
- Actor identity resolution (human vs AI agents)
- Snapshot-based policies using live system state
- Policy enforcement using the `@runtime.admit` decorator
- Safe blocking of destructive operations
- Debugging policy decisions using `runtime.explain_call`

Scenario
--------

A platform team operates a service platform where operations may be
triggered by:

- human operators
- automation pipelines
- AI agents managing infrastructure

Actra ensures that:

- AI agents cannot delete production services
- Production deployments require operator privileges
- Services cannot scale beyond cluster capacity

This example illustrates how Actra acts as a deterministic
admission control layer for infrastructure automation.
"""

from actra import Actra, ActraRuntime, ActraPolicyError


# ------------------------------------------------------------
# Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:

  scale_service:
    fields:
      service: string
      replicas: number
      environment: string

  deploy_service:
    fields:
      service: string
      version: string
      environment: string

  delete_service:
    fields:
      service: string
      environment: string

actor:
  fields:
    role: string
    agent_type: string

snapshot:
  fields:
    cluster_capacity: number
    production_freeze: boolean
"""


# ------------------------------------------------------------
# Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  # AI agents cannot delete production services
  - id: block_ai_delete_prod
    scope:
      action: delete_service
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


  # Production deployments require operator role
  - id: prod_deploy_restricted
    scope:
      action: deploy_service
    when:
      all:
        - subject:
            domain: action
            field: environment
          operator: equals
          value:
            literal: "prod"

        - subject:
            domain: actor
            field: role
          operator: not_equals
          value:
            literal: "operator"
    effect: block


  # Prevent scaling beyond cluster capacity
  - id: cluster_capacity_limit
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        subject:
          domain: snapshot
          field: cluster_capacity
    effect: block

  # Freeze Production Deployments
  - id: freeze_production_deploys
    scope:
      action: deploy_service
    when:
      all:
        - subject:
            domain: snapshot
            field: production_freeze
          operator: equals
          value:
            literal: true
        - subject:
            domain: action
            field: environment
          operator: equals
          value:
            literal: "prod"
    effect: block

"""


# ------------------------------------------------------------
# Compile policy
# ------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)


# ------------------------------------------------------------
# Runtime context
# ------------------------------------------------------------

class RequestContext:
    def __init__(self, role, agent_type, freeze = False):
        self.role = role
        self.agent_type = agent_type
        self.freeze = freeze


runtime.set_actor_resolver(
    lambda ctx: {
        "role": ctx.role,
        "agent_type": ctx.agent_type
    }
)

runtime.set_snapshot_resolver(
    lambda ctx: {
        "cluster_capacity": 10,
        "production_freeze": ctx.freeze
    }
)


# ------------------------------------------------------------
# Protected operations
# ------------------------------------------------------------

@runtime.admit(action_type="scale_service")
def scale(service, replicas, environment, ctx=None):
    print(f"Scaling {service} : {replicas} replicas")


@runtime.admit(action_type="deploy_service")
def deploy(service, version, environment, ctx=None):
    print(f"Deploying {service}:{version} to {environment}")


@runtime.admit(action_type="delete_service")
def delete(service, environment, ctx=None):
    print(f"Deleting service {service}")


# ------------------------------------------------------------
# Contexts
# ------------------------------------------------------------

ai_agent = RequestContext(role="automation", agent_type="ai")

operator = RequestContext(role="operator", agent_type="human")

freeze_operator = RequestContext(
                  role="operator",
                  agent_type="human",
                  freeze=True
)

# ------------------------------------------------------------
# Allowed operation
# ------------------------------------------------------------

scale("search-api", replicas=5, environment="staging", ctx=ai_agent)


# ------------------------------------------------------------
# Blocked AI destructive action
# ------------------------------------------------------------

try:
    delete("search-api", environment="prod", ctx=ai_agent)
except ActraPolicyError:
    print("AI cannot delete production services")


# ------------------------------------------------------------
# Blocked deployment
# ------------------------------------------------------------

try:
    deploy("search-api", version="2.1", environment="prod", ctx=ai_agent)
except ActraPolicyError:
    print("Only operators can deploy to production")


print("\nProduction freeze example")

try:
    deploy(
        "search-api",
        version="2.5",
        environment="prod",
        ctx=freeze_operator
    )
except ActraPolicyError:
    print("Deployment blocked due to production freeze")


# ------------------------------------------------------------
# Policy Debugging with explain_call
# ------------------------------------------------------------

print("\nExplain call for scale service")
runtime.explain_call(
    scale,
    action_type="scale_service",
    service="search-api",
    replicas=20,
    environment="staging",
    ctx=operator
)

print("\nExplain call for delete service")
runtime.explain_call(
    delete,
    action_type="delete_service",
    service="lookup-customer",
    environment="prod",
    ctx=ai_agent
)
