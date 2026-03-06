from .policy import ActionGate, Policy

load_policy_from_file = ActionGate.from_files
load_policy_from_string = ActionGate.from_strings
compiler_version = ActionGate.compiler_version

__all__ = [
    "ActionGate",
    "Policy",
    "load_policy_from_file",
    "load_policy_from_string",
    "compiler_version"
]