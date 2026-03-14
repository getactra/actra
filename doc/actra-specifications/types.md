# Actra – Type System

## Purpose

The Actra Type System defines the core data structures and functional interfaces used across the Actra SDK.

These types establish the contract between applications, SDK bindings, and the policy engine.

The primary goals of the type system are:

* provide a consistent structure for policy inputs and outputs
* ensure cross-language SDK compatibility
* simplify policy evaluation interfaces
* support flexible runtime integrations

The Actra type model is intentionally minimal and dynamic, allowing policies to operate on arbitrary structured data.

---

# Core Data Types

Actra policies operate on structured dictionaries representing the evaluation domains.

## Action

Represents the operation being requested.

Example:

```json
{
  "type": "refund",
  "amount": 200
}
```

Definition:

| Field        | Type                 |
| ------------ | -------------------- |
| type         | string (recommended) |
| other fields | arbitrary            |

Structure:

```
Action = Dict[str, Any]
```

---

## Actor

Represents the identity performing the action.

Example:

```json
{
  "role": "support",
  "user_id": "123"
}
```

Definition:

```
Actor = Dict[str, Any]
```

---

## Snapshot

Represents external system state relevant to the decision.

Example:

```json
{
  "fraud_flag": false,
  "account_status": "active"
}
```

Definition:

```
Snapshot = Dict[str, Any]
```

---

## Decision

Represents the policy engine result.

Example allow decision:

```json
{
  "effect": "allow"
}
```

Example block decision:

```json
{
  "effect": "block",
  "matched_rule": "block_large_refund"
}
```

Definition:

```
Decision = Dict[str, Any]
```

---

# Evaluation Context

Policies evaluate a structured input composed of three domains.

Example:

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

Definition:

```
ActionInput = {
  "action": Action,
  "actor": Actor,
  "snapshot": Snapshot
}
```

Type representation:

```
ActionInput = Dict[str, Any]
```

---

# Generic Context

Some SDK integrations require an additional runtime context used during evaluation.

Example:

* HTTP request object
* application state
* framework context

Definition:

```
Context = Any
```

This value is used internally by resolver functions.

---

# Evaluation Context Structure

Some internal SDK components operate on a generic evaluation context.

Definition:

```
EvaluationContext = Dict[str, Any]
```

This structure may include:

* action
* actor
* snapshot
* runtime metadata

---

# Path Type

Defines valid path representations used when loading policy files.

Definition:

```
PathType = Union[str, PathLike]
```

Examples:

```
"policy.yaml"
Path("policy.yaml")
```

---

# Resolver Interfaces

Resolvers allow SDK integrations to dynamically construct policy inputs.

These interfaces enable Actra to integrate with:

* web frameworks
* APIs
* AI agents
* service middleware
* background workers

---

## ActionBuilder

Constructs an Action object from a runtime invocation.

Definition:

```
ActionBuilder = Callable[
    [str, Tuple[Any, ...], Dict[str, Any], Context],
    Action
]
```

Parameters:

| Parameter | Description          |
| --------- | -------------------- |
| str       | action type          |
| Tuple     | positional arguments |
| Dict      | keyword arguments    |
| Context   | runtime context      |

Returns:

```
Action
```

---

## ActorResolver

Resolves the identity performing the action.

Definition:

```
ActorResolver = Callable[[Context], Actor]
```

Example use cases:

* extract user from HTTP request
* extract service identity
* extract API key owner

---

## SnapshotResolver

Resolves the external system state used by policy evaluation.

Definition:

```
SnapshotResolver = Callable[[Context], Snapshot]
```

Example use cases:

* fetch database state
* retrieve account metadata
* load fraud indicators

---

## ActionResolver

Constructs the Action object from a function invocation.

Definition:

```
ActionResolver = Callable[
    [str, Tuple[Any, ...], Dict[str, Any], Context],
    Action
]
```

This is similar to ActionBuilder but used in decorator-based integrations.

---

## ContextResolver

Builds the runtime context used during evaluation.

Definition:

```
ContextResolver = Callable[
    [Tuple, Dict[str, Any]],
    Context
]
```

Example use cases:

* build request context
* attach framework metadata
* pass middleware state

---

## ActionTypeResolver

Determines the action type identifier for a function invocation.

Definition:

```
ActionTypeResolver = Callable[
    [Callable, Tuple, Dict[str, Any]],
    str
]
```

Example output:

```
"refund"
"delete_user"
"transfer_funds"
```

---

# Design Principles

## Dynamic Data Model

Actra uses a flexible dictionary-based structure to allow:

* domain-specific schemas
* dynamic attributes
* extensibility

---

## Cross-SDK Compatibility

All SDKs must implement equivalent structures.

Example mapping:

| Python         | Node                    |
| -------------- | ----------------------- |
| Dict[str, Any] | Record<string, unknown> |
| Callable       | Function                |

---

## Minimal Type Constraints

The policy engine operates on generic structured data rather than rigid schemas.

This allows Actra to integrate with:

* REST APIs
* GraphQL
* event systems
* AI agents
* internal service calls

---

## Runtime Extensibility

Resolvers allow SDK users to integrate Actra into application frameworks without modifying policy definitions.

---

# Example Evaluation Flow

```
Application Function Call
        │
        ▼
ContextResolver
        │
        ▼
ActorResolver
        │
        ▼
SnapshotResolver
        │
        ▼
ActionBuilder
        │
        ▼
Evaluation Context
        │
        ▼
Policy.evaluate()
        │
        ▼
Decision
```

---

# Cross-SDK Requirements

All Actra SDKs must implement equivalents for:

| Type                | Required |
| ------------------- | -------- |
| Action              | Yes      |
| Actor               | Yes      |
| Snapshot            | Yes      |
| Decision            | Yes      |
| ActionInput         | Yes      |
| Resolver interfaces | Yes      |

These definitions ensure identical evaluation semantics across languages.
