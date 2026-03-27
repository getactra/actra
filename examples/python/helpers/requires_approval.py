from actra import Actra, ActraRuntime, ActraPolicyError

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
"""

# ------------------------------------------------------------
# 2. Policy
# ------------------------------------------------------------
policy_yaml = """
version: 1

rules:
  - id: large_refund_requires_approval
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: require_approval
"""

# ------------------------------------------------------------
# 3. Compile + runtime
# ------------------------------------------------------------
policy = Actra.from_strings(schema_yaml, policy_yaml)
runtime = ActraRuntime(policy)

runtime.set_actor_resolver(lambda ctx: {"role": "support"})

# ------------------------------------------------------------
# 4. Protected function
# ------------------------------------------------------------
@runtime.admit(action_type="refund")
def refund(amount: int):
    print(f"Refund executed: {amount}")

# ------------------------------------------------------------
# 5. Usage
# ------------------------------------------------------------

print("\n--- Normal refund ---")

if runtime.allow("refund", amount=200):
    refund(amount=200)


print("\n--- Requires approval ---")

amount = 2000

if runtime.requires_approval("refund", amount=amount):
    print(f"Refund of {amount} requires approval")


print("\n--- Direct execution (blocked) ---")

try:
    refund(amount=2000)
except ActraPolicyError as e:
    if e.decision["effect"] == "require_approval":
        print("Blocked: approval required")
        print("Rule:", e.decision.get("matched_rule"))