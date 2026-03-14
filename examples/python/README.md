# Actra Examples

This directory contains runnable examples demonstrating how Actra
controls automated actions across APIs, agents, and automation systems.

Examples are organized by category to help you quickly find
the pattern relevant to your use case.

## Categories

### Core SDK

Basic Actra usage patterns for normal Python applications.

Examples include:

- protecting functions with `@runtime.admit`
- building actions programmatically
- testing and evaluating policies

Location:

examples/core-sdk/

---

### Helpers

Small helper utilities for quick policy checks.

Examples include:

- `runtime.action()` + `runtime.evaluate()`
- `runtime.allow()`
- `runtime.block()`

Location:

examples/helpers/

---

### Runtime

Advanced runtime capabilities and observability features.

Examples include:

- audit mode
- policy debugging using `explain_call`
- context resolvers
- decision observers
- event emission

Location:

examples/runtime/

---

### Advance

More complex policy patterns for controlling high-impact operations.

Examples include:

- AI agent tool guardrails
- approval workflows for high-risk operations
- infrastructure safety policies
- multi-step safety rules

Location:

examples/advance/

---

### LangChain

Examples demonstrating how Actra can enforce guardrails
for tools executed by LangChain LLM agents.

Actra evaluates policy decisions **before a tool executes**,
ensuring unsafe operations are blocked.

Location:

examples/langchain/

---

### MCP

Examples demonstrating how Actra can enforce admission control
for tools exposed through MCP servers.

Actra evaluates a policy decision before the tool executes,
preventing unsafe tool calls.

Location:

examples/mcp/

---

### Governance

Examples demonstrating how Actra governance policies validate
operational policies before they are accepted.

Governance allows organizations to enforce policy standards such as:

- requiring safety rules
- preventing unsafe rule patterns
- restricting which fields policies may reference
- applying rules only to specific actions

Location:

examples/governance/

---

## Running Examples

Install Actra first:

```bash
pip install actra
```

Examples can be executed directly:

```bash
python example_name.py
```