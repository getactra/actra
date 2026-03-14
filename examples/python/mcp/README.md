# MCP Examples

These examples demonstrate how Actra can enforce deterministic
admission control for tools exposed through MCP servers.

In MCP-based systems, external clients or AI agents can invoke
tools that perform real operations. Actra evaluates a policy
decision **before the tool executes**, ensuring unsafe actions
are blocked.

## Examples

### fastmcp_basic.py

Demonstrates how to enforce Actra policies on MCP tools using
FastMCP.

The example shows how to:

- define an Actra schema
- write a simple policy rule
- create an Actra runtime
- provide runtime context using resolvers
- protect MCP tools using the `@runtime.admit()` decorator

If the policy decision is `"block"`, the MCP tool execution
is prevented.