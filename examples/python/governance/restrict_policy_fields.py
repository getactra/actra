"""
Governance Example
Restrict Policy Fields

This example demonstrates how Actra governance policies can restrict
which fields operational policies are allowed to reference.

Governance policies validate operational policies at compile time.

In this example:

• Governance allows policies to reference only `snapshot.fraud_flag`
• The operational policy attempts to reference `action.amount`
• Compilation fails because the rule violates the governance policy
"""

from actra import Actra


# ------------------------------------------------------------
# 1. Schema
# ------------------------------------------------------------

schema_yaml = """
version: 1

actions:
  refund:
    fields:
      amount: number

actor:
  fields:
    role: string

snapshot:
  fields:
    fraud_flag: boolean
    membership_active: boolean
"""

# ------------------------------------------------------------
# 2. Operational Policy (violates governance)
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: refund_rule
    scope:
      action: refund
    when:
      all:  
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 100
        - subject:
            domain: snapshot
            field: membership_active # This rule violates governance 
          operator: equals
          value:
            literal: True
    effect: allow
"""

# ------------------------------------------------------------
# 3. Governance Policy
# ------------------------------------------------------------

governance_yaml = """
version: 1

governance:
  rules:
    - id: restrict_fields
      select:
        where:
          effect: allow
      must:
        allowed_fields:
          - snapshot.fraud_flag
          - action.amount
      error: "Policies may only reference fraud_flag & action.amount"
"""


# ------------------------------------------------------------
# 4. Compile with governance
# ------------------------------------------------------------

print("\nCompiling policy with governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)
    print("Policy compiled successfully")

except Exception as e:
    print("Governance violation detected")
    print(e)