# Actra – Decision Event Model

## Purpose

The **Decision Event Model** defines the structured event emitted after every policy evaluation.

This event allows Actra integrations to capture policy evaluation outcomes for:

* logging
* monitoring
* auditing
* metrics
* debugging
* analytics

Decision events are emitted by the Actra runtime after each policy evaluation.

---

# Event Lifecycle

Decision events are generated as part of the runtime evaluation process.

Evaluation flow:

```
Application Call
       │
       ▼
ActraRuntime.evaluate()
       │
       ▼
Policy.evaluate()
       │
       ▼
Decision returned
       │
       ▼
DecisionEvent created
       │
       ▼
Decision observer invoked
```

The runtime then forwards the event to any registered decision observer.

---

# DecisionEvent Structure

A `DecisionEvent` represents the full result of a policy evaluation.

| Field       | Description                            |
| ----------- | -------------------------------------- |
| action      | Action evaluated by the policy         |
| decision    | Decision returned by the policy engine |
| context     | Full evaluation context                |
| timestamp   | Time the evaluation occurred           |
| duration_ms | Evaluation execution time              |

---

# Action Field

Represents the operation evaluated by the policy.

Example:

```json
{
  "type": "refund",
  "amount": 200
}
```

Type:

`Action`

---

# Decision Field

Represents the policy result.

### Example allow decision

```json
{
  "effect": "allow"
}
```

### Example block decision

```json
{
  "effect": "block",
  "matched_rule": "block_large_refund"
}
```

Type:

`Decision`

---

# Context Field

The full evaluation context used by the policy engine.

Structure:

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

Type:

`EvaluationContext`

---

# Timestamp

Records when the evaluation occurred.

Characteristics:

* generated automatically
* uses UTC time
* high precision timestamp

Example:

```
2026-03-14T10:21:43.212Z
```

---

# Duration

Represents the time taken to evaluate the policy.

Unit:

`milliseconds`

Example:

```
0.42
```

This enables:

* latency monitoring
* performance analysis
* runtime metrics

---

# Derived Properties

The event object exposes several convenience properties derived from the decision.

---

## effect

Returns the policy effect.

Possible values:

* `allow`
* `block`
* `requires_approval`

Example:

```
event.effect
```

---

## matched_rule

Returns the identifier of the rule that triggered the decision.

Example:

```
block_large_refund
```

If no rule triggered, this value may be `null`.

---

## is_blocked

Returns whether the action was blocked.

Example:

```
event.is_blocked
```

Equivalent to:

```
event.effect == "block"
```

---

## action_type

Returns the action identifier.

Example:

```
refund
```

Derived from:

```
action["type"]
```

If the action does not define a type, the value defaults to:

```
unknown
```

---

# Runtime Integration

Decision events are emitted by the runtime when policy evaluation completes.

Example observer registration:

```python
runtime.set_decision_observer(observer)
```

Observer example:

```python
def observer(event):
    print(event.effect, event.matched_rule)
```

Observers receive the full `DecisionEvent` object.

---

# Example Event

Example event emitted during evaluation:

```json
{
  "action": {
    "type": "refund",
    "amount": 1500
  },
  "decision": {
    "effect": "block",
    "matched_rule": "block_large_refund"
  },
  "context": {
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
  },
  "timestamp": "2026-03-14T10:21:43Z",
  "duration_ms": 0.41
}
```

---

# Observability Use Cases

Decision events allow Actra to integrate with operational systems.

| Use Case             | Description                    |
| -------------------- | ------------------------------ |
| Policy audit logs    | Track policy decisions         |
| Security monitoring  | Detect blocked actions         |
| Metrics collection   | Measure evaluation performance |
| Compliance reporting | Record rule enforcement        |
| Policy analytics     | Understand rule triggers       |

---

# Metrics Examples

Typical metrics derived from events:

* policy evaluation latency
* policy block rate
* rule trigger frequency
* action evaluation volume

Example metrics:

```
actra_policy_evaluations_total
actra_policy_block_total
actra_policy_latency_ms
```

---

# Cross-SDK Requirements

All Actra SDK implementations must support an equivalent event structure.

| Field       | Required |
| ----------- | -------- |
| action      | Yes      |
| decision    | Yes      |
| context     | Yes      |
| timestamp   | Yes      |
| duration_ms | Yes      |

Derived properties may vary depending on language implementation but must expose equivalent information.

---

# Design Principles

## Structured Observability

Events provide structured data suitable for machine processing.

## Minimal Overhead

Event creation should introduce minimal runtime overhead.

## Deterministic Data

Events must accurately represent the evaluation inputs and outputs.

## Integration-Friendly

Events are designed for easy integration with:

* logging frameworks
* telemetry systems
* security pipelines
* monitoring tools

---

# Related Components

The Decision Event model interacts with:

| Component    | Role                        |
| ------------ | --------------------------- |
| ActraRuntime | Emits decision events       |
| Policy       | Produces decision results   |
| Resolvers    | Populate evaluation context |
| Observers    | Consume decision events     |
