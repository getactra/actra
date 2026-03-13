"""
Actra Advanced Example
AI High-Risk Action Approval

This example demonstrates how Actra can enforce approval workflows
for high-risk operations triggered by automation or AI agents

Certain operations should not be immediately blocked or allowed
Instead, they should require human review before execution

Actra supports this pattern using the `require_approval` effect

Scenario
--------

An AI automation system manages cloud infrastructure. It can perform
routine operations autonomously, but high-risk operations require
human approval

The policy enforces the following rules:

• AI agents scaling services beyond safe limits require approval
• Production deployments require operator privileges
• AI agents cannot delete production services

This example shows how Actra can act as a deterministic control
layer for autonomous systems while still allowing human oversight
for critical operations.
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
"""

# ------------------------------------------------------------
# Policy
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:

  # Large scaling operations require approval
  - id: large_scale_requires_approval
    scope:
      action: scale_service
    when:
      subject:
        domain: action
        field: replicas
      operator: greater_than
      value:
        literal: 15
    effect: require_approval


  # Production deployments restricted
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
        "cluster_capacity": 20
    }
)

# ------------------------------------------------------------
# Protected operations
# ------------------------------------------------------------

@runtime.admit(action_type="scale_service")
def scale(service, replicas, environment, ctx=None):
    print(f"Scaling {service} to {replicas} replicas")


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


# ------------------------------------------------------------
# Allowed operation
# ------------------------------------------------------------

scale("search-api", replicas=5, environment="staging", ctx=ai_agent)


# ------------------------------------------------------------
# Operation requiring approval
# ------------------------------------------------------------

try:
    scale("search-api", replicas=20, environment="staging", ctx=ai_agent)
except ActraPolicyError as e:
    if e.decision.get("effect") == "require_approval":
        print("Scaling requires human approval")


# ------------------------------------------------------------
# Blocked destructive action
# ------------------------------------------------------------

try:
    delete("search-api", environment="prod", ctx=ai_agent)
except ActraPolicyError:
    print("AI cannot delete production services")


# ------------------------------------------------------------
# Debug policy decision
# ------------------------------------------------------------

print("\nExplain decision for scaling")

runtime.explain_call(
    scale,
    action_type="scale_service",
    service="search-api",
    replicas=20,
    environment="staging",
    ctx=operator
)