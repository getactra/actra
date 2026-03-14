# Helper Examples

These examples demonstrate small helper utilities provided by the
Actra runtime for evaluating policy decisions programmatically.

Helper methods allow applications to perform quick policy checks
without using decorators or full runtime workflows.

## Examples

### action_evaluate_example.py

Demonstrates how to construct an action programmatically using
`runtime.action()` and evaluate it using `runtime.evaluate()`.

This pattern is useful when there is no Python function to decorate,
such as in APIs, event systems, or AI agents.

---

### allow_helper_example.py

Shows how to use the `runtime.allow()` helper.

This helper evaluates the policy and returns `True` if the
requested action is permitted.

It is useful when the application only needs a simple
boolean decision.

---

### block_helper_example.py

Shows how to use the `runtime.block()` helper.

This helper returns `True` if the policy blocks the
requested action.

It can be used for quick guard checks before executing
sensitive operations.