from pathlib import Path
from typing import Optional
# Rust binding
from .actra import PyActra as _RustActra
from .types import Action, Actor, Snapshot, Decision, ActionInput, PathType

class Policy:
    """
    Compiled Actra policy.

    A `Policy` represents a fully compiled admission control policy produced
    by the Actra compiler. It wraps the Rust policy engine and exposes a
    Python-friendly runtime API for evaluating decisions.

    A policy evaluates structured input containing three domains:

        action   : operation being requested
        actor    : identity of the caller
        snapshot : external system state

    Example context:

        {
            "action": {"type": "refund", "amount": 200},
            "actor": {"role": "support"},
            "snapshot": {"fraud_flag": False}
        }

    Policies are deterministic and side-effect free.
    """

    def __init__(self, engine: _RustActra):
        """
        Internal constructor.

        Users should not instantiate `Policy` directly.
        Instead use the `Actra` loader helpers such as:

            Actra.from_strings(...)
            Actra.from_files(...)
            Actra.from_directory(...)
        """
        self._engine = engine

    # ------------------------------------------------------------------
    # Runtime API
    # ------------------------------------------------------------------

    def evaluate(self, context: ActionInput) -> Decision:
        """
        Evaluate a policy decision.

        Args:
            context:
                Dictionary containing the evaluation context with
                the following structure:
                {
                    "action": {...},
                    "actor": {...},
                    "snapshot": {...}
                }

        Returns:
            Decision dictionary produced by the policy engine.
            Example result:
                {
                    "effect": "allow"
                }
            or
                {
                    "effect": "block",
                    "rule_id": "block_large_refund"
                }
        """
        return self._engine.evaluate(context)
    
    def evaluate_action(
        self,
        action: Action,
        actor: Actor,
        snapshot: Snapshot,
    ) -> Decision:
        """
        Evaluate a policy decision using separate domain inputs.

        This is a convenience wrapper around `evaluate()` that allows
        callers to provide action, actor, and snapshot independently.

        Args:
            action:
                Action object describing the requested operation.

                Example:
                    {"type": "refund", "amount": 200}

            actor:
                Actor identity performing the action.

                Example:
                    {"role": "support"}

            snapshot:
                External system state relevant to the decision.

                Example:
                    {"fraud_flag": False}

        Returns:
            Policy decision dictionary.
        """
        return self._engine.evaluate({
            "action": action,
            "actor": actor,
            "snapshot": snapshot
        })
    
    def explain(self, context: ActionInput) -> Decision:
        """
        Evaluate a decision and print a human-readable explanation.

        This method is intended for debugging, experimentation, and
        interactive use (for example in notebooks or REPL sessions).

        It prints:
            - action input
            - actor input
            - snapshot input
            - final policy decision
        Args:
            context:
                Evaluation context passed to the policy engine.
        Returns:
            The policy decision dictionary.
        """

        result = self.evaluate(context)

        print("\nActra Decision")
        print("-" * 14)

        for section in ["action", "actor", "snapshot"]:
            data = context.get(section, {})
            print(f"\n{section.capitalize()}:")
            for k, v in data.items():
                print(f"  {k}: {v}")

        print("\nResult:")
        for k, v in result.items():
            print(f"  {k}: {v}")

        return result

    def policy_hash(self) -> str:
        """
        Return a deterministic hash representing the compiled policy.

        The hash uniquely identifies the compiled schema, policy rules.

        This is useful for:

            - policy versioning
            - auditing
            - caching
            - debugging

        Returns:
            A stable string hash for the compiled policy.
        """
        return self._engine.policy_hash()
    
    def __repr__(self) -> str:
        try:
            h = self.policy_hash()
        except Exception:
            h = "unknown"

        return f"Policy(hash={h})"
    
    def __str__(self) -> str:
        return self.__repr__()
    
    def _repr_html_(self):
        """
        Rich HTML representation for Jupyter notebooks.

        Displays a compact policy summary including the policy hash.
        """
        try:
            policy_hash = self.policy_hash()
        except Exception:
            policy_hash = "unknown"

        return f"""
        <div style="font-family: monospace">
            <b>Actra Policy</b><br>
            <b>Hash:</b> {policy_hash}
        </div>
        """
    
    def assert_effect(self, context: ActionInput, expected: str) -> Decision:
        """
        Assert that a policy evaluation returns the expected effect.

        This helper is useful in unit tests and CI pipelines to verify
        that policies behave as expected.

        Example:

            policy.assert_effect(context, "block")

        Args:
            context:
                Evaluation context.

            expected:
                Expected policy effect ("allow" or "block").

        Returns:
            The policy decision if the assertion succeeds.

        Raises:
            AssertionError:
                If the actual policy effect differs from the expected value.
        """
        result = self.evaluate(context)
        actual = result.get("effect")

        if actual != expected:
            raise AssertionError(
                f"Policy assertion failed.\n"
                f"Expected effect: {expected}\n"
                f"Actual effect:   {actual}\n"
                f"Context: {context}"
            )
        return result

class Actra:
    """
    Public Python SDK wrapper for the Actra compiler and policy engine.

    This class provides convenience helpers for loading and compiling
    policies from various sources such as:

        - YAML strings
        - YAML files
        - policy directories

    The resulting compiled policy is returned as a `Policy` object,
    which can be used for runtime evaluation.
    """

    @staticmethod
    def from_strings(
        schema_yaml: str,
        policy_yaml: str,
        governance_yaml: Optional[str] = None,
    ) -> Policy:
        """
        Compile an Actra policy directly from YAML strings.

        This method is useful for:

            - testing
            - dynamic policy generation
            - examples

        Args:
            schema_yaml:
                YAML string defining the schema.

            policy_yaml:
                YAML string defining policy rules.

            governance_yaml:
                Optional YAML string defining governance rules.

        Returns:
            A compiled `Policy` object ready for evaluation.
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
        Compile an Actra policy from YAML files.

        Args:
            schema_path:
                Path to the schema YAML file.

            policy_path:
                Path to the policy YAML file.

            governance_path:
                Optional path to the governance YAML file.

        Returns:
            A compiled `Policy` object.
        """
        schema_file = Path(schema_path)
        if not schema_file.is_file():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        policy_file = Path(policy_path)
        if not policy_file.is_file():
            raise FileNotFoundError(f"Policy file not found: {policy_path}") 
        
        schema_yaml: str = schema_file.read_text(encoding="utf-8")
        policy_yaml: str = policy_file.read_text(encoding="utf-8")

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
        Return the Actra compiler version.

        This corresponds to the underlying Rust engine version.

        Returns:
            Version string of the Actra compiler.
        """
        return _RustActra.compiler_version()

    @staticmethod
    def from_directory(directory: PathType) -> Policy:
        """
        Compile a policy from a directory structure.

        The directory must contain:

            schema.yaml
            policy.yaml

        Optionally:

            governance.yaml

        Args:
            directory:
                Directory containing Actra policy files.

        Returns:
            A compiled `Policy` object.
        """
        directory = Path(directory)

        if not directory.is_dir():
            raise FileNotFoundError(f"Directory not found: {directory}")

        schema_path = directory / "schema.yaml"
        policy_path = directory / "policy.yaml"
        governance_path = directory / "governance.yaml"

        governance = governance_path if governance_path.exists() else None

        return Actra.from_files(
            schema_path,
            policy_path,
            governance
        )

__all__ = ["Policy", "Actra"]