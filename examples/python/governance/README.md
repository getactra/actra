# Governance Examples

These examples demonstrate how Actra governance policies control
**how operational policies themselves are defined**.

Governance policies validate operational policies at compile time,
ensuring that critical safety rules cannot be bypassed.

Organizations can use governance to enforce constraints such as:

- requiring specific safety rules
- preventing unsafe rule patterns
- limiting the number of certain rule types
- restricting which fields policies may reference
- applying constraints only to specific actions

This allows a central platform or security team to define
organization-wide policy standards.

---

## Examples

### restrict_policy_fields.py

Demonstrates how governance can restrict which fields operational
policies are allowed to reference.

Policies referencing fields outside the approved list fail
compilation.

---

### require_fraud_protection_rule.py

Demonstrates how governance can require refund policies to include
fraud protection logic.

If the required rule is missing, the policy fails validation.

---

### limit_block_rules.py

Shows how governance can limit the number of block rules allowed
in a policy.

This helps prevent overly restrictive policies.

---

### forbid_global_block_rules.py

Demonstrates how governance can forbid unsafe rule patterns such
as global block rules.

---

### action_specific_governance.py

Shows how governance constraints can apply only to specific
actions.

Refund policies must include safety rules, while other actions
remain unrestricted.

---

### governance_skipped_when_action_not_present.py

Demonstrates that governance rules targeting a specific action
are skipped when the policy does not define rules for that action.

---

### enterprise_policy_governance.py

A comprehensive example showing how organizations can combine
multiple governance rules to enforce enterprise-wide safety
standards for operational policies.
