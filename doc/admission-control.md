# Admission Control

Admission control is a mechanism used to evaluate policies **before an operation executes**.

It acts as a gate that determines whether a requested operation should be allowed to proceed. Instead of allowing an action to run and validating the result afterward, admission control evaluates the request **prior to execution** and either allows it or blocks it.

This model is widely used in systems where actions may have significant impact, such as infrastructure automation, financial operations, and AI agent tool execution.

---

## How Admission Control Works

The typical admission control flow is:

```
operation requested
      ↓
admission control policy evaluation
      ↓
 allow or block decision
      ↓
operation executes or is prevented
```

1. An operation is requested.
2. The admission controller evaluates relevant policies.
3. The system returns a decision (allow or block).
4. The operation either proceeds or is prevented.

This ensures unsafe or disallowed operations are stopped **before they occur**.

---

## Example

Consider a refund system where refunds must be restricted above a certain amount.

Application code:

```python
@runtime.admit()
def refund(amount):
    ...
```

Policy definition:

```yaml
rules:
  - id: block_large_refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
```

Runtime behavior:

```
refund(200)   → allowed
refund(1500)  → blocked
```

The policy decision is evaluated **before the function executes**, preventing disallowed operations from running.

---

## Admission Control vs Authorization

Authorization systems answer questions such as:

> Can user X access resource Y?

Admission control answers a different question:

> Should this operation execute?

Examples of admission control decisions include:

* Should this refund execute?
* Should an automation workflow delete this resource?
* Should an AI agent run this tool?
* Should this deployment proceed?

Authorization protects **access to resources**, while admission control protects **execution of operations**.

---

## Where Admission Control Is Used

Admission control is commonly used in systems where operations can have significant consequences.

Typical use cases include:

* Infrastructure automation
* API operations
* Financial transactions
* Background job execution
* AI agent tool usage

These environments often require safeguards to prevent unsafe, destructive, or policy‑violating actions.

---

## Actra

**Actra** implements admission control using deterministic policies.

Actra evaluates policies before operations execute and integrates directly with application code using runtime enforcement.

Typical integration points include:

* APIs
* Automation workflows
* Background workers
* AI agents
* Infrastructure tools

For more information, see:

* `doc/decision-control.md`
