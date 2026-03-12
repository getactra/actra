class ActraError(Exception):
    """
    Base exception for all Actra-related errors

    All exceptions raised by the Actra Python SDK inherit from
    `ActraError`. Applications integrating Actra may catch this
    exception to handle any Actra failure generically

    Example:

        try:
            refund(amount=5000)
        except ActraError as e:
            logger.error("Actra failure", exc_info=e)

    Specific subclasses provide additional context depending on
    the failure type (for example policy evaluation errors)
    """
    pass


class ActraPolicyError(ActraError):
    """
    Exception raised when an Actra policy blocks an operation

    This error is raised by the `ActraRuntime.admit` decorator
    when a policy decision results in a `"block"` effect

    The exception includes structured information describing
    the decision and evaluation context to assist debugging,
    logging and API responses

    Attributes:
        action_type:
            The action name evaluated by the policy

        decision:
            Decision dictionary returned by the policy engine
            Example:
                {
                    "effect": "block",
                    "rule_id": "support_limit"
                }

        context:
            Full evaluation context used during policy execution:
                {
                    "action": {...},
                    "actor": {...},
                    "snapshot": {...}
                }
    Example:

        try:
            refund(amount=2000)
        except ActraPolicyError as e:
            print("Blocked by rule:", e.rule_id)
            print(e.context)

    This structured information allows Actra to integrate cleanly
    with APIs, AI agents, logging systems and monitoring tools
    """

    def __init__(self, action_type, decision, context):
        """
        Initialize a policy error

        Args:
            action_type:
                The action evaluated by the policy

            decision:
                Decision returned by the policy engine

            context:
                Evaluation context containing the action,
                actor and snapshot domains
        """
        self.action_type = action_type
        self.decision = decision
        self.context = context

        rule = decision.get("matched_rule")

        if rule:
            message = f"Actra policy blocked action '{action_type}' (rule: {rule})"
        else:
            message = f"Actra policy blocked action '{action_type}'"

        super().__init__(message)
    
    @property
    def matched_rule(self):
        """
        Return the identifier of the rule that blocked the action.

        Returns:
            The rule identifier if available, otherwise ``None``
        """
        return self.decision.get("matched_rule")
    
    def to_dict(self):
        """
        Return a structured representation of the error

        This method is useful when integrating Actra with APIs,
        logging systems, or monitoring tools

        Example:

            except ActraPolicyError as e:
                logger.warning("Policy blocked", extra=e.to_dict())

        Returns:
            Dictionary containing the action, decision and context
        """
        return {
            "action": self.action_type,
            "decision": self.decision,
            "context": self.context,
        }

    def __repr__(self):
        """
        Return a developer-friendly representation of the error

        The representation includes the action type and decision
        data to simplify debugging in logs and interactive sessions
        """
        return (
            f"ActraPolicyError("
            f"action_type={self.action_type!r}, "
            f"decision={self.decision!r})"
        )