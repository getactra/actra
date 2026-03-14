# Actra – Error Model

## Purpose

The Actra Error Model defines the standard exception hierarchy used by the Actra SDK to represent runtime, policy, and schema failures.

All Actra-related errors inherit from a common base exception to allow applications to:

* handle Actra failures generically
* access structured debugging information
* integrate errors with APIs, logging systems, and monitoring tools

This error hierarchy must remain consistent across all SDKs (Python, Node, Go).

---

## Error Hierarchy

```
ActraError
├── ActraPolicyError
└── ActraSchemaError
```

All errors raised by the Actra SDK **must inherit from `ActraError`**.

---

# Base Error

## ActraError

### Description

`ActraError` is the base exception for all Actra SDK errors.

Applications integrating Actra may catch this error to handle all Actra failures in a unified way.

### Example

```python
try:
    refund(amount=5000)
except ActraError as e:
    logger.error("Actra failure", exc_info=e)
```

### Responsibilities

* Provide a single root exception for Actra
* Allow application-level generic error handling
* Provide compatibility across SDKs

---

## SDK Portability Requirement

Every SDK implementation **must define a root error class**.

| Language | Base Error                  |
| -------- | --------------------------- |
| Python   | `ActraError`                |
| Node     | `ActraError`                |
| Go       | error wrapping `ActraError` |

---

# Policy Evaluation Error

## ActraPolicyError

### Description

`ActraPolicyError` is raised when a policy **blocks an action**.

This occurs when the policy engine returns a decision with effect:

```
"effect": "block"
```

This error provides structured information about the policy decision and evaluation context.

---

## When This Error Occurs

This error is raised by:

* `ActraRuntime.admit` decorator

when a policy decision blocks execution of an action.

### Example Flow

```
Application Action
        ↓
Actra Runtime Evaluation
        ↓
Policy Decision = "block"
        ↓
ActraPolicyError raised
```

---

## Error Attributes

| Attribute   | Description                                           |
| ----------- | ----------------------------------------------------- |
| action_type | Name of the action evaluated by the policy            |
| decision    | Decision object returned by the policy engine         |
| context     | Full evaluation context used during policy evaluation |

---

## Decision Structure

Example:

```json
{
  "effect": "block",
  "matched_rule": "support_limit"
}
```

---

## Context Structure

The evaluation context contains the domains used during policy execution.

Example:

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

These domains are defined by the Actra policy evaluation model.

---

## Derived Properties

### matched_rule

Returns the identifier of the rule that blocked the action.

Example:

```
support_limit
```

If no rule is provided in the decision, the value may be `null`.

---

## Structured Error Output

### `to_dict()`

Returns a structured representation of the policy error.

Example output:

```json
{
  "action": "refund",
  "decision": {
    "effect": "block",
    "matched_rule": "support_limit"
  },
  "context": {
    "action": {...},
    "actor": {...},
    "snapshot": {...}
  }
}
```

---

## Logging and Monitoring Integration

This structured output allows Actra errors to integrate with:

* API error responses
* AI agent debugging
* distributed tracing
* monitoring systems
* security auditing
* policy observability tools

Example:

```python
except ActraPolicyError as e:
    logger.warning("Policy blocked", extra=e.to_dict())
```

---

## Developer Representation

The developer representation should contain:

```python
ActraPolicyError(
  action_type="refund",
  decision={...}
)
```

This representation is intended for:

* debugging
* logs
* interactive development

---

# Schema Error

## ActraSchemaError

### Description

`ActraSchemaError` is raised when the Actra policy schema cannot be parsed or validated.

This typically indicates:

* invalid YAML syntax
* malformed schema structure
* incorrect configuration format

---

## Error Attributes

| Attribute      | Description                      |
| -------------- | -------------------------------- |
| message        | Description of the schema error  |
| original_error | Optional underlying parser error |

---

## Typical Causes

Examples include:

* invalid YAML
* missing required fields
* incorrect schema structure
* unsupported configuration keys

Example:

```python
raise ActraSchemaError(
    "Invalid policy schema",
    original_error=e
)
```

---

# Cross-SDK Design Requirements

All SDK implementations must support equivalent errors.

| Error            | Description                           |
| ---------------- | ------------------------------------- |
| ActraError       | Base error for all Actra failures     |
| ActraPolicyError | Raised when a policy blocks an action |
| ActraSchemaError | Raised when schema parsing fails      |

SDK implementations must provide:

* structured error metadata
* developer-friendly error messages
* programmatic access to decision data

---

# Design Notes

The Actra error model prioritizes:

## Structured Errors

Errors contain structured information to allow programmatic inspection.

## Debuggability

Developers can identify:

* which action was blocked
* which rule triggered the block
* the full evaluation context

## Observability

The error structure supports integration with:

* logging systems
* security monitoring
* audit pipelines
* AI agent workflows
