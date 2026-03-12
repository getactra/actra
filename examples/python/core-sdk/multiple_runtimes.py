"""
Multiple Runtimes Example

This example demonstrates that multiple Actra runtimes
can coexist in the same application.

Each runtime can enforce a different policy.
"""

from actra import Actra, ActraPolicyError
from actra.runtime import ActraRuntime


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
# 2. Policy A — support users
# ------------------------------------------------------------

support_policy_yaml = """
version: 1

rules:
  - id: support_limit
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 1000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "support"
    effect: block
"""


# ------------------------------------------------------------
# 3. Policy B — admin users
# ------------------------------------------------------------

admin_policy_yaml = """
version: 1

rules:
  - id: admin_limit
    scope:
      action: refund
    when:
      all:
        - subject:
            domain: action
            field: amount
          operator: greater_than
          value:
            literal: 10000
        - subject:
            domain: actor
            field: role
          operator: equals
          value:
            literal: "admin"
    effect: block
"""

# ------------------------------------------------------------
# 4. Compile policies
# ------------------------------------------------------------

support_policy = Actra.from_strings(schema_yaml, support_policy_yaml)
admin_policy = Actra.from_strings(schema_yaml, admin_policy_yaml)


# ------------------------------------------------------------
# 5. Create runtimes
# ------------------------------------------------------------

support_runtime = ActraRuntime(support_policy)
admin_runtime = ActraRuntime(admin_policy)


support_runtime.set_actor_resolver(lambda ctx: {"role": "support"})
support_runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})

admin_runtime.set_actor_resolver(lambda ctx: {"role": "admin"})
admin_runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})


# ------------------------------------------------------------
# 6. Protected functions
# ------------------------------------------------------------

# IMPORTANT:
# By default, the Actra decorator uses the Python function name
# as the action type when constructing the policy action.
#
# For example:
#     def support_refund()  : action.type = "support_refund"
#
# However, the policy in this example expects the action:
#
#     scope:
#       action: refund
#
# Therefore we override the action name using:
#
#     action_type="refund"
#
# This maps both functions to the same policy action.
#

@support_runtime.admit(action_type="refund")
def support_refund(amount: int):
    print(f"Support refund executed: {amount}")


@admin_runtime.admit(action_type="refund")
def admin_refund(amount: int):
    print(f"Admin refund executed: {amount}")


# ------------------------------------------------------------
# 7. Calls
# ------------------------------------------------------------

print("\nSupport runtime")

support_refund(amount=200)

try:
    support_refund(amount=5000)
except ActraPolicyError as e:
    print("Support refund blocked")
    print("Rule:",e.matched_rule)


print("\nAdmin runtime")

admin_refund(amount=5000)

try:
    admin_refund(amount=20000)
except ActraPolicyError as e:
    print("Admin refund blocked")
    print("Rule:",e.matched_rule)