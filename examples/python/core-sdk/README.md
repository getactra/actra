# Core SDK Examples

These examples demonstrate the core features of the Actra SDK and how
policies can be evaluated within normal application code.

They cover common patterns such as decorator-based admission control,
manual runtime evaluation, action construction, and policy testing.

## Examples

### basic_refund.py

Shows the simplest Actra usage pattern.

A Python function is protected with `@runtime.admit`, and Actra evaluates
the policy before the function executes.

---

### build_action.py

Demonstrates how to construct an action using
`ActraRuntime.build_action`.

This pattern is useful when evaluating actions outside of decorators,
such as in API frameworks, message queues, or MCP servers.

---

### custom_action_builder.py

Shows how to provide a custom function for building the Actra
action object when application inputs do not directly map
to policy fields.

---

### custom_actor_snapshot_resolvers.py

Demonstrates how to dynamically resolve actor identity and
snapshot state from runtime context.

Resolvers allow applications to provide policy inputs from
sources such as authenticated users, request metadata,
or system state.

---

### fields_filtering.py

Shows how to restrict which function parameters become part
of the Actra action object.

This is useful when functions contain additional arguments
that should not be exposed to the policy engine.

---

### manual_runtime_evaluation.py

Demonstrates how to evaluate actions directly using
`ActraRuntime.evaluate` without using decorators.

This pattern is useful for integrations such as APIs,
background workers, CLI tools, and automation systems.

---

### multiple_runtimes.py

Shows how multiple Actra runtimes can exist within the same
application, each enforcing different policies.

---

### policy_assertion.py

Demonstrates how to validate expected policy outcomes using
assertions.

This is useful for verifying policies during development.

---

### policy_direct_evaluation.py

Shows how to evaluate a policy directly without using
the runtime layer.

---

### policy_testing.py

Demonstrates how to write tests that verify policy behavior
using automated checks.