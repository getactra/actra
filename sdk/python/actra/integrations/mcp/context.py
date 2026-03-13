"""
MCP Context Model for Actra Integrations

This module defines the context object used when evaluating Actra
policies for MCP tool calls

Actra separates policy evaluation from application frameworks
Integrations are responsible for constructing a context object that
contains any runtime information required by policy resolvers

In MCP environments this context typically includes:

    - user identity
    - session metadata
    - request information
    - tool execution environment

The context object is passed to `ActraRuntime.evaluate()` during policy evaluation
and is used by configured resolvers to populate the policy domains:

    actor
    snapshot

Example:

    ctx = MCPContext(
        user={"id": "123", "role": "support"},
        metadata={"session_id": "abc"}
    )

Resolvers can then extract policy inputs from the context:

    runtime.set_actor_resolver(lambda ctx: {"role": ctx.user["role"]})

The Actra runtime itself remains framework-agnostic and does not
interpret the context object directly. Instead, integrations define
how the context should be structured and how resolvers derive the
required policy inputs

This design keeps the core Actra runtime independent from MCP and other integrations while
allowing flexible policy evaluation across different environments
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ActraMCPContext:
    """
    Context object passed to ActraRuntime when evaluating MCP tool calls

    The context carries runtime information about the MCP request
    environment such as user identity, metadata, and request details

    Integrations populate this object and pass it to the Actra runtime,
    where configured resolvers derive the policy domains (`actor`,
    `snapshot`) from the context

     Attributes:
        user:
            Information about the user invoking the MCP tool

        metadata:
            Arbitrary session or execution metadata

        request:
            Raw MCP request data or tool invocation details

    Example:
        ctx = MCPContext(
            user={"id": "123", "role": "support"},
            metadata={"session": "abc"}
        )
    """

    user: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    request: Optional[Dict[str, Any]] = None

__all__ = ["ActraMCPContext"]