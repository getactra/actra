# Actra – Runtime Execution Model

## Purpose

`ActraRuntime` provides the runtime execution environment for policy evaluation.

It acts as the bridge between application code and the compiled policy engine.

The runtime is responsible for:

* resolving runtime context
* constructing policy actions
* assembling evaluation context
* invoking policy evaluation
* enforcing admission control
* emitting decision events
* enabling audit and observability

The runtime is framework-neutral and can integrate with:

* application functions
* REST APIs
* background workers
* message queues
* AI agents
* orchestration systems

---

## Runtime Architecture

```
Application Code
        │
        ▼
ActraRuntime
        │
        ├── Action Construction
        ├── Actor Resolution
        ├── Snapshot Resolution
        ├── Context Assembly
        │
        ▼
Policy.evaluate()
        │
        ▼
Decision
        │
        ├── Enforcement
        └── DecisionEvent
```

---

## Core Responsibilities

| Responsibility       | Description                                               |
| -------------------- | --------------------------------------------------------- |
| Action construction  | Convert application inputs into structured policy actions |
| Actor resolution     | Identify the caller performing the operation              |
| Snapshot resolution  | Retrieve external system state                            |
| Context assembly     | Build the full evaluation context                         |
| Policy invocation    | Call the compiled policy engine                           |
| Admission control    | Block or allow execution                                  |
| Decision observation | Emit events for monitoring                                |

---

## Runtime Initialization

A runtime is created using a compiled policy.

```python
policy = Actra.from_files("schema.yaml", "policy.yaml")
runtime = ActraRuntime(policy)
```

The runtime is bound to a single compiled policy instance.

---

## Runtime Resolvers

Resolvers allow Actra to integrate with arbitrary application environments.

They dynamically construct policy input domains.

### Actor Resolver

Determines the identity performing the action.

Signature:

```
fn(ctx) -> Actor
```

Example:

```python
runtime.set_actor_resolver(
    lambda ctx: {"role": "support"}
)
```

### Snapshot Resolver

Retrieves external system state relevant to policy evaluation.

Signature:

```
fn(ctx) -> Snapshot
```

Example:

```python
runtime.set_snapshot_resolver(
    lambda ctx: {"fraud_flag": False}
)
```

### Action Resolver

Custom logic for constructing the policy action.

Signature:

```
fn(action_type, args, kwargs, ctx) -> Action
```

Example:

```python
runtime.set_action_resolver(
    lambda action, args, kwargs, ctx: {
        "type": action,
        "amount": kwargs["amount"]
    }
)
```

### Context Resolver

Extracts runtime context from function arguments.

Signature:

```
fn(args, kwargs) -> Context
```

Example uses:

* extract request objects
* attach framework metadata
* pass runtime environment

### Action Type Resolver

Determines the policy action name dynamically.

Signature:

```
fn(func, args, kwargs) -> str
```

Resolution order:

1. explicit decorator override
2. custom resolver
3. function name

---

## Decision Observer

Actra supports runtime decision observation.

Observers receive a `DecisionEvent` after each evaluation.

Example:

```python
runtime.set_decision_observer(observer)
```

Observer signature:

```
fn(event: DecisionEvent)
```

Event fields include:

| Field       | Description         |
| ----------- | ------------------- |
| action      | evaluated action    |
| decision    | policy result       |
| context     | evaluation context  |
| duration_ms | evaluation duration |

This enables:

* auditing
* metrics
* tracing
* monitoring

---

## Action Construction

Actions represent the operation being evaluated.

Example:

```json
{
  "type": "refund",
  "amount": 200
}
```

Actions can be created using:

```python
runtime.action("refund", amount=200)
```

---

## Action Construction Strategy

The runtime constructs actions using the following priority:

1. explicit action builder
2. runtime action resolver
3. explicit field filter
4. function signature inspection
5. fallback keyword arguments

This ensures only relevant fields reach the policy engine.

---

## Function Signature Filtering

When a protected function is available, Actra inspects its signature.

Example:

```python
def refund(amount, currency):
```

Only declared parameters are considered for action construction.

---

## Schema Field Filtering

If the policy schema defines action fields, they are used to further restrict the action.

Example schema:

```yaml
actions:
  refund:
    fields:
      amount:
        type: number
```

In this case only `amount` is included in the action.

---

## Evaluation Context

The policy engine receives a structured evaluation context.

Structure:

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

The runtime constructs this context using:

```
build_context(action, ctx)
```

---

## Policy Evaluation

Runtime evaluation calls the compiled policy engine.

```python
runtime.evaluate(action, ctx)
```

Evaluation flow:

```
action
  ↓
resolve_actor
  ↓
resolve_snapshot
  ↓
build_context
  ↓
policy.evaluate()
  ↓
decision
```

---

## Decision Result

Policy evaluation returns a decision.

Example allow:

```json
{
  "effect": "allow"
}
```

Example block:

```json
{
  "effect": "block",
  "matched_rule": "limit_refund"
}
```

---

## Admission Control Decorator

The `admit` decorator enforces policy decisions before executing a function.

Example:

```python
@runtime.admit()
def refund(amount):
    ...
```

Execution flow:

```
Function Call
      │
      ▼
Policy Evaluation
      │
      ├── allow → execute function
      └── block → raise ActraPolicyError
```

---

## Action Type Mapping

By default the action type equals the function name.

Example:

```python
@runtime.admit()
def refund(amount):
```

Produces action:

```json
{"type": "refund"}
```

Override example:

```python
@runtime.admit(action_type="refund")
def support_refund(amount):
```

---

## Field Filtering

Developers can control which parameters reach the policy engine.

Example:

```python
@runtime.admit(fields=["amount"])
```

---

## Custom Action Builder

Custom builders allow complex action construction.

Example:

```python
@runtime.admit(action_builder=my_builder)
```

Builder signature:

```
builder(action_type, args, kwargs, ctx) -> dict
```

---

## Audit Mode

The runtime provides a non-blocking policy observation mode.

Decorator:

```python
@runtime.audit()
```

Behavior:

| Decision | Result                             |
| -------- | ---------------------------------- |
| allow    | function executes                  |
| block    | function executes (no enforcement) |

This mode is useful for:

* monitoring policy violations
* gradual policy rollout
* debugging policies

---

## Policy Explanation

The runtime provides debugging helpers.

### explain()

Evaluates a decision and prints the evaluation context.

```python
runtime.explain(action)
```

### explain_call()

Simulates the policy evaluation for a function call without executing it.

Example:

```python
runtime.explain_call(refund, amount=1500)
```

This reconstructs the same evaluation path used by the `admit` decorator.

---

## Convenience Helpers

The runtime provides quick decision helpers.

### allow()

```python
runtime.allow("refund", amount=100)
```

Returns:

```
True / False
```

### block()

```python
runtime.block("refund", amount=2000)
```

Returns:

```
True / False
```

---

## Enforcement Flow

Admission control enforcement occurs internally via:

```
_enforce_policy()
```

Process:

1. Bind function arguments
2. Resolve context
3. Resolve action type
4. Build action
5. Build evaluation context
6. Evaluate policy
7. Raise `ActraPolicyError` if blocked

---

## Async Support

The runtime automatically detects asynchronous functions.

Both sync and async functions are supported:

```python
async def refund():
    ...
```

The runtime wraps them accordingly.

---

## Observability

Every evaluation records execution time and emits a `DecisionEvent`.

Metrics available:

| Metric      | Description         |
| ----------- | ------------------- |
| duration_ms | evaluation latency  |
| decision    | policy result       |
| action      | evaluated operation |

This enables:

* distributed tracing
* policy analytics
* performance monitoring

---

## Cross-SDK Requirements

All Actra SDKs must support equivalent runtime behavior.

| Feature             | Required |
| ------------------- | -------- |
| Policy evaluation   | Yes      |
| Action construction | Yes      |
| Resolver system     | Yes      |
| Admission control   | Yes      |
| Audit mode          | Yes      |
| Decision events     | Yes      |
| Explanation tools   | Yes      |

Language-specific implementations may differ, but evaluation semantics must remain identical.

---

## Design Principles

### Deterministic Evaluation

Policies must produce identical results for identical inputs.

### Framework Neutrality

The runtime must integrate with any execution environment.

### Safe Action Construction

Only relevant fields are exposed to the policy engine.

### Observability First

Every evaluation produces telemetry signals.

### Policy Enforcement Separation

Evaluation and enforcement are separate concerns.
