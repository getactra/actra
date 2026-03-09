from actra import PyActra


# -----------------------------
# 1. Define Schema
# -----------------------------
schema_yaml = """
version: 1

actions:
  refund:
    fields:
      type: string
      amount: number

actor:
  fields:
    id: string
    role: string

snapshot:
  fields:
    fraud_flag: boolean
    remaining_credit_limit: number
"""


# -----------------------------
# 2. Define Policy
# -----------------------------
policy_yaml = """
version: 1

rules:
  - id: block_if_fraud
    scope:
      global: true
    when:
      subject:
        domain: snapshot
        field: fraud_flag
      operator: equals
      value:
        literal: true
    effect: block

  - id: block_large_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: greater_than
      value:
        literal: 1000
    effect: block
"""


# -----------------------------
# 3. Initialize Engine
# -----------------------------
actra = PyActra(schema_yaml, policy_yaml)

hash = actra.policy_hash()
print("Policy Hash:", hash )
print("-" * 60)
assert hash is not None
print("Pass: Policy Hash works" )

# -----------------------------
# 4. Case 1 — Fraud Flag True
# -----------------------------
result1 = actra.evaluate({
    "action": {"type": "refund", "amount": 200},
    "actor": {"id": "agent_1", "role": "support"},
    "snapshot": {
        "fraud_flag": True,
        "remaining_credit_limit": 5000
    }
})

print("Case 1 (fraud=True):")
print(result1)
print("-" * 60)
# Assert that the 'effect' key has the value 'block'
assert result1['effect'] == 'block'
print("Pass: Case 1 (fraud=True) works")

# -----------------------------
# 5. Case 2 — Large Refund
# -----------------------------
result2 = actra.evaluate({
    "action": {"type": "refund", "amount": 1500},
    "actor": {"id": "agent_1", "role": "support"},
    "snapshot": {
        "fraud_flag": False,
        "remaining_credit_limit": 5000
    }
})

print("Case 2 (amount > 1000):")
print(result2)
print("-" * 60)
# Assert that the 'effect' key has the value 'block'
assert result2['effect'] == 'block'
print("Pass: Case 2 (amount > 1000) works")


# -----------------------------
# 6. Case 3 — Allowed
# -----------------------------
result3 = actra.evaluate({
    "action": {"type": "refund", "amount": 200},
    "actor": {"id": "agent_1", "role": "support"},
    "snapshot": {
        "fraud_flag": False,
        "remaining_credit_limit": 5000
    }
})

print("Case 3 (normal refund):")
print(result3)
print("-" * 60)
# Assert that the 'effect' key has the value 'allow'
assert result3['effect'] == 'allow'
print("Pass: Case 3 (normal refund) works")
