from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from .types import Action, Decision, EvaluationContext


@dataclass
class DecisionEvent:
    """
    Structured event emitted after every policy evaluation

    This object represents the outcome of a policy evaluation and
    can be consumed by logging systems, metrics collectors, or
    audit pipelines

    Attributes:
        action:
            The action object evaluated by the policy engine

        decision:
            Decision returned by the policy engine

        context:
            Full evaluation context including action, actor and snapshot

        timestamp:
            Time when the evaluation occurred

        duration_ms:
            Time taken to evaluate the policy in milliseconds
    """

    action: Action
    decision: Decision
    context: EvaluationContext

    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: float = 0.0

    @property
    def effect(self) -> str:
        """Return policy effect (`allow`, `block` or `require_approval`)"""
        return self.decision.get("effect")

    @property
    def matched_rule(self) -> Optional[str]:
        """Return rule identifier if a rule triggered."""
        return self.decision.get("matched_rule")

    @property
    def is_blocked(self) -> bool:
        """Return True if the policy blocked the action."""
        return self.effect == "block"

    @property
    def action_type(self) -> str:
        """Return the evaluated action type."""
        return self.action.get("type", "unknown")
    