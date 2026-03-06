from _actiongate_core import PyActionGate

# Test 1 — Without Governance
# This should compile and evaluate normally.

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
  fields: {}

"""

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
        literal: 1000
    effect: allow
"""

print("=== Test: Without Governance ===")

gate = PyActionGate(schema_yaml, policy_yaml)

result = gate.evaluate({
    "action": {"amount": 500},
    "actor": {"role": "user"},
    "snapshot": {}
})

print(result)

assert result["effect"] == "allow"
print("PASS: Without governance works.")

# Test 2 — With Governance (Compile-Time Restriction)
# Example governance rule:
# Disallow effect: block globally
# So any policy using block should fail compilation.

governance_yaml = """
version: 1

governance:
  rules:
    - id: no_global_block

      applies_to:
        actions: ["refund"]   # optional

      select:
        where:
          effect: block
          scope:
            global: true

      must:
        forbid: true

      error: "Global block rules are not allowed."
"""

policy_with_block = """
version: 1

rules:
  - id: block_everything
    scope:
      global: true
    when:
      subject:
        domain: actor
        field: role
      operator: equals
      value:
        literal: "user"
    effect: block
"""

print("\n=== Test: With Governance (Should Fail) ===")

try:
    gate = PyActionGate(
        schema_yaml,
        policy_with_block,
        governance_yaml
    )
    print("ERROR: Governance violation not detected")
except Exception as e:
    print("PASS: Governance prevented compilation")
    print("Error:", str(e))

# Test 3 — Governance Present But Valid Policy
# Now use governance, but policy does not violate it.

print("\n=== Test: With Governance (Valid Policy) ===")

valid_policy = """
version: 1

rules:
  - id: allow_refund
    scope:
      action: refund
    when:
      subject:
        domain: action
        field: amount
      operator: less_than
      value:
        literal: 1000
    effect: allow
"""

gate = PyActionGate(
    schema_yaml,
    valid_policy,
    governance_yaml
)

result = gate.evaluate({
    "action": {"amount": 100},
    "actor": {"role": "user"},
    "snapshot": {}
})

print(result)

assert result["effect"] == "allow"
print("PASS: Governance allowed valid policy.")

