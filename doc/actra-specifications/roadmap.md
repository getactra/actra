# TODO – Policy Required Actions

## Overview

Actra currently supports the following decision effects:

* `allow`
* `block`
* `require_approval`

However, for advanced governance scenarios (especially AI agents and automated workflows), policies should be able to **describe what action must happen next** when a rule is triggered.

This feature introduces **Policy Required Actions**, allowing policies to return structured instructions such as:

* human approval
* MFA verification
* external tool execution
* additional validation steps

This enables Actra to support **policy-driven workflows** rather than simple allow/deny decisions.

---

# Example Policy

```yaml
rules:

  - id: high_value_refund

    when:
      action: refund
      amount > 1000

    effect: require_approval

    required_actions:
      - type: human_approval
        role: finance_manager
```

Example evaluation result:

```json
{
  "effect": "require_approval",
  "matched_rule": "high_value_refund",
  "required_actions": [
    {
      "type": "human_approval",
      "role": "finance_manager"
    }
  ]
}
```

---

# Implementation Plan

## 1. Rust Core – Decision Model

Extend the decision structure.

Current:

```rust
pub struct EvaluationResult {
    pub effect: Effect,
    pub matched_rule: Option<String>,
}
```

New:

```rust
pub struct EvaluationResult {
    pub effect: Effect,
    pub matched_rule: Option<String>,
    pub required_actions: Vec<RequiredAction>,
}
```

Define:

```rust
pub struct RequiredAction {
    pub action_type: String,
    pub params: HashMap<String, Value>,
}
```

Notes:

* Keep `RequiredAction` generic
* Do not hardcode approval or MFA logic
* Policies define semantics

---

## 2. Rust Compiler

Extend policy parsing to support:

```
required_actions
```

Compiler responsibilities:

* Parse `required_actions` from rule definitions
* Validate structure
* Attach actions to compiled rule representation

Example compiled rule:

```
CompiledRule
 ├─ conditions
 ├─ effect
 └─ required_actions
```

---

## 3. Rust Evaluation Engine

During rule match:

```
if rule matches:
    decision.effect = rule.effect
    decision.required_actions = rule.required_actions
```

No additional runtime logic is required.

The engine only **returns the instructions**.

---

## 4. Rust - Node Bridge

Ensure the Rust binding returns `required_actions` in the serialized decision.

Example JSON returned to Node:

```json
{
  "effect": "require_approval",
  "matched_rule": "high_value_refund",
  "required_actions": [
    { "type": "human_approval", "role": "finance_manager" }
  ]
}
```

---

## 5. Node SDK

Minimal changes required.

Extend the Decision type:

```ts
export interface RequiredAction {
  type: string
  [key: string]: any
}

export interface Decision {
  effect: "allow" | "block" | "require_approval"
  matched_rule?: string
  required_actions?: RequiredAction[]
}
```

Node runtime should **not interpret required actions**.

It simply forwards the result to the application.

---

# Usage Scenarios

This feature enables:

### Human-in-the-loop

```
refund > 1000
 require finance manager approval
```

### Security verification

```
transfer > 10000
 require MFA verification
```

### Tool execution

```
deploy_production
 require security scan
```

### AI agent governance

```
delete_database
 require human approval
```

---

# Design Principles

1. Engine remains **deterministic**
2. Required actions are **data only**
3. Runtime systems decide how to execute them
4. SDKs remain **thin wrappers**

---

# Status

Planned feature.

Implementation will begin in:

* Rust compiler
* Rust evaluation engine

SDK changes are minimal.


# TODO Actra WASM Browser Roadmap (Precompiled Policy Workflow)

## 1. Goal
- Ship Actra policies to the browser in a **precompiled binary format**
- Eliminate runtime YAML parsing to reduce WASM size and startup time
- Support deterministic, versioned, and cacheable policies

## 2. Workflow Overview
1. **Precompile Policies**
   - Convert schema + policy (+ optional governance) YAML files into a binary `.actra` format
   - CLI or Rust tool handles compilation
   - Happens once per policy update, not at runtime

2. **Serve Precompiled Policy**
   - Host `.actra` files on public folder or CDN
   - Use versioned filenames to manage caching and updates

3. **Load in Browser**
   - Fetch `.actra` binary as `Uint8Array`
   - Initialize Actra WASM engine from precompiled policy
   - Evaluate policies without runtime compilation

## 3. Benefits
- **Smaller WASM**: removes YAML parser and compiler
- **Faster startup**: only deserialization + evaluation
- **Deterministic**: precompiled policies are fixed and auditable
- **Edge-friendly**: minimal runtime footprint
- **Versioning & caching**: policy files can be hashed for safe updates

## 4. Optional Enhancements
- Support multiple precompiled policies and dynamic selection
- Hot-reloading in development environment
- Serve policies via CDN with cache headers for performance
- Include policy hashes in the runtime for integrity checks

## 5. Release Pipeline (Simplified)
1. Precompile policies: `actra compile --output policy-v1.actra`
2. Deploy `.actra` binaries along with application code instead of yaml policies