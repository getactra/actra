import actiongate

try:
    actiongate.load_policy_from_file("missing.yaml", "policy.yaml")
    raise AssertionError("Execption not raised")
except Exception as e:
    if isinstance(e, FileNotFoundError):
        print("Success:", e)
    else:
        raise