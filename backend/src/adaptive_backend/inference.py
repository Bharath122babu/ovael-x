from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any


@dataclass(slots=True)
class InferenceCall:
    label: str
    route: str
    granted: bool
    index: int
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SemanticBudget:
    """Hard per-transaction ceiling for semantic/model invocations.

    Every semantic model call must reserve a slot here *before* calling a provider.
    The object is intentionally tiny and process-local: it protects one learner
    transaction, while durable request/idempotency logic remains elsewhere.
    """

    def __init__(self, max_calls: int, *, decision_id: str | None = None,
                 parent: "SemanticBudget | None" = None):
        if max_calls < 0:
            raise ValueError("max_calls must be >= 0")
        self.max_calls = int(max_calls)
        self.decision_id = decision_id
        self._used = 0
        self._calls: list[InferenceCall] = []
        self._lock = Lock()
        self._parent = parent

    def child(self, max_calls: int) -> "SemanticBudget":
        """Sub-budget enforcing a local ceiling and sharing the root ledger.

        The child cannot increase its parent's global capacity. Every provider
        invocation appears in the parent's snapshot, including denied calls.
        """
        return SemanticBudget(max_calls, decision_id=self.decision_id, parent=self)

    @property
    def used(self) -> int:
        return self._used

    @property
    def remaining(self) -> int:
        own = max(0, self.max_calls - self._used)
        return min(own, self._parent.remaining) if self._parent is not None else own

    def take(self, label: str, *, route: str) -> bool:
        """Reserve one call. Returns False without incrementing when exhausted."""
        with self._lock:
            if self._used >= self.max_calls:
                self._calls.append(
                    InferenceCall(label=label, route=route, granted=False, index=self._used + 1)
                )
                return False
            if self._parent is not None and not self._parent.take(label, route=route):
                self._calls.append(InferenceCall(label=label, route=route, granted=False, index=self._used + 1))
                return False
            self._used += 1
            self._calls.append(
                InferenceCall(label=label, route=route, granted=True, index=self._used)
            )
            return True

    def snapshot(self) -> dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "max_calls": self.max_calls,
            "used": self._used,
            "remaining": self.remaining,
            "calls": [
                {
                    "label": call.label,
                    "route": call.route,
                    "granted": call.granted,
                    "index": call.index,
                    "timestamp": call.timestamp,
                }
                for call in self._calls
            ],
        }
