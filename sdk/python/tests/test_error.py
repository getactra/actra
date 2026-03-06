import actiongate

try:
    actiongate.load_policy_from_file("missing.yaml", "policy.yaml")
except FileNotFoundError as e:
    print(e)