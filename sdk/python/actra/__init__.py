from .policy import Actra, Policy

load_policy_from_file = Actra.from_files
load_policy_from_string = Actra.from_strings
compiler_version = Actra.compiler_version

__all__ = [
    "Actra",
    "Policy",
    "load_policy_from_file",
    "load_policy_from_string",
    "compiler_version"
]