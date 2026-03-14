"""
Governance Example
Require Fraud Protection Rule

This example demonstrates how governance policies can require
refund policies to include fraud protection logic.

In many organizations, refund systems must always check
fraud indicators before approving refunds.

Governance ensures that operational policies cannot remove
this protection.

In this example:

• Governance requires at least one rule referencing `snapshot.fraud_flag`
• The operational policy omits this rule
• Compilation fails because the required fraud protection rule is missing
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
"""


# ------------------------------------------------------------
# 2. Operational Policy (missing fraud rule)
# ------------------------------------------------------------

policy_yaml = """
version: 1

rules:
  - id: allow_small_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: less_than
      value:
        literal: 500
    effect: allow
"""


# ------------------------------------------------------------
# 3. Governance Policy
# ------------------------------------------------------------

governance_yaml = """
version: 1

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
      error: "Refund policies must include fraud protection logic"
"""


# ------------------------------------------------------------
# 4. Compile
# ------------------------------------------------------------

print("\nCompiling policy with governance rules...\n")

try:
    policy = Actra.from_strings(schema_yaml, policy_yaml, governance_yaml)
    print("Policy compiled successfully")

except Exception as e:
    print("Governance violation detected")
    print(e)
