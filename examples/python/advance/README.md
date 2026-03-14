# Advanced Examples

These examples demonstrate more advanced Actra patterns for controlling
high-impact operations in automated and AI-driven systems.

They show how Actra can enforce safety rules, approvals, and guardrails
for complex operational environments such as infrastructure automation
and AI agent tooling.

## Examples

### ai_agent_tool_guardrail.py

Demonstrates how Actra can enforce safety guardrails for AI agents
executing external tools.

The policy ensures:

• AI agents cannot issue refunds above a safe limit  
• Only human supervisors can delete users  
• High-value refunds require supervisor privileges  

Actra acts as a deterministic admission control layer between the
AI agent and the underlying tools.

---

### ai_high_risk_action_approval.py

Demonstrates how Actra can require human approval for high-risk
operations triggered by AI agents or automation.

The policy enforces:

• AI agents scaling services beyond safe limits require approval  
• Production deployments require operator privileges  
• AI agents cannot delete production services  

This example illustrates how Actra enables safe automation while still
allowing human oversight for critical operations.

---

### ai_infrastructure_guardrails.py

Demonstrates how Actra can enforce infrastructure safety policies for
operations triggered by humans, automation pipelines, or AI agents.

The policy ensures:

• AI agents cannot delete production services  
• Production deployments require operator privileges  
• Services cannot scale beyond cluster capacity  

This example also demonstrates schema usage, actor resolution,
snapshot-based policies, and policy debugging using `runtime.explain_call`.

---

### ai_multi_step_safety.py

Demonstrates how Actra can enforce safety rules across multiple
operations performed by AI agents or automation systems.

The policy prevents dangerous sequences of actions by evaluating
snapshot state.

Example rules include:

• AI agents cannot delete databases in production  
• If monitoring is disabled, database deletion requires approval  

This pattern allows Actra to prevent unsafe multi-step operations.