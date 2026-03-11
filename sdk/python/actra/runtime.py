from typing import Tuple, Optional, List
from functools import wraps
import inspect
from .types import (
    Action,
    Actor,
    Snapshot,
    Decision,
    EvaluationContext,
    Context,
    ActionBuilder,
    ActorResolver,
    SnapshotResolver,
    ActionResolver,
)

class ActraRuntime:
    """
    Runtime execution environment for Actra policies.

    `ActraRuntime` orchestrates policy evaluation by resolving runtime
    context and invoking the compiled policy engine.

    It acts as the bridge between application code and the policy engine.

    Responsibilities:

        - Resolving actor identity
        - Resolving external system state (snapshot)
        - Constructing action objects
        - Building evaluation context
        - Invoking policy evaluation
        - Enforcing admission control via decorators

    Typical usage:

        policy = Actra.from_strings(schema_yaml, policy_yaml)
        runtime = ActraRuntime(policy)

        runtime.set_actor_resolver(lambda ctx: {"role": "support"})
        runtime.set_snapshot_resolver(lambda ctx: {"fraud_flag": False})

        @runtime.admit()
        def refund(amount: int):
            ...

    Runtime is framework-neutral and can be used with:

        - normal Python functions
        - API frameworks
        - background workers
        - AI agent tool systems
    """

    def __init__(self, policy):
        """
        Create a runtime bound to a compiled policy.

        Args:
            policy:
                A compiled `Policy` instance produced by the Actra compiler.
        """
        self.policy = policy

        self._actor_resolver: Optional[ActorResolver] = None
        self._snapshot_resolver: Optional[SnapshotResolver] = None
        self._action_resolver: Optional[ActionResolver] = None

    # Resolvers
    def set_actor_resolver(self, fn: ActorResolver) -> None:
        """
        Register a function that resolves the actor identity.

        The actor represents the entity performing the action
        (for example a user, service, or agent).

        Args:
            fn:
                Function with signature:

                    fn(ctx) -> dict

                Example:
                    runtime.set_actor_resolver(
                        lambda ctx: {"role": "support"}
                    )
        """
        self._actor_resolver = fn

    def set_snapshot_resolver(self, fn: SnapshotResolver) -> None:
        """
        Register a function that resolves external system state.

        Snapshot data represents system state that policies
        may use to make decisions.

        Args:
            fn:
                Function with signature:

                    fn(ctx) -> dict

                Example:

                    runtime.set_snapshot_resolver(
                        lambda ctx: {"fraud_flag": False}
                    )
        """
        self._snapshot_resolver = fn

    def set_action_resolver(self, fn: ActionResolver) -> None:
        """
        Register a custom action builder.

        This overrides the default action construction logic.

        Args:
            fn:
                Function with signature:

                    fn(action_type, args, kwargs, ctx) -> dict

        Example:

            runtime.set_action_resolver(
                lambda action, args, kwargs, ctx: {
                    "type": action,
                    "amount": kwargs["amount"]
                }
            )
        """
        self._action_resolver = fn

    # Context helpers
    def resolve_actor(self, ctx: Context) -> Actor:
        """
        Resolve the actor domain.

        Args:
            ctx:
                Optional execution context supplied by integrations.

        Returns:
            Actor dictionary used in policy evaluation.
        """
        if self._actor_resolver:
            return self._actor_resolver(ctx)
        return {}

    def resolve_snapshot(self, ctx: Context) -> Snapshot:
        """
        Resolve the snapshot domain.

        Args:
            ctx:
                Optional execution context supplied by integrations.

        Returns:
            Snapshot dictionary used in policy evaluation.
        """
        if self._snapshot_resolver:
            return self._snapshot_resolver(ctx)
        return {}
    
    # Action construction

    def build_action(self, 
                     action_type: str,
                     args: Tuple,
                     kwargs: dict,
                     ctx: Context,
                     fields: Optional[List[str]]=None,
                     builder: Optional[ActionBuilder]=None
    ) -> Action:
        """
        Construct an Actra action object.

        This method converts application inputs into a structured
        action dictionary used for policy evaluation.

        Args:
            action_type:
                Logical action name (typically the function name).

            args:
                Positional arguments passed to the function.

            kwargs:
                Keyword arguments passed to the function.

            ctx:
                Optional execution context provided by integrations.

            fields:
                Optional list of keyword fields to include.

            builder:
                Optional custom action builder function.

        Returns:
            Dictionary representing the action.

        Example result:

            {
                "type": "refund",
                "amount": 200
            }
        """
        if builder:
            return builder(action_type, args, kwargs, ctx)
        if self._action_resolver:
            return self._action_resolver(action_type, args, kwargs, ctx)
        if fields:
            action_fields = {k: kwargs[k] for k in fields if k in kwargs}
        else:
            # Default: include kwargs but ignore internal parameters
            action_fields = {
                k: v
                for k, v in kwargs.items()
                if not k.startswith("_")
            }
        return {
            "type": action_type,
            **action_fields
        }
    
    # Context assembly

    def build_context(self, action: Action, ctx: Context = None) -> EvaluationContext :
        """
        Build the full evaluation context.

        The context combines the three policy domains:

            action
            actor
            snapshot

        Args:
            action:
                Action dictionary produced by `build_action`.

            ctx:
                Optional execution context.

        Returns:
            Context dictionary passed to the policy engine.
        """
        actor = self.resolve_actor(ctx)
        snapshot = self.resolve_snapshot(ctx)
        return {
            "action": action,
            "actor": actor,
            "snapshot": snapshot
        }

    # Policy evaluation
    def evaluate(self, action: Action, ctx: Context = None) -> Decision:
        """
        Evaluate a policy decision for an action.

        Args:
            action:
                Action dictionary describing the operation.

            ctx:
                Optional execution context passed to resolvers.

        Returns:
            Decision dictionary returned by the policy engine.
        """
        context = self.build_context(action, ctx)
        return self.policy.evaluate(context)
    
    # Admission control decorator

    def admit(
        self,
        action_type: Optional[str] = None,
        fields: Optional[List[str]] = None, 
        action_builder: Optional[ActionBuilder] = None):
        """
        Protect a function with Actra admission control.

        The decorator intercepts the function call, evaluates the policy,
        and blocks execution if the decision effect is `"block"`.

        IMPORTANT:
            By default, Actra uses the Python function name as the action
            type when constructing the policy action.

            Example:

                @runtime.admit()
                def support_refund(amount):
                    ...

            This produces an action:

                {"type": "support_refund", ...}

            If the policy expects a different action name, you must override
            it using `action_type`.

            Example:

                @runtime.admit(action_type="refund")
                def support_refund(amount):
                    ...

            This maps the function to the policy action `"refund"`.

        Args:
            action_type:
                Optional action name override. If not provided, the function
                name will be used as the action type.

            fields:
                Optional list of keyword arguments to include in the action
                object. Useful when functions contain parameters that should
                not be exposed to the policy engine.

            action_builder:
                Optional custom function used to construct the action object.

                Signature:

                    builder(action_type, args, kwargs, ctx) -> dict

        Usage examples:

            Default mapping:

                @runtime.admit()
                def refund(amount):
                    ...

            Field filtering:

                @runtime.admit(fields=["amount"])
                def refund(amount, currency):
                    ...

            Custom action builder:

                @runtime.admit(action_builder=my_builder)
                def refund(...):
                    ...
        """
        def decorator(func):
            # Default action type is the Python function name
            act = action_type or func.__name__
            is_async = inspect.iscoroutinefunction(func)

            def evaluate_policy(args, kwargs):
                # Runtime does not extract context from function arguments.
                ctx = None

                action = self.build_action(
                    act,
                    args,
                    kwargs,
                    ctx,
                    fields=fields,
                    builder=action_builder,
                )

                result = self.evaluate(action, ctx)

                if result.get("effect") == "block":
                    rule = result.get("rule_id")

                    if rule:
                        raise PermissionError(
                            f"Actra policy blocked action '{act}' (rule: {rule})"
                        )
                    else:
                        raise PermissionError(
                            f"Actra policy blocked action '{act}'"
                        )

            if is_async:
                @wraps(func)
                async def wrapper(*args, **kwargs):
                    evaluate_policy(args, kwargs)
                    return await func(*args, **kwargs)
            else:
                @wraps(func)
                def wrapper(*args, **kwargs):
                    evaluate_policy(args, kwargs)
                    return func(*args, **kwargs)
            return wrapper
        return decorator


__all__ = ["ActraRuntime"]