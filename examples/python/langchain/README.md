# LangChain Examples

These examples demonstrate how Actra can act as a deterministic
guardrail for tools executed by LLM agents built with LangChain.

In agentic systems, an LLM may decide to call tools that perform
real-world operations such as issuing refunds, modifying
infrastructure, or deleting resources.

Actra evaluates a policy decision **before the tool executes**,
ensuring unsafe operations are blocked.

## Examples

### database_guardrail_agent.py

Demonstrates how Actra can prevent unsafe infrastructure actions
triggered by an LLM agent.

The example simulates an AI system with access to tools such as:

- scaling services
- restarting systems
- deleting databases

Actra policies ensure dangerous operations (such as deleting
a production database) are blocked deterministically.

---

### refund_agent.py

Shows how Actra can protect LangChain tools that perform
financial operations.

Before the tool executes, Actra evaluates the policy decision
to determine whether the action should be allowed.

---

### refund_llm_agent.py

Demonstrates how Actra can enforce deterministic safety
rules for tools invoked by an LLM agent.

If the policy blocks the action, the tool execution never occurs
and the agent must respond accordingly.

This pattern allows AI agents to remain autonomous while
operating within strict operational boundaries.