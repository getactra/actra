"""
MCP Server Utilities for Actra

This module provides helper utilities for building MCP-compatible
tool servers that integrate with Actra admission control

The server layer is responsible for:

    - registering tool functions
    - receiving MCP tool invocation requests
    - constructing execution context objects
    - delegating policy evaluation to the Actra MCP adapter
    - executing tools if policies allow the operation

The server does not contain any policy logic. Instead it coordinates
between the MCP environment and the Actra runtime

The MCP Server handles :
    1. Tool registration : expose Python functions as MCP tools
    2. Request handling  : receive MCP tool calls                  
    3. Argument parsing  : convert tool arguments to Python kwargs 
    4. Context creation  : create `ctx` object from MCP request    
    5. Tool execution    : call the Python function                

Typical execution flow:
    1. MCP Request
    2. Tool Lookup
    3. Context Construction
    4. Actra Policy Evaluation
    5. Allow, Execute Tool
    6. Block, Raise Error

This separation keeps Actra's policy engine independent from the MCP
server implementation while enabling admission control for tool
execution
"""

from typing import Callable, Dict, Any, Optional

from actra.integrations.mcp.adapter import ActraMCPAdapter
from actra.types import Context

class ActraMCPServer:
    """
    Minimal MCP tool server for Actra integration.

    This server registers Python functions as MCP tools and ensures that 
    Actra policies are evaluated before executing those tools
    """

    def __init__(self, adapter: ActraMCPAdapter):
        self.adapter = adapter
        self.tools: Dict[str, Callable] = {}

    def tool(self, name: Optional[str] = None):
        """
        Decorator used to register a tool.

        Example:

            @server.tool()
            def refund(amount: int):
                ...
        """
        def decorator(func: Callable):
            tool_name = name or func.__name__
            self.tools[tool_name] = func
            return func
        return decorator

    def handle_request(
        self,
        tool_name: str, 
        arguments: Dict[str, Any], 
        ctx: Optional[Context] = None):
        """
        Execute an MCP tool call after policy evaluation

        Args:
            tool_name:
                Name of the MCP tool being invoked

            arguments:
                Tool input arguments

            ctx:
                Optional execution context passed to the Actra runtime

        Returns:
            Result returned by the tool function

        Raises:
            ActraPolicyError:
                If the policy blocks the operation
        """
        tool = self.tools.get(tool_name)
        if not tool:
            raise ValueError(f"Unknown tool: {tool_name}")

        # Adapter will raise ActraPolicyError if blocked
        self.adapter.evaluate_tool(tool_name, arguments, ctx)

        return tool(**arguments)
    
__all__ = ["ActraMCPServer"]