# Governance

Governance policies control **how operational policies themselves are defined and validated**.

While admission control evaluates policies at runtime, governance ensures that policies follow organizational safety standards before they are accepted.

Governance policies are evaluated **at compile time**, preventing unsafe or invalid policies from being deployed.

---

## Why Governance Matters

Operational policies control critical system behavior.

Without governance, policies themselves can become unsafe.

Examples of unsafe policy changes include:

* removing fraud protection rules
* adding overly broad block rules
* referencing unsafe system signals
* creating overly complex policies

Governance prevents these issues by validating policies before they are accepted.

---

## Governance Capabilities

Governance policies can enforce constraints such as:

* requiring specific safety rules
* forbidding unsafe rule patterns
* limiting the number of certain rule types
* restricting which fields policies may reference
* applying rules only to specific actions

These rules allow organizations to enforce consistent policy standards across services.

---

## Governance Model

The governance model adds a validation layer above operational policies.

```
governance policies
        ↓
validate operational policies
        ↓
admission control policies
        ↓
runtime decision enforcement
```

If an operational policy violates governance rules, compilation fails and the policy cannot be deployed.

---

## Example

A governance policy might require that refund policies always include fraud protection.

Example governance rule:

```yaml
governance:
  rules:
    - id: require_fraud_protection
      select:
        where:
          when:
            subject:
              domain: snapshot
              field: fraud_flag
      must:
        min_count: 1
```

If a refund policy does not include a fraud protection rule, compilation fails.

---

## Governance in Actra

Actra supports governance policies that validate operational policies during compilation.

This allows platform and security teams to enforce organization-wide policy standards.

Governance policies operate above admission control policies, ensuring that operational policies remain safe and compliant.

For practical examples, see:

* `examples/`
