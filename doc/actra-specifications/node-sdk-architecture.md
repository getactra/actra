# Actra - Node SDK Architecture

## Purpose

This document defines the architecture of the **Actra Node.js SDK**.

The Node SDK provides the same capabilities as the Python SDK while adapting the runtime model to JavaScript and Node ecosystems.

The Node SDK must maintain **identical policy evaluation semantics** as the Python SDK.

---

## Design Goals

The Node SDK must satisfy the following goals:

| Goal                       | Description                                   |
| -------------------------- | --------------------------------------------- |
| Cross-language consistency | Produce identical decisions as the Python SDK |
| Native Node ergonomics     | Follow idiomatic JavaScript patterns          |
| Framework neutrality       | Work with Express, Fastify, Next.js, etc      |
| Async-first                | Support async environments                    |
| Minimal overhead           | Maintain low runtime latency                  |

---

## Node SDK Modules

The Node SDK exposes the following modules:

```
actra/
  errors.ts
  policy.ts
  runtime.ts
  events.ts
  types.ts
  index.ts
```

These mirror the Python SDK modules.

| Module  | Responsibility            |
| ------- | ------------------------- |
| errors  | Error classes             |
| policy  | Compiled policy interface |
| runtime | Runtime orchestration     |
| events  | Decision event model      |
| types   | Type definitions          |

---

## Public SDK API

The Node SDK public API mirrors the Python SDK where possible.

### Example Usage

```ts
import { Actra, ActraRuntime } from "@actra/sdk"

const policy = await Actra.fromFiles(
  "schema.yaml",
  "policy.yaml"
)

const runtime = new ActraRuntime(policy)

runtime.setActorResolver(ctx => ({ role: "support" }))

runtime.setSnapshotResolver(ctx => ({
  fraud_flag: false
}))
```

---

## Policy API

The `Policy` class represents a compiled policy.

| Method         | Description                     |
| -------------- | ------------------------------- |
| evaluate       | Evaluate policy decision        |
| evaluateAction | Evaluate using explicit domains |
| explain        | Print evaluation explanation    |
| policyHash     | Return policy identifier        |

### Example

```ts
const decision = await policy.evaluate({
  action: { type: "refund", amount: 200 },
  actor: { role: "support" },
  snapshot: { fraud_flag: false }
})
```

---

## Runtime API

The runtime orchestrates policy evaluation.

```ts
const runtime = new ActraRuntime(policy)
```

---

## Resolver APIs

Resolvers dynamically populate policy input domains.

### Actor Resolver

```ts
runtime.setActorResolver(ctx => ({
  role: ctx.user.role
}))
```

### Snapshot Resolver

```ts
runtime.setSnapshotResolver(ctx => ({
  fraud_flag: ctx.fraudFlag
}))
```

### Action Resolver

```ts
runtime.setActionResolver((actionType, args, kwargs, ctx) => ({
  type: actionType,
  amount: kwargs.amount
}))
```

### Context Resolver

```ts
runtime.setContextResolver((args, kwargs) => {
  return kwargs.ctx
})
```

### Action Type Resolver

```ts
runtime.setActionTypeResolver((fn, args, kwargs) => {
  return fn.name
})
```

---

## Action Construction

Actions represent the operation being evaluated.

```ts
const action = runtime.action("refund", {
  amount: 200
})
```

Produces:

```json
{
  "type": "refund",
  "amount": 200
}
```

---

## Policy Evaluation

Runtime evaluation:

```ts
runtime.evaluate(action, ctx)
```

Evaluation flow:

```
build action
resolve actor
resolve snapshot
assemble context
policy.evaluate()
emit decision event
```

---

## Decision Observer

Node SDK supports runtime observers.

```ts
runtime.setDecisionObserver(event => {
  console.log(event.effect)
})
```

Observers receive a **DecisionEvent**.

### Decision Event Structure

```ts
{
  action: {...},
  decision: {...},
  context: {...},
  timestamp: Date,
  duration_ms: number
}
```

---

## Admission Control

The Node SDK replaces Python decorators with **function wrappers**.

### Example

```ts
const refund = runtime.admit(async function refund(amount) {
  ...
})
```

Usage:

```ts
await refund(200)
```

Execution flow:

```
function call
    │
    ▼
policy evaluation
    │
    ├ allow → execute
    └ block → throw ActraPolicyError
```

---

## Audit Mode

Audit mode evaluates policy but **never blocks execution**.

```ts
const refund = runtime.audit(async function refund(amount) {
  ...
})
```

Behavior:

```
evaluate policy
always execute function
```

---

## Express Integration Example

Example middleware usage:

```ts
app.post("/refund", async (req, res) => {

  const allowed = runtime.allow("refund", {
    amount: req.body.amount
  }, req)

  if (!allowed) {
    return res.status(403).send("blocked")
  }

  processRefund()
})
```

---

## Async Support

Node SDK methods must support async operations.

All evaluation functions should be **async-safe**.

```ts
await runtime.evaluate(action)
```

---

## Error Model

Errors mirror the Python SDK.

| Error            | Description               |
| ---------------- | ------------------------- |
| ActraError       | Base error                |
| ActraPolicyError | Raised when policy blocks |
| ActraSchemaError | Schema parsing error      |

Example:

```ts
try {
  await refund(2000)
}
catch (e) {
  if (e instanceof ActraPolicyError) {
    console.log(e.matchedRule)
  }
}
```

---

## Policy Compilation

The Node SDK supports multiple loading methods.

### From strings

```ts
const policy = await Actra.fromStrings(
  schemaYaml,
  policyYaml
)
```

### From files

```ts
const policy = await Actra.fromFiles(
  "schema.yaml",
  "policy.yaml"
)
```

### From directory

```
policy/
  schema.yaml
  policy.yaml
  governance.yaml
```

Example:

```ts
const policy = await Actra.fromDirectory("./policy")
```

---

## Policy Hash

The policy hash identifies the compiled policy.

```ts
policy.policyHash()
```

Used for:

* caching
* versioning
* auditing

---

## Node Type Definitions

Core types:

```
Action = Record<string, unknown>
Actor = Record<string, unknown>
Snapshot = Record<string, unknown>
Decision = Record<string, unknown>
```

Evaluation context:

```ts
{
  action: Action
  actor: Actor
  snapshot: Snapshot
}
```

---

## Differences from Python SDK

| Python       | Node              |
| ------------ | ----------------- |
| decorators   | function wrappers |
| sync runtime | async-first       |
| dataclasses  | interfaces        |
| typing       | TypeScript types  |

---

## Implementation Order

```
1 types.ts
2 errors.ts
3 events.ts
4 policy.ts
5 runtime.ts
6 index.ts
```

This order minimizes dependency complexity.

---

## Example End-to-End Usage

```ts
import { Actra, ActraRuntime } from "@actra/sdk"

const policy = await Actra.fromFiles(
  "schema.yaml",
  "policy.yaml"
)

const runtime = new ActraRuntime(policy)

runtime.setActorResolver(ctx => ({
  role: "support"
}))

const refund = runtime.admit(async function refund(amount) {
  console.log("refund executed")
})

await refund(200)
```

---

## Cross-SDK Guarantee

The Node SDK must guarantee:

| Requirement                  | Description                |
| ---------------------------- | -------------------------- |
| Deterministic evaluation     | Same inputs → same outputs |
| Matching decision format     | allow/block identical      |
| Consistent rule behavior     | No language differences    |
| Compatible context structure | action/actor/snapshot      |

---

## Summary

The Node SDK mirrors the Python SDK architecture while adapting to JavaScript runtime patterns.

The runtime remains responsible for:

* context resolution
* action construction
* policy evaluation
* admission enforcement
* observability

This architecture ensures **consistent behavior across all Actra SDKs**.
