# Runtime Examples

These examples demonstrate advanced runtime capabilities of the
Actra SDK, including policy observation, debugging, context
resolution, and event monitoring.

They show how applications can integrate Actra deeply into
execution environments such as APIs, agents, and automation
systems.

## Examples

### audit_decorator.py

Demonstrates how to use the `@runtime.audit()` decorator.

Audit mode evaluates policies but **does not block execution**.
This is useful for observing policy violations during rollout
or debugging.

---

### context_resolver.py

Shows how Actra can extract execution context from function
arguments using a context resolver.

Context resolvers allow integrations to pass runtime information
such as authenticated users, request metadata, or agent identity
into the policy evaluation process.

---

### decision_observer.py

Demonstrates how to observe policy evaluations using the
`DecisionEvent` observer mechanism.

This allows applications to log, audit, or monitor policy
decisions.

---

### explain_call.py

Shows how to inspect a policy decision for a function call
without executing the function.

This is useful when debugging or exploring policy behavior.

---

### explain_call_detailed.py

Provides a more detailed example of `runtime.explain_call()`,
showing how to inspect:

- which rule triggered
- why a decision was made
- what runtime context was used

This is particularly useful when developing or debugging policies.

---

### extract_framework_context.py

Demonstrates how runtime context can be extracted from function
arguments in framework integrations.

This pattern is useful for APIs, agent systems, and middleware.

---

### manual_evaluation_with_events.py

Shows how to evaluate actions programmatically while still
emitting `DecisionEvent` objects for monitoring and observability.