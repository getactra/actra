# Actra – Evaluation Model

## Purpose

The Actra Evaluation Model defines how policies are evaluated and how decisions are produced.

This document describes the **language‑independent semantics** used by all Actra SDKs. It ensures that:

* Python SDK
* Node SDK
* Go SDK

produce **identical decisions for identical inputs**.

---

# Core Principle

Actra evaluates admission control policies using a **deterministic decision model**.

Policies operate on structured input domains:

* `action`
* `actor`
* `snapshot`

The evaluation result is a **decision object**.

---

# Evaluation Domains

Actra policies operate on three structured domains.

| Domain   | Description                    |
| -------- | ------------------------------ |
| action   | Operation being requested      |
| actor    | Identity performing the action |
| snapshot | External system state          |

### Example Context

```json
{
  "action": {
    "type": "refund",
    "amount": 200
  },
  "actor": {
    "role": "support"
  },
  "snapshot": {
    "fraud_flag": false
  }
}
```

---

# Policy Decision

A policy evaluation produces a **decision**.

The decision contains an **effect**.

Possible effects:

* `allow`
* `block`
* `requires_approval`

---

## Allow Decision

Example:

```json
{
  "effect": "allow"
}
```

Meaning:

The operation is permitted.

---

## Block Decision

Example:

```json
{
  "effect": "block",
  "matched_rule": "block_large_refund"
}
```

Meaning:

The operation **must not proceed**.

## Requires Approval

Example:

```json
{
  "effect": "requires_approval",
  "matched_rule": "refund_non_member"
}
```

Meaning:

The operation **must not proceed and requires approval**.

---

# Deterministic Evaluation

Actra policies must always produce the **same decision when given the same inputs**.

Evaluation must be:

| Property      | Requirement                          |
| ------------- | ------------------------------------ |
| Deterministic | identical inputs → identical outputs |
| Pure          | no side effects                      |
| Stateless     | no persistent runtime state          |

---

# Evaluation Flow

The evaluation process follows a strict sequence.

1. Construct Action
2. Resolve Actor
3. Resolve Snapshot
4. Assemble Evaluation Context
5. Execute Policy Engine
6. Produce Decision

---

# Step 1 – Action Construction

The runtime constructs an **Action object**.

Example:

```json
{
  "type": "refund",
  "amount": 200
}
```

The action type identifies the logical operation.

---

# Step 2 – Actor Resolution

The runtime resolves the identity performing the action.

Example:

```json
{
  "role": "support"
}
```

Actor data typically comes from:

* authentication systems
* request context
* service identity

---

# Step 3 – Snapshot Resolution

Snapshot data represents **external system state**.

Example:

```json
{
  "fraud_flag": false
}
```

Snapshot data may include:

* database state
* account status
* fraud indicators
* system configuration

---

# Step 4 – Context Assembly

The runtime constructs the **evaluation context**.

Structure:

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

This context is passed to the **policy engine**.

---

# Step 5 – Policy Engine Execution

The compiled policy evaluates the context.

Evaluation determines whether any rule **blocks the action**.

Rules may reference:

* action fields
* actor attributes
* snapshot state

---

# Step 6 – Decision Generation

The engine produces a **decision**.

Possible results:

* `allow`
* `block`
* `requires_approval`

If a rule triggered the block or approval, the decision includes:

* `matched_rule`

---

# Rule Matching

Rules evaluate conditions based on the evaluation context.

### Example Rule Logic

```
IF action.type == "refund"
AND action.amount > 1000
AND actor.role != "admin"
THEN block
```

---

# Rule Outcome

Rule evaluation may produce:

| Outcome           | Result |
| ----------------- | ------ |
| no rule triggered/allowed effect | allow  |
| rule triggered    | block/requires approval  |

---

# Precedence Model

Actra follows a **block‑first precedence model**.

```
block overrides allow
```

Meaning:

If **any rule blocks the action**, the final decision is **block**.

---

# Decision Resolution

Evaluation produces a **single final decision**.

| Condition                  | Final Decision |
| -------------------------- | -------------- |
| no blocking rules          | allow          |
| one or more blocking/approval rules | block/requires approval          |

---

# Matched Rule

If the decision is `block` or `requires_approval`, the engine may include the identifier of the rule that triggered the decision.

Example:

```json
{
  "effect": "block",
  "matched_rule": "limit_refund"
}
```

This supports:

* debugging
* auditing
* analytics

---

# Admission Control

When used in **admission mode**, the runtime enforces the decision.

Execution model:

```
evaluate policy
      │
      ▼
allow → execute function
block/requires_approval → raise ActraPolicyError
```

---

# Audit Mode

Actra supports **non‑blocking policy observation**.

In audit mode:

```
evaluate policy
      │
      ▼
always execute function
```

Decisions are still recorded.

---

# Decision Events

Every evaluation emits a **DecisionEvent**.

The event contains:

* action
* decision
* context
* timestamp
* duration_ms

This enables **observability**.

---

# Observability Model

Decision events enable:

| Capability          | Description              |
| ------------------- | ------------------------ |
| auditing            | record policy outcomes   |
| metrics             | track evaluation latency |
| security monitoring | detect blocked actions   |
| analytics           | analyze rule triggers    |

---

# Error Behavior

If a policy decision blocks execution, the runtime raises:

`ActraPolicyError`

The error contains:

* action
* decision
* context

This allows applications to handle policy failures programmatically.

---

# Cross‑SDK Consistency Requirements

All Actra SDKs must implement the **same evaluation semantics**.

| Requirement             | Description                          |
| ----------------------- | ------------------------------------ |
| Deterministic decisions | identical inputs → identical results |
| Same decision format    | consistent allow/block structure     |
| Identical rule behavior | no language‑specific divergence      |
| Context structure       | action / actor / snapshot            |

---

# Example Evaluation

### Input

```json
{
  "action": {
    "type": "refund",
    "amount": 1500
  },
  "actor": {
    "role": "support"
  },
  "snapshot": {
    "fraud_flag": false
  }
}
```

### Policy Rule

```yaml
block_large_refund:
  when:
    action.type == "refund"
    action.amount > 1000
```

### Decision

```json
{
  "effect": "block",
  "matched_rule": "block_large_refund"
}
```

---

# Key Design Principles

## Determinism

Policies must behave **identically across all environments**.

## Explicit Context

All policy inputs are explicitly provided.

There is **no hidden state**.

## Separation of Concerns

Policy logic is separated from application code.

## Observability First

Every evaluation produces **telemetry signals**.

---

# Relationship to SDK Components

| Component | Role                      |
| --------- | ------------------------- |
| Policy    | executes evaluation       |
| Runtime   | orchestrates evaluation   |
| Resolvers | populate context domains  |
| Events    | expose observability      |
| Errors    | enforce admission control |

---

# Summary

The Actra evaluation model is built around a simple deterministic rule:

```
Evaluate context → produce allow, block or requires approval
```

The runtime provides a flexible integration layer while the policy engine guarantees **consistent decision semantics across all SDK implementations**.
