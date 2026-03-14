# Actra – Policy Runtime & Compiler Interface

## Purpose

The **Policy** defines the primary interface used by applications to:

* load and compile Actra policies
* evaluate policy decisions
* inspect policy metadata
* test and debug policy behavior

The module exposes two main classes:

| Class  | Responsibility                                            |
| ------ | --------------------------------------------------------- |
| Policy | Represents a compiled policy ready for evaluation         |
| Actra  | Loader and compiler interface for creating Policy objects |

The runtime policy engine is implemented in **Rust**, and the SDK acts as a **language binding layer**.

---

## Architecture Overview

```
Application
      │
      ▼
   Actra SDK
      │
      ▼
Policy Runtime Wrapper
      │
      ▼
Rust Policy Engine
```

Responsibilities:

| Layer       | Responsibility                  |
| ----------- | ------------------------------- |
| SDK         | Developer-friendly API          |
| Policy      | Evaluation runtime wrapper      |
| Rust Engine | Deterministic policy evaluation |

Policies are **deterministic and side-effect free**.

---

## Evaluation Model

A policy evaluates structured input composed of three domains:

| Domain   | Description                    |
| -------- | ------------------------------ |
| action   | Operation being requested      |
| actor    | Identity performing the action |
| snapshot | External system state          |

### Example Evaluation Context

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

# Policy Class

## Description

`Policy` represents a **compiled admission control policy** produced by the Actra compiler.

It provides runtime methods for evaluating policy decisions.

Applications should **not instantiate this class directly**.

Instead policies must be loaded using:

* `Actra.from_strings()`
* `Actra.from_files()`
* `Actra.from_directory()`

---

# Policy Runtime API

## evaluate()

Evaluate a policy decision using a full evaluation context.

### Input

```json
{
  "action": {...},
  "actor": {...},
  "snapshot": {...}
}
```

### Output

A decision dictionary.

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
  "rule_id": "block_large_refund"
}
```

---

## evaluate_action()

Convenience wrapper for evaluating policies using separate domain inputs.

| Parameter | Description                       |
| --------- | --------------------------------- |
| action    | Operation being evaluated         |
| actor     | Identity performing the operation |
| snapshot  | External system state             |

### Example

```python
policy.evaluate_action(
    action={"type": "refund", "amount": 200},
    actor={"role": "support"},
    snapshot={"fraud_flag": False}
)
```

Internally this method constructs the evaluation context and delegates to `evaluate()`.

---

## explain()

Evaluate a decision and produce a **human-readable explanation**.

This method is intended for:

* debugging
* development
* experimentation
* notebook usage

The output includes:

* action input
* actor input
* snapshot input
* policy decision

### Example Output

```
Actra Decision
--------------

Action:
  type: refund
  amount: 200

Actor:
  role: support

Snapshot:
  fraud_flag: False

Result:
  effect: allow
```

The method returns the same decision object as `evaluate()`.

---

## policy_hash()

Returns a deterministic identifier for the compiled policy.

This hash represents:

* schema
* policy rules
* governance configuration

### Uses

| Use Case          | Description                  |
| ----------------- | ---------------------------- |
| Policy versioning | Identify deployed policies   |
| Auditing          | Track policy changes         |
| Caching           | Cache compiled policies      |
| Debugging         | Verify runtime configuration |

Example:

```
b6f13c8d7e2c...
```

---

## assert_effect()

Testing helper used to verify expected policy behavior.

| Parameter | Description                          |
| --------- | ------------------------------------ |
| context   | Evaluation context                   |
| expected  | Expected effect ("allow" or "block") |

### Behavior

* Evaluate the policy
* Compare returned effect with expected effect
* Raise an assertion error if they differ

### Example

```python
policy.assert_effect(context, "block")
```

Used primarily for:

* unit tests
* CI pipelines
* policy validation

---

# Developer Representation

The policy object provides developer-friendly representations.

Example:

```
Policy(hash=3c2f7ab8...)
```

This representation is intended for:

* debugging
* logs
* REPL sessions

---

# Notebook Integration

The policy object supports rich HTML representation for notebook environments.

Example rendering:

```
Actra Policy
Hash: 3c2f7ab8...
```

This improves developer experience in:

* Jupyter notebooks
* data science workflows
* experimentation environments

---

# Actra Compiler Interface

## Actra Class

The `Actra` class provides helper methods for **compiling policies from various sources**.

This acts as the **public SDK entry point**.

---

# Policy Compilation Methods

## from_strings()

Compile a policy directly from YAML strings.

| Parameter       | Description               |
| --------------- | ------------------------- |
| schema_yaml     | Schema definition         |
| policy_yaml     | Policy rules              |
| governance_yaml | Optional governance rules |

### Use Cases

* testing
* examples
* dynamic policy generation
* notebook experimentation

### Example

```python
policy = Actra.from_strings(
    schema_yaml,
    policy_yaml
)
```

---

## from_files()

Compile a policy from YAML files.

| Parameter       | Description              |
| --------------- | ------------------------ |
| schema_path     | Path to schema YAML      |
| policy_path     | Path to policy YAML      |
| governance_path | Optional governance YAML |

### Behavior

* Validate file existence
* Load YAML contents
* Compile using the Actra engine

### Example

```python
policy = Actra.from_files(
    "schema.yaml",
    "policy.yaml"
)
```

---

## from_directory()

Compile a policy from a directory structure.

### Required Files

```
schema.yaml
policy.yaml
```

### Optional File

```
governance.yaml
```

### Example Directory

```
policy/
  schema.yaml
  policy.yaml
  governance.yaml
```

### Example Usage

```python
policy = Actra.from_directory("./policy")
```

---

# Compiler Metadata

## compiler_version()

Returns the version of the underlying Actra compiler.

This corresponds to the **Rust policy engine version**.

Example:

```
1.2.0
```

Useful for:

* compatibility checks
* debugging
* deployment validation

---

# Error Handling

Possible errors raised by this module include:

| Error             | Description                |
| ----------------- | -------------------------- |
| ActraSchemaError  | Invalid schema YAML        |
| FileNotFoundError | Missing policy files       |
| RuntimeError      | Underlying engine failures |

---

# Cross-SDK Design Requirements

All SDK implementations must support equivalent functionality.

| Feature            | Required |
| ------------------ | -------- |
| Policy evaluation  | Yes      |
| Policy compilation | Yes      |
| Policy hashing     | Yes      |
| Debug explanation  | Yes      |
| Testing helpers    | Yes      |

SDKs should expose a similar API structure across languages.

Example mapping:

| Python             | Node              |
| ------------------ | ----------------- |
| Actra.from_files   | Actra.fromFiles   |
| policy.evaluate    | policy.evaluate   |
| policy.policy_hash | policy.policyHash |

---

# Design Principles

The policy runtime follows several key principles.

## Deterministic Evaluation

Policy decisions must produce identical results for identical inputs.

## Side-Effect Free

Policies must not mutate system state.

## Structured Input

Evaluation contexts are strictly structured into:

* action
* actor
* snapshot

## Cross-Language Consistency

All SDKs must produce identical decisions for identical policies and inputs.
