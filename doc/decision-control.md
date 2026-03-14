# Decision Control

Decision Control is a system design pattern where policies are evaluated **before operations execute**.

Instead of embedding safety checks directly inside application code, systems evaluate external policies to determine whether an operation should proceed.

This pattern is particularly important in modern systems where actions may be triggered automatically by APIs, automation workflows, or AI agents.

---

## The Problem

Many applications enforce operational rules directly in code.

Example:

```python
if amount > 1000:
    raise Exception("Refund too large")
```

While simple, this approach creates several problems:

* Rules become duplicated across services
* Behavior is difficult to audit
* Policy changes require code deployments
* Automated systems may perform unsafe actions

As systems become more automated, these risks increase.

---

## The Decision Control Model

Decision control moves these rules into external policies that are evaluated before an operation executes.

The basic flow becomes:

```
operation requested
        ↓
policy evaluation
        ↓
allow or block
        ↓
operation executes
```

This ensures that unsafe operations are prevented before they occur.

---

## Key Concepts

Decision control system typically evaluate three domains:

### Action

The operation being requested.

Examples:

* refund
* delete_user
* deploy_service

### Actor

The identity performing the action.

Examples:

* user
* service
* automation system
* AI agent

### Snapshot

External system state used during evaluation.

Examples:

* fraud_flag
* environment
* account_status

Policies evaluate these inputs to determine whether an operation should be allowed or blocked.

---

## Decision Control vs Authorization

Decision control is different from traditional authorization systems.

Authorization answers:

> Can user X access resource Y?

Decision control answers:

> Should this operation execute?

Examples of decision control questions:

* Should this refund execute?
* Should an AI agent run this tool?
* Should this deployment proceed?
* Should an automated workflow delete this resource?

Authorization protects **access to resources**.

Decision control protects **execution of operations**.

---

## Governance

In addition to runtime policy evaluation, decision control systems may support **policy governance**.

Governance validates policies themselves before they are accepted.

Examples include:

* Requiring specific safety rules
* Preventing unsafe policy patterns
* Restricting which fields policies may reference
* Enforcing policy standards across services

This allows organizations to ensure that operational policies remain safe and compliant.

---

## Actra

**Actra** is an open-source system implementing the decision control model.

Actra evaluates policies before operations execute and can enforce rules across:

* APIs
* Automation systems
* Background jobs
* AI agents
* Infrastructure workflows

Actra also supports governance policies that validate operational policies before they are accepted.

For examples, see:

* `examples/`
