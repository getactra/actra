from typing import Dict, Any, Union, Callable, Tuple
from os import PathLike

Action = Dict[str, Any]
Actor = Dict[str, Any]
Snapshot = Dict[str, Any]
Decision = Dict[str, Any]
PathType = Union[str, PathLike]
ActionInput = Dict[str, Any]  # {"action": Action, "actor": Actor, "snapshot": Snapshot}
Context = Any
EvaluationContext = Dict[str, Any]

ActionBuilder = Callable[[str, Tuple[Any, ...], Dict[str, Any], Context], Action]
ActorResolver = Callable[[Context], Actor]
SnapshotResolver = Callable[[Context], Snapshot]
ActionResolver = Callable[[str, Tuple[Any, ...], Dict[str, Any], Context], Action]
ContextResolver = Callable[[Tuple, Dict[str, Any]], Context]
ActionTypeResolver = Callable[[Callable, Tuple, Dict[str, Any]], str]