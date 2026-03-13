from typing import Tuple, Optional, List, Dict, Any, Callable
from functools import wraps
import inspect
from datetime import datetime
import time

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
    ContextResolver,
    ActionTypeResolver,
)
from .errors import ActraPolicyError
from .policy import Policy
from .events import DecisionEvent

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

    def __init__(self, policy: Policy) -> None:
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
        self._context_resolver: Optional[ContextResolver] = None
        self._action_type_resolver: Optional[ActionTypeResolver] = None
        self._decision_observer: Optional[Callable[[DecisionEvent], None]] = None
    
    # Resolvers
    def set_decision_observer(self, fn: Callable[[DecisionEvent], None]) -> None:
        """
        Register an observer invoked after every policy evaluation

        The observer receives a `DecisionEvent` object containing
        the evaluated action, decision result, and evaluation context

        This mechanism allows developers to integrate Actra with
        logging, metrics, auditing or monitoring systems

        Example:

            def observer(event):
                print(event.effect, event.matched_rule)

            runtime.set_decision_observer(observer)
        """
        self._decision_observer = fn

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
    
    def set_context_resolver(self, fn: ContextResolver) -> None:
        """
        Register a function that extracts execution context
        from function arguments.

        Signature:
            fn(args, kwargs) -> ctx
        """
        self._context_resolver = fn
    
    def set_action_type_resolver(self, fn: ActionTypeResolver) -> None:
        """
        Register a function that determines the action type dynamically.

        Signature:
            fn(func, args, kwargs) -> str
        """
        self._action_type_resolver = fn

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

    def resolve_context(self, args: Tuple, kwargs: Dict[str, Any]) -> Optional[Context]:
        """
        Resolve execution context from function inputs

        Integrations (such as MCP, API frameworks or agents) may provide
        context objects through a custom resolver

        Args:
            args:
                Positional arguments passed to the function

            kwargs:
                Keyword arguments passed to the function

        Returns:
            Context object used during policy evaluation, or None.
        
        Context resolution order:

            1. Explicit context resolver
            2. `ctx` keyword argument
            3. No context
        """
        # Custom resolver (integration configured)
        if self._context_resolver:
            return self._context_resolver(args, kwargs)
        
        # Automatic detection
        if "ctx" in kwargs:
            return kwargs["ctx"]
        
        return None
    
    def resolve_action_type(
        self,
        func: Callable,
        args: Tuple,
        kwargs: Dict[str, Any],
        action_type: Optional[str]
    ) -> str:
        """
        Determine the action type used for policy evaluation

        The action type may be:

            1. Explicitly provided via the decorator
            2. Determined by a configured action type resolver
            3. Derived from the function name

        Args:
            func:
                The protected function

            args:
                Positional arguments passed to the function

            kwargs:
                Keyword arguments passed to the function

            action_type:
                Optional action type provided to the decorator

        Returns:
            The resolved action type string
        """
        if action_type:
            return action_type

        if self._action_type_resolver:
            return self._action_type_resolver(func, args, kwargs)

        return func.__name__


    # Emit decison events
    def _emit_decision_event(self, decision, action, context, duration_ms):
        if not self._decision_observer:
            return

        event = DecisionEvent(
            action=action,
            decision=decision,
            context=context,
            duration_ms=duration_ms
        )

        self._decision_observer(event)

    def _bind_arguments(self, func: Callable, args: Tuple, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Bind positional and keyword arguments to function parameters.

        Returns a dictionary mapping parameter names to values.
        """
        if func is None:
            return dict(kwargs)
        
        sig = inspect.signature(func)
        bound = sig.bind_partial(*args, **kwargs)
        bound.apply_defaults()
        return dict(bound.arguments)
    
    def allow(self, action_type: str, ctx: Context = None, **fields) -> bool:
        """
        Convenience helper that returns True if the policy allows the action.
        """
        action = self.action(action_type, **fields)
        decision = self.evaluate(action, ctx)

        return decision.get("effect") == "allow"
    
    def block(self, action_type: str, ctx: Context = None, **fields) -> bool:
        """
        Convenience helper that returns True if the policy blocks the action.
        """

        action = self.action(action_type, **fields)
        decision = self.evaluate(action, ctx)

        return decision.get("effect") == "block"
    
    # Action construction
    def action(self, action_type: str, **fields) -> Action:
        """
        Construct a policy action using runtime schema validation.

        This helper is intended for direct programmatic policy checks
        without needing a Python function signature.

        Example:

        runtime.action("deploy", env="prod")
        """

        return {
            "type": action_type,
            **fields
        }

    def build_action(self, 
                     action_type: str,
                     args: Tuple,
                     kwargs: Dict[str, Any],
                     ctx: Context,
                     func: Optional[Callable] = None,
                     fields: Optional[List[str]]=None,
                     action_builder: Optional[ActionBuilder]=None
    ) -> Action:
        """
        Construct an Actra action object

        This method converts application inputs into the structured
        action dictionary used for policy evaluation

        The `func` parameter is used for signature introspection.
        Actra inspects the function signature to determine which
        parameters should be included in the action object

        This prevents internal parameters (such as request context,
        framework metadata, etc.) from leaking into the policy engine

        The following is resolution priority :
        1. action_builder override
        2. runtime action_resolver override
        3. explicit fields parameter
        4. function signature filtering
            4.1 Refer schema
        5. fallback kwargs

        Args:
            action_type:
                Logical action name used for policy evaluation

            args:
                Positional arguments supplied to the function

            kwargs:
                Keyword arguments supplied to the function

            ctx:
                Optional execution context used by resolvers
            
            func:
                Optional Function whose signature defines the allowed action fields.
                The function is **not executed**. It is only inspected to
                determine valid parameter names

                When provided, Actra inspects the function parameters
                to determine which fields should be included in the
                action object.

                Integrations that do not have a handler function
                (for example APIs, MCP tools, message queues) may
                pass `None`.

            fields:
                Optional list restricting which keyword arguments are
                included in the action object

            action_builder:
                Optional custom function used to build the action

        Returns:
            Action dictionary used for policy evaluation

        Example result:

            {
                "type": "refund",
                "amount": 200
            }
        """
        if action_builder:
            return action_builder(action_type, args, kwargs, ctx)
        if self._action_resolver:
            return self._action_resolver(action_type, args, kwargs, ctx)
        if fields:
            action_fields = {k: kwargs[k] for k in fields if k in kwargs}
        else:
            # Default: include kwargs but ignore internal parameters
            if func:
                sig = inspect.signature(func)
                func_fields = set(sig.parameters)
                
                schema_fields = None
                schema = self.policy._schema

                if schema:
                    actions = schema.get("actions", {})
                    action_schema = actions.get(action_type)
                    if action_schema:
                        schema_fields = set(action_schema.get("fields", {}).keys())

                if schema_fields:
                    allowed_fields = func_fields & schema_fields
                else:
                    allowed_fields = func_fields

                if args:    
                    bound = sig.bind_partial(*args, **kwargs)
                    bound.apply_defaults()
                    bound_args = dict(bound.arguments)
                else:
                    bound_args = dict(kwargs)

                action_fields = {
                    k: v
                    for k, v in bound_args.items()
                    if k in allowed_fields
                }
            else:
                # No function available — trust provided kwargs API/MCP/Queue etc
                action_fields = dict(kwargs)
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

    def _enforce_policy(
        self,
        func: Callable,
        args: Tuple,
        kwargs: Dict[str, Any],
        action_type: Optional[str],
        fields: Optional[List[str]],
        action_builder: Optional[ActionBuilder]
    ) -> None:
        """
        Evaluate the Actra policy before executing the wrapped function

        This method performs the full admission control flow:

            1. Resolve execution context
            2. Resolve the action type
            3. Build the action object
            4. Evaluate the policy decision
            5. Raise `ActraPolicyError` if the decision blocks execution

        This method is used internally by the `admit` decorator
        """
        bound_args = self._bind_arguments(func, args, kwargs)
        ctx = self.resolve_context(args, bound_args)
        
        # RULE:
        # Once _bind_arguments() is called,
        # positional args must not be used again.
        #         
        act = self.resolve_action_type(func, args, bound_args, action_type)
        action = self.build_action(
            act,
            (),         #Positional args no more needed
            bound_args,
            ctx,
            func=func,
            fields=fields,
            action_builder=action_builder
        )
        context = self.build_context(action, ctx)
        result = self.evaluate(action, ctx)

        if result.get("effect") == "block":
            raise ActraPolicyError(
                action_type=act,
                decision=result,
                context=context
            )


    def explain(self, action: Action, ctx: Context = None) -> Decision:
        """
        Evaluate a policy decision and print a human-readable explanation

        This method behaves similarly to `evaluate()` but delegates to
        `Policy.explain()` so that the full evaluation context and decision
        are displayed.

        It is useful for:

            - debugging policies
            - interactive experimentation
            - understanding why a decision was made

        Args:
            action:
                Action dictionary describing the operation

            ctx:
                Optional execution context passed to resolvers

        Returns:
            The policy decision dictionary
        """

        context = self.build_context(action, ctx)
        return self.policy.explain(context)
    
    def explain_call(
        self,
        func: Callable,
        *args,
        action_type: Optional[str] = None,
        ctx: Optional[Any] = None,
        **kwargs
    ) -> Decision:
        """
        Explain the policy decision for a function call without executing it.

        This helper reconstructs the policy evaluation flow used by the
        `@runtime.admit` decorator and prints a human-readable explanation
        of the resulting decision.

        Unlike the decorator, this method **does not execute the function**.
        It only simulates the policy evaluation using the provided inputs.

        This is particularly useful for:

            - debugging policy behavior
            - understanding why a rule triggered
            - testing policy inputs interactively
            - verifying runtime resolvers
            - exploring policy decisions without modifying application code

        The method performs the following steps:

            1. Resolve execution context from the function arguments
            2. Determine the action type
            3. Build the Actra action object
            4. Construct the full evaluation context
            5. Invoke `Policy.explain()` to display the decision

        Action Type Resolution
        ----------------------

        The action type used for evaluation is determined in the following order:

            1. Explicit `action_type` provided to `explain_call`
            2. A configured `action_type_resolver`
            3. The function name

        This allows `explain_call` to work even when the function name does not
        match the action name defined in the schema

        Args:
            func:
                The function associated with the action being evaluated.
                The function is **not executed**. It is only inspected to
                determine the action structure

            *args:
                Positional arguments that would be passed to the function

            action_type:
                Optional explicit action name used for policy evaluation
                This is useful when the function name differs from the
                action defined in the schema
            
            ctx:
                Optional execution context object used by runtime resolvers
                
                The context is passed to the configured actor and snapshot
                resolvers to construct the evaluation context

                Example:

                    runtime.set_actor_resolver(
                        lambda ctx: {"role": ctx.role}
                    )

                If not provided explicitly, Actra will attempt to resolve
                the context from the function arguments.

            **kwargs:
                Keyword arguments that would be passed to the function.

        Returns:
            Decision dictionary returned by the policy engine.

        Example:

            runtime.explain_call(refund, amount=1500)

        Example with explicit action mapping:

            runtime.explain_call(
                scale,
                action_type="scale_service",
                service="search-api",
                replicas=20,
                environment="staging",
                ctx=operator
            )

        Example output:

            Actra Decision
            --------------

            Action:
                type: refund
                amount: 1500

            Actor:
                role: support

            Snapshot:
                fraud_flag: False

            Result:
                effect: block
                matched_rule: block_large_refund
        """

        bound_args = self._bind_arguments(func, args, kwargs)

        if ctx is None:
            ctx = self.resolve_context(args, bound_args)
        
        # RULE:
        # Once _bind_arguments() is called,
        # positional args must not be used again.
        #   

        act = self.resolve_action_type(func, args, bound_args, action_type)

        action = self.build_action(
            act,
            (),         #Positional args no more needed
            bound_args,
            ctx,
            func=func
        )

        return self.explain(action, ctx)

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
            Decision dictionary returned by the policy engine and emits DecisionEvent
        """
        context = self.build_context(action, ctx)
        start = time.perf_counter()

        decision = self.policy.evaluate(context)

        duration_ms = (time.perf_counter() - start) * 1000

        self._emit_decision_event(decision, action, context, duration_ms)

        return decision
    
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
            is_async = inspect.iscoroutinefunction(func)
            if is_async:
                @wraps(func)
                async def wrapper(*args, **kwargs):
                    self._enforce_policy(
                        func,
                        args,
                        kwargs,
                        action_type,
                        fields,
                        action_builder
                    )
                    return await func(*args, **kwargs)
            else:
                @wraps(func)
                def wrapper(*args, **kwargs):
                    self._enforce_policy(
                        func,
                        args,
                        kwargs,
                        action_type,
                        fields,
                        action_builder
                    )
                    return func(*args, **kwargs)
            return wrapper
        return decorator

    # Audit Policy 
    def audit(
        self,
        action_type: Optional[str] = None,
        fields: Optional[List[str]] = None,
        action_builder: Optional[ActionBuilder] = None
    ):
        """
        Observe policy decisions without enforcing them

        The `audit` decorator evaluates the policy before executing the
        function but never blocks execution, even if the policy decision
        is `"block"`

        This mode is useful for:

            - auditing policy violations
            - monitoring rule triggers
            - debugging policy behavior
            - gradual policy rollout

        Policy decisions still emit `DecisionEvent` objects through the
        runtime observer mechanism

        Example:

            @runtime.audit(action_type="refund")
            def refund(amount):
                ...

        Args:
            action_type:
                Optional override for the action name

            fields:
                Optional list of keyword arguments to include in the action

            action_builder:
                Optional custom function used to construct the action object

        Returns:
            Decorated function that evaluates policy but never blocks execution
        """

        def decorator(func):
            is_async = inspect.iscoroutinefunction(func)

            if is_async:
                @wraps(func)
                async def wrapper(*args, **kwargs):
                    try:
                        self._enforce_policy(
                            func,
                            args,
                            kwargs,
                            action_type,
                            fields,
                            action_builder
                        )
                    except ActraPolicyError:
                        # Ignore block in audit mode
                        pass
                    return await func(*args, **kwargs)
            else:
                @wraps(func)
                def wrapper(*args, **kwargs):
                    try:
                        self._enforce_policy(
                            func,
                            args,
                            kwargs,
                            action_type,
                            fields,
                            action_builder
                        )
                    except ActraPolicyError:
                        # Ignore block in audit mode
                        pass
                    return func(*args, **kwargs)
            return wrapper
        return decorator


__all__ = ["ActraRuntime"]