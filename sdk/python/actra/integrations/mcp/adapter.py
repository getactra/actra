"""
Actra MCP Adapter

This module provides the adapter layer that connects MCP tool calls
to the Actra policy runtime

The adapter translates MCP tool invocations into Actra actions and
delegates policy evaluation to `ActraRuntime`

Responsibilities of the adapter include:

    - mapping MCP tool calls to Actra actions
    - constructing action objects from tool arguments
    - forwarding execution context to the runtime
    - evaluating policy decisions before tool execution

The adapter does not implement policy logic itself. Instead it relies
on the core runtime for action construction and evaluation

Execution flow:

    1. MCP Tool Call
    2. ActraMCP Adapter
    3. ActraRuntime.build_action()
    4. ActraRuntime.evaluate()
    5. Policy Decision

If a policy decision results in `"block"`, the adapter raises `ActraPolicyError`
and prevents tool execution

Example usage:

    runtime = ActraRuntime(policy)
    mcp = ActraMCPAdapter(runtime)
    decision = mcp.evaluate_tool(
        tool_name="refund",
        arguments={"amount": 200},
        ctx=context
    )

The adapter is intentionally lightweight so that ActraRuntime remains
the single orchestration layer for policy evaluation across all
integrations
"""

from typing import Dict, Any, Optional

from actra.errors import ActraPolicyError
from actra.types import Context

class ActraMCPAdapter:
    """
    Adapter connecting MCP tool calls to ActraRuntime

    The adapter converts MCP tool invocations into Actra actions and
    delegates policy evaluation to the runtime

    It does not implement policy logic itself and remains a thin layer
    translating MCP inputs into Actra runtime calls
    """

    def __init__(self, runtime):
        self.runtime = runtime

    def evaluate_tool(
        self,
        tool_name: str,
        arguments: Dict[str,Any],
        ctx: Optional[Context] = None):
        """
        Evaluate whether an MCP tool call should be allowed

        Args:
            tool_name:
                Name of the MCP tool being invoked

            arguments:
                Dictionary containing tool arguments

            ctx:
                MCP execution context

        Returns:
            Policy decision dictionary
        
        Raises:
            ActraPolicyError:
                If the policy blocks the action.
        """
        action = self.runtime.build_action(
            action_type=tool_name,
            args=(),
            kwargs=arguments,
            ctx=ctx
        )
        
        decision = self.runtime.evaluate(action, ctx)
        if decision.get("effect") == "block":
            context = self.runtime.build_context(action, ctx)

            raise ActraPolicyError(
                action_type=tool_name,
                decision=decision,
                context=context
            )
        return decision

__all__ = ["ActraMCPAdapter"]
