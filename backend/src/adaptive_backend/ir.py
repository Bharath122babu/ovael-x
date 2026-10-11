from __future__ import annotations

from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class TeachingPlanIR(BaseModel):
    """Canonical modality-independent teaching transaction.

    Cognitive faculties contribute evidence and proposals, X commits this object,
    and output adapters render it. The plan records *why this transaction was
    selected now* without turning any representation choice into a durable learner
    personality label.
    """

    model_config = ConfigDict(extra="forbid")

    teaching_plan_id: str = Field(default_factory=lambda: str(uuid4()))
    program_id: str = ""
    target_concept_id: str
    target_difficulty: float = Field(ge=0.0, le=1.0)
    action: str
    goal: str
    learner_reason: str

    representation_sequence: list[str] = Field(default_factory=list)
    organization: str = "adaptive"
    reasoning_form: str = "contextual"
    interaction: str = "guided"
    chunk_size: str = "standard"
    depth: str = "targeted"
    scaffolding: float = Field(default=0.0, ge=0.0, le=1.0)
    assessment_intent: str = "learning"
    source_strategy: str = "canonical_truth_plus_contextual_explanation"

    policy_state: str = "cold_start_dynamic"
    predicted_utility: float = Field(default=0.5, ge=0.0, le=1.0)
    uncertainty: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_weight: float = Field(default=0.0, ge=0.0)
    selection_reason: str = ""

    source_refs: list[str] = Field(default_factory=list)
    source_roles: list[str] = Field(default_factory=list)
    diagnosis: dict[str, Any] = Field(default_factory=dict)
    learner_state: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    goal_stack: list[dict[str, Any]] = Field(default_factory=list)
    alternatives: list[dict[str, Any]] = Field(default_factory=list)

    success_condition: str = "new independent evidence supports the target concept"
    repair_condition: str = "diagnostic evidence supports a prerequisite or misconception repair"
    return_condition: str = "repair goal is verified/recovered, then return to parent goal"

    @classmethod
    def build(
        cls,
        *,
        target_concept_id: str,
        target_difficulty: float,
        action: str,
        learner_reason: str,
        policy: dict[str, Any],
        citations: list[str],
        source_hits: list[dict[str, Any]],
        diagnosis: dict[str, Any],
        learner_state: dict[str, Any],
        context: dict[str, Any],
        goal_stack: list[dict[str, Any]] | None = None,
    ) -> "TeachingPlanIR":
        selected = dict(policy.get("selected") or {})
        return cls(
            program_id=str(selected.get("program_id") or ""),
            target_concept_id=target_concept_id,
            target_difficulty=target_difficulty,
            action=action,
            goal=f"Teach or verify {target_concept_id}",
            learner_reason=learner_reason,
            representation_sequence=[str(x) for x in selected.get("representation_sequence") or []],
            organization=str(selected.get("organization") or "adaptive"),
            reasoning_form=str(selected.get("reasoning_form") or "contextual"),
            interaction=str(selected.get("interaction") or "guided"),
            chunk_size=str(selected.get("chunk_size") or "standard"),
            depth=str(selected.get("depth") or "targeted"),
            scaffolding=float(selected.get("scaffolding") or 0.0),
            assessment_intent=str(selected.get("assessment_intent") or "learning"),
            source_strategy=str(selected.get("source_strategy") or "canonical_truth_plus_contextual_explanation"),
            policy_state=str(policy.get("policy_state") or "cold_start_dynamic"),
            predicted_utility=float(selected.get("predicted_utility") or 0.5),
            uncertainty=float(selected.get("uncertainty") if selected.get("uncertainty") is not None else 1.0),
            evidence_weight=float(selected.get("evidence_weight") or 0.0),
            selection_reason=str(selected.get("reason") or ""),
            source_refs=citations,
            source_roles=list(dict.fromkeys(str(h.get("source_role") or "unclassified") for h in source_hits[:8])),
            diagnosis=diagnosis,
            learner_state=learner_state,
            context=context,
            goal_stack=goal_stack or [],
            alternatives=[dict(x) for x in (policy.get("alternatives") or [])[:4]],
        )
