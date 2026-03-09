from pathlib import Path
from os import PathLike
from typing import Optional, Dict, Any, Union
# Rust binding
from .actra import PyActra as _RustActra

ActionInput = Dict[str, Any]
Decision = Dict[str, Any]
PathType = Union[str, PathLike]

class Policy:
    """
    Compiled policy object.
    """

    def __init__(self, engine: _RustActra):
        self._engine = engine

    # ------------------------------------------------------------------
    # Runtime API
    # ------------------------------------------------------------------

    def evaluate(self, context: ActionInput) -> Decision:
        """
        Evaluate a policy decision.

        Expected input shape:
        {
            "action": {...},
            "actor": {...},
            "snapshot": {...}
        }
        """
        try:
            return self._engine.evaluate(context)
        except Exception as e:
            raise RuntimeError(f"Actra evaluation failed: {e}") from e

    def policy_hash(self) -> str:
        """
        Returns deterministic policy hash.
        """
        return self._engine.policy_hash()
    
    def __repr__(self) -> str:
        return f"Policy(policy_hash={self.policy_hash()})"


class Actra:
    """
    Public Python SDK wrapper for the Rust-based Actra engine.

    Responsibilities:
        - Developer ergonomics
        - File loading
        - Abstraction over Rust binding
    """

    @staticmethod
    def from_strings(
        schema_yaml: str,
        policy_yaml: str,
        governance_yaml: Optional[str] = None,
    ) -> Policy:
        """
        Initialize Actra directly from YAML strings.
        Suitable for testing and dynamic usage.
        """
        engine = _RustActra(schema_yaml, policy_yaml, governance_yaml)
        return Policy(engine)
    
    @staticmethod
    def from_files(
        schema_path: PathType,
        policy_path: PathType,
        governance_path: Optional[PathType] = None,
    ) -> Policy:
        """
        Initialize Actra from YAML files.
        """
        schema_file = Path(schema_path)
        if not schema_file.is_file():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        policy_file = Path(policy_path)
        if not policy_file.is_file():
            raise FileNotFoundError(f"Policy file not found: {policy_path}") 
        
        schema_yaml = schema_file.read_text(encoding="utf-8")
        policy_yaml = policy_file.read_text(encoding="utf-8")

        governance_yaml = None
        if governance_path is not None:
            governance_file = Path(governance_path)
            if not governance_file.is_file():
                raise FileNotFoundError(f"Governance file not found: {governance_path}") 
            governance_yaml = governance_file.read_text(encoding="utf-8")

        engine = _RustActra(schema_yaml, policy_yaml, governance_yaml)
        return Policy(engine)

    @staticmethod
    def compiler_version() -> str:
        """
        Returns compiler version string from Rust core.
        """
        return _RustActra.compiler_version()
