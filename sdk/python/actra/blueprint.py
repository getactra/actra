# Last Updated v0.5.2
from typing import Any, Dict, Callable, List, Optional, Tuple

# ----------------------
# Types
# ----------------------
Action = Dict[str, Any]
Actor = Dict[str, Any]
Snapshot = Dict[str, Any]
Decision = Dict[str, Any]
Context = Any
EvaluationContext = Dict[str, Any]
ActionInput = Dict[str, Any]  # {"action": Action, "actor": Actor, "snapshot": Snapshot}

# Resolver Types
ActionBuilder = Callable[[str, Tuple[Any, ...], Dict[str, Any], Context], Action]
ActorResolver = Callable[[Context], Actor]
SnapshotResolver = Callable[[Context], Snapshot]
ActionResolver = Callable[[str, Tuple[Any, ...], Dict[str, Any], Context], Action]
ContextResolver = Callable[[Tuple, Dict[str, Any]], Context]
ActionTypeResolver = Callable[[Callable, Tuple, Dict[str, Any]], str]

# ----------------------
# Errors
# ----------------------
class ActraError(Exception):
    pass

class ActraPolicyError(ActraError):
    decision: Decision
    context: EvaluationContext
    matched_rule: Optional[str]

class ActraSchemaError(ActraError):
    pass

# ----------------------
# Decision Event
# ----------------------
class DecisionEvent:
    action: Action
    decision: Decision
    context: EvaluationContext
    timestamp: Any
    duration_ms: float

    # Properties
    @property
    def effect(self) -> str: ...
    
    @property
    def matched_rule(self) -> Optional[str]: ...
    
    @property
    def is_blocked(self) -> bool: ...
    
    @property
    def action_type(self) -> str: ...

# ----------------------
# Policy
# ----------------------
class Policy: #--
    def evaluate(self, context: ActionInput) -> Decision: ...
    def evaluate_action(self, action: Action, actor: Actor, snapshot: Snapshot) -> Decision: ...
    def explain(self, context: ActionInput) -> Decision: ...
    def policy_hash(self) -> str: ...
    def assert_effect(self, context: ActionInput, expected: str) -> Decision: ...

# ----------------------
# Actra Loader
# ----------------------
class Actra: #--
    @staticmethod
    def from_strings(schema_yaml: str, policy_yaml: str, governance_yaml: Optional[str] = None) -> Policy: ...
    
    @staticmethod
    def from_files(schema_path: str, policy_path: str, governance_path: Optional[str] = None) -> Policy: ...
    
    @staticmethod
    def from_directory(directory: str) -> Policy: ...
    
    @staticmethod
    def compiler_version() -> str: ...

# ----------------------
# Actra Runtime
# ----------------------
class ActraRuntime:
    policy: Policy

    # Resolver registration
    def set_actor_resolver(self, fn: ActorResolver) -> None: ...
    def set_snapshot_resolver(self, fn: SnapshotResolver) -> None: ...
    def set_action_resolver(self, fn: ActionResolver) -> None: ...
    def set_context_resolver(self, fn: ContextResolver) -> None: ...
    def set_action_type_resolver(self, fn: ActionTypeResolver) -> None: ...
    def set_decision_observer(self, fn: Callable[[DecisionEvent], None]) -> None: ...

    # Context resolution
    def resolve_actor(self, ctx: Context = None) -> Actor: ...
    def resolve_snapshot(self, ctx: Context = None) -> Snapshot: ...
    def resolve_context(self, args: Tuple, kwargs: Dict[str, Any]) -> Optional[Context]: ...
    def resolve_action_type(self, func: Callable, args: Tuple, kwargs: Dict[str, Any], action_type: Optional[str]) -> str: ...

    # Action helpers
    def allow(self, action_type: str, ctx: Context = None, **fields) -> bool: ...
    def block(self, action_type: str, ctx: Context = None, **fields) -> bool: ...
    def action(self, action_type: str, **fields) -> Action: ...
    def build_action(self, action_type: str, args: Tuple, kwargs: Dict[str, Any], ctx: Context = None, func: Optional[Callable] = None, fields: Optional[List[str]] = None, action_builder: Optional[ActionBuilder] = None) -> Action: ...
    def build_context(self, action: Action, ctx: Context = None) -> EvaluationContext: ...

    # Policy evaluation
    def evaluate(self, action: Action, ctx: Context = None) -> Decision: ...
    def explain(self, action: Action, ctx: Context = None) -> Decision: ...
    def explain_call(self, func: Callable, *args, action_type: Optional[str] = None, ctx: Optional[Context] = None, **kwargs) -> Decision: ...

    # Decorators
    def admit(self, action_type: Optional[str] = None, fields: Optional[List[str]] = None, action_builder: Optional[ActionBuilder] = None) -> Callable: ...
    def audit(self, action_type: Optional[str] = None, fields: Optional[List[str]] = None, action_builder: Optional[ActionBuilder] = None) -> Callable: ...