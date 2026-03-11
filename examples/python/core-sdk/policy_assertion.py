"""
Policy Assertion Example

Demonstrates how to validate policies in tests.
"""

from actra import Actra

#Make sure required folder exists
policy = Actra.from_directory("policy")

policy.assert_effect({
    "action": {"type": "refund", "amount": 200},
    "actor": {"role": "support"},
    "snapshot": {"fraud_flag": False}
}, "allow")

print("Policy test passed")