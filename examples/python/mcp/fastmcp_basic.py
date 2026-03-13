"""
Actra + FastMCP Example
=======================

This example demonstrates how to enforce Actra admission control
policies on MCP tools using FastMCP

Actra evaluates a policy decision **before the tool executes**.
If the policy decision is `"block"`, the tool call is prevented
and the execution does not proceed

Key concepts demonstrated in this example:

- Defining an Actra schema
- Writing a simple policy rule
- Creating an Actra runtime
- Providing runtime context using resolvers
- Protecting MCP tools using the `@runtime.admit()` decorator

This example intentionally keeps the runtime context minimal so it
can run in any MCP environment without requiring authentication
or external systems
"""

from fastmcp import FastMCP

from actra import Actra, ActraRuntime
from actra.integrations.mcp import ActraMCPContext


# ---------------------------------------------------------------------
# 1. MCP Server
# ---------------------------------------------------------------------

# Create a FastMCP server instance.
# The name is used for identification in MCP tooling environments.
mcp = FastMCP("actra-example")


# ---------------------------------------------------------------------
# 2. Actra Schema
# ---------------------------------------------------------------------
#
# The schema defines the structure of the policy domains:
#
#   action   : parameters of the tool invocation
#   actor    : identity of the caller
#   snapshot : external system state
#
# Policies are only allowed to reference fields defined here
#

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

# ---------------------------------------------------------------------
# 3. Policy Definition
# ---------------------------------------------------------------------
#
# Policy rule:
#
#   Support agents are NOT allowed to issue refunds larger than 1000
#

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

# ---------------------------------------------------------------------
# 4. Compile Policy and Create Runtime
# ---------------------------------------------------------------------

policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)

# ---------------------------------------------------------------------
# 5. Runtime Context Resolvers
# ---------------------------------------------------------------------
#
# Resolvers provide dynamic runtime data used during policy evaluation.
#
# Actra separates policy logic from application frameworks
# Integrations (ActraMCPContext) are responsible for constructing the context object
#

def resolve_context(args, kwargs) -> ActraMCPContext:
    """
    Build the Actra context object for MCP tool invocations.

    In production environments this context may include:

        - authenticated user identity
        - session metadata
        - request identifiers
        - tenant information

    For this example we provide a minimal context object
    """
    return ActraMCPContext(user={})


def resolve_actor(ctx: ActraMCPContext):
    """
    Extract the actor domain from the MCP context

    The actor represents the entity invoking the tool

    In real systems this may come from:

        - authentication tokens
        - MCP session identity
        - API gateway headers
    """
    return {"role": ctx.user.get("role", "support")}


def resolve_snapshot(ctx: ActraMCPContext):
    """
    Provide external system state used by policies

    Snapshot data typically comes from:

        - databases
        - feature flags
        - fraud detection systems
        - system configuration

    This example always returns `fraud_flag = False`
    """
    return {"fraud_flag": False}


runtime.set_context_resolver(resolve_context)
runtime.set_actor_resolver(resolve_actor)
runtime.set_snapshot_resolver(resolve_snapshot)

# ---------------------------------------------------------------------
# 6. MCP Tool Protected by Actra
# ---------------------------------------------------------------------
#
# The `@runtime.admit()` decorator enforces policy evaluation
# before the tool executes.
#
# If a policy decision results in `"block"`, the tool will not run
#

@mcp.tool()
@runtime.admit()
def refund(amount: int):
    """
    Issue a refund

    This tool is protected by Actra admission control

    Policy behavior:
        - refunds <= 1000 : allowed
        - refunds > 1000 by support agents : blocked

    Args:
        amount:
            Refund amount requested by the caller

    Returns:
        A JSON-serializable response describing the result
    """

    return {
        "message": f"Refund executed: {amount}"
    }


# ---------------------------------------------------------------------
# 7. Run MCP Server
# ---------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()