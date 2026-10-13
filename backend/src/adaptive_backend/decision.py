from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from .adaptive import AdaptiveEngine
from .causal_gap import CausalGapEngine
from .database import Database
from .learning import LearnerEngine
from .pedagogy import DynamicTeachingPolicy
from .proof_learning import ProofOfLearningService
from .retrieval import RetrievalService
from .rlm import HybridKnowledgeEngine


SemanticRequirement = Literal[
    "none", "explanation", "assessment_generation", "ambiguous_grading", "deep_research"
]


class DecisionFrame(BaseModel):
    """The single committed control decision for one learner transaction.

    All micro-decisions are projected into this object before any generative model
    is allowed to run. The model may render or judge bounded semantic content; it
    never owns learner state, source scope, difficulty, goal control, or policy.
    """

    model_config = ConfigDict(extra="forbid")

    decision_id: str = Field(default_factory=lambda: str(uuid4()))
    target_concept_id: str
    target_difficulty: float = Field(ge=0.0, le=1.0)
    action: str
    learner_reason: str
    learner_intent: str = "answer"

    diagnosis: dict[str, Any] = Field(default_factory=dict)
    adaptive: dict[str, Any] = Field(default_factory=dict)
    causal: dict[str, Any] = Field(default_factory=dict)
    proof_learning: dict[str, Any] = Field(default_factory=dict)
    sovereignty: dict[str, Any] = Field(default_factory=dict)
    teaching_policy: dict[str, Any] = Field(default_factory=dict)

    source_hits: list[dict[str, Any]] = Field(default_factory=list)
    source_mode: str = "rag"
    research_synthesis: str | None = None
    research_subqueries: list[str] = Field(default_factory=list)
    research_calls_used: int = 0
    learner_query: str = ""
    external_advisory: str | None = None

    semantic_tier: Literal[0, 1, 2, 3] = 0
    semantic_requirement: SemanticRequirement = "none"
    model_call_budget: int = Field(default=0, ge=0, le=4)
    selected_question_id: str | None = None

    context: dict[str, Any] = Field(default_factory=dict)
    reason_codes: list[str] = Field(default_factory=list)
    invariants: list[dict[str, Any]] = Field(default_factory=list)
    summary: str = ""

    @property
    def assistance_level(self) -> int:
        return int(self.sovereignty.get("assistance_level", 0) or 0)

    @property
    def evidence_dimension(self) -> str:
        return str(self.sovereignty.get("evidence_dimension") or "acquisition")


class DecisionKernel:
    """Unified deterministic control plane with bounded semantic escalation.

    This replaces the old orchestrator/faculty graph. A transaction performs one
    state read, one causal projection, one policy evaluation, one source decision,
    and emits one DecisionFrame. Generative AI sits strictly downstream.
    """

    EXPLICIT_INTENT_ACTIONS = {
        "ask_question": "explain",
        "need_explanation": "explain",
        "example": "worked_example",
        "repeat": "explain",
        "practice": "practice",
        "skip": "summarize",
        "slow_down": "explain",
    }

    def __init__(
        self,
        db: Database,
        learner: LearnerEngine,
        adaptive: AdaptiveEngine,
        retrieval: RetrievalService,
        knowledge: HybridKnowledgeEngine,
        causal_gaps: CausalGapEngine,
        pedagogy_policy: DynamicTeachingPolicy,
        proof_learning: ProofOfLearningService,
    ):
        self.db = db
        self.learner = learner
        self.adaptive_engine = adaptive
        self.retrieval = retrieval
        self.knowledge = knowledge
        self.causal_gaps = causal_gaps
        self.pedagogy_policy = pedagogy_policy
        self.proof_learning = proof_learning

    def forensics(
        self,
        *,
        user_id: str,
        case_owner_user_id: str | None = None,
        subject_id: str | None = None,
        max_cases: int = 6,
        persist: bool = True,
    ) -> dict[str, Any]:
        report = self.causal_gaps.analyze(
            user_id=user_id,
            case_owner_user_id=case_owner_user_id,
            subject_id=subject_id,
            max_cases=max_cases,
            persist=persist,
        )
        report["decision_trace"] = {
            "controller": "DecisionKernel",
            "kind": "deterministic_causal_projection",
            "model_calls": 0,
        }
        return report

    def plan(
        self,
        *,
        user_id: str,
        content_user_id: str,
        subject_id: str,
        concept_id: str,
        requested_mode: str,
        query: str,
        course_id: str | None = None,
        learner_intent: str = "answer",
        session_state: dict[str, Any] | None = None,
        session_goal: str | None = None,
        external_advisory: str | None = None,
    ) -> DecisionFrame:
        session_state = session_state or {}
        reason_codes: list[str] = []

        # 1) State + adaptive difficulty: deterministic only.
        diagnosis_obj = self.learner.diagnose(user_id, concept_id)
        adaptive_obj = self.adaptive_engine.recommend_next(
            user_id=user_id,
            subject_id=subject_id,
            concept_id=concept_id,
            diagnosis=diagnosis_obj,
        )
        diagnosis = diagnosis_obj.model_dump(mode="json")
        adaptive = adaptive_obj.model_dump(mode="json")
        target = str(adaptive.get("target_concept_id") or concept_id)
        difficulty = float(adaptive.get("target_difficulty", 0.5))

        # 2) Causal projection: deterministic and read-only.
        causal = self.causal_gaps.analyze(
            user_id=user_id,
            case_owner_user_id=content_user_id,
            subject_id=subject_id,
            max_cases=4,
            persist=False,
        )
        cases = list(causal.get("cases") or [])
        supported_cases = [case for case in cases if not bool(case.get("abstained"))]
        # The subject-wide projection above is informational. The cause that steers
        # the action and the teaching program must describe the concept actually
        # being taught, not whichever gap ranks highest elsewhere in the subject.
        scoped = self.causal_gaps.analyze(
            user_id=user_id,
            case_owner_user_id=content_user_id,
            subject_id=subject_id,
            max_cases=2,
            persist=False,
            concept_ids=[target, concept_id],
        )
        scoped_supported = {
            str(case.get("target_concept_id")): case
            for case in (scoped.get("cases") or [])
            if not bool(case.get("abstained"))
        }
        chosen_case = scoped_supported.get(target) or scoped_supported.get(concept_id)
        cause = str(chosen_case.get("cause_type") or "") if chosen_case else ""
        diagnosis["causal"] = {
            "headline": (causal.get("summary") or {}).get("headline"),
            "cases": cases[:4],
            "supported_case_count": len(supported_cases),
        }
        if cause:
            diagnosis["causal_cause_type"] = cause

        # 3) Base action from evidence, then explicit learner intent wins for this turn.
        action, learner_reason = self._base_action(
            diagnosis=diagnosis,
            causal_cause=cause,
            requested_mode=requested_mode,
        )
        explicit = self.EXPLICIT_INTENT_ACTIONS.get(learner_intent)
        if explicit:
            action = explicit
            learner_reason = self._intent_reason(learner_intent)
            reason_codes.append(f"INTENT_{learner_intent.upper()}")

        # First study turn teaches before testing when evidence is absent/weak.
        turn_count = int(session_state.get("turn_count", 0) or 0)
        previous_action = str((session_state.get("current_move") or {}).get("action") or "")
        if (
            requested_mode == "study"
            and turn_count == 0
            and not previous_action
            and learner_intent == "answer"
            and action in {"practice", "reassess", "ask"}
            and diagnosis.get("recommended_action") in {"insufficient_evidence", "practice", None}
        ):
            action = "explain"
            learner_reason = "Beginning with grounded teaching before collecting independent evidence."
            reason_codes.append("TEACH_FIRST_PRIOR")

        # 4) Cognitive sovereignty: minimum sufficient assistance.
        proof_state = self.proof_learning.get(
            user_id=user_id, subject_id=subject_id, concept_id=target
        )
        recent_failures = self.proof_learning.recent_failure_count(
            user_id=user_id, subject_id=subject_id, concept_id=target
        )
        sovereignty_obj = self.proof_learning.sovereignty(
            requested_action=action,
            learner_intent=learner_intent,
            proof_state=proof_state,
            recent_failures=recent_failures,
        )
        # Minimum-assistance policy may shape autonomous teaching, but it must
        # not silently override an explicit learner request such as "explain".
        if learner_intent == "answer":
            action = sovereignty_obj.action
        sovereignty = {
            "assistance_level": sovereignty_obj.assistance_level,
            "assistance_label": sovereignty_obj.assistance_label,
            "evidence_dimension": sovereignty_obj.evidence_dimension,
            "reason": sovereignty_obj.reason,
            "recent_failures": recent_failures,
        }

        # 5) Retrieval + depth classification are deterministic. The DecisionKernel
        # never invokes a model. If deeper source work is warranted, it records a
        # semantic escalation request for the downstream coprocessor.
        probe = self.knowledge.probe(
            user_id=content_user_id,
            subject_id=subject_id,
            concept_id=target,
            query=query or target,
            course_id=course_id,
        )
        source_hits = list(probe.hits)
        source_mode = "deep_candidate" if probe.deep_required else "rag"
        if probe.deep_required:
            reason_codes.append(f"SOURCE_{probe.reason.upper()}")

        # 6) Dynamic pedagogy policy evaluates once from the complete state.
        policy_context: dict[str, Any] = {
            "mode": requested_mode,
            "learner_intent": learner_intent,
            "course_scoped": bool(course_id),
            "previous_action": previous_action,
            "turn_count": turn_count,
            "goal_depth": len(session_state.get("goal_stack") or []),
            "goal": session_goal,
            "source_roles": list(dict.fromkeys(
                str(hit.get("source_role") or "unclassified") for hit in source_hits[:12]
            )),
            "visual_assets": any(
                str(hit.get("content_type") or "").lower() in {"image", "diagram", "figure", "video_frame"}
                or "figure" in str(hit.get("citation_location") or "").lower()
                for hit in source_hits[:12]
            ),
            "proof_learning": {
                "acquisition": proof_state.get("acquisition"),
                "independent": proof_state.get("independent"),
                "transfer": proof_state.get("transfer"),
                "retention": proof_state.get("retention"),
                "assistance_gap": proof_state.get("assistance_gap"),
                "recommended_verification": proof_state.get("recommended_verification"),
            },
            "assistance_level": sovereignty_obj.assistance_level,
            "evidence_dimension": sovereignty_obj.evidence_dimension,
        }
        capsule = session_state.get("context_capsule") or {}
        if isinstance(capsule, dict):
            for key in (
                "exam_mode", "time_budget", "available_time", "device", "interaction_mode",
                "environment", "self_reported_load", "revision_goal", "teacher_mode", "session_context",
            ):
                if key in capsule:
                    policy_context[key] = capsule[key]
        if learner_intent == "slow_down":
            policy_context["pace"] = "slower_smaller_steps"
        if course_id:
            counts = self._learning_ir_inventory(course_id, target)
            policy_context["learning_ir_types"] = sorted(counts)
            policy_context["learning_ir_counts"] = counts

        learner_state = {"diagnosis": diagnosis, "adaptive": adaptive}
        policy = self.pedagogy_policy.choose(
            user_id=content_user_id,
            subject_id=subject_id,
            concept_id=target,
            requested_action=action,
            mode=requested_mode,
            diagnosis=diagnosis,
            context=policy_context,
            learner_state=learner_state,
        )

        # 7) Decide whether semantics are needed at all. Question-bank reuse means
        # structured assessment turns cost zero model calls.
        selected_question_id = None
        if action == "diagnose":
            selected_question_id = diagnosis.get("selected_question_id")
        selected_question_id = selected_question_id or adaptive.get("selected_question_id")
        if not selected_question_id and action in {"ask", "practice", "reassess", "diagnose"}:
            row = self.db.fetchone(
                """SELECT question_id FROM questions WHERE subject_id=? AND primary_concept_id=?
                   ORDER BY ABS(difficulty-?) ASC, is_diagnostic ASC LIMIT 1""",
                (subject_id, target, difficulty),
            )
            if row:
                selected_question_id = str(row["question_id"])
                reason_codes.append("REUSE_VERIFIED_QUESTION")

        if not self.question_bank_allowed(course_id):
            selected_question_id = None
            reason_codes.append("COURSE_REQUIRES_SCOPED_ASSESSMENT")

        semantic_tier, semantic_requirement, model_budget = self._semantic_requirement(
            action=action,
            source_mode=source_mode,
            selected_question_id=selected_question_id,
        )
        if semantic_tier == 0:
            reason_codes.append("CODE_PATH")
        elif semantic_tier == 2:
            reason_codes.append("GENERATION_REQUIRED")
        elif semantic_tier == 3:
            reason_codes.append("DEEP_RESEARCH_ESCALATION")

        invariants = self._invariants(
            target=target,
            difficulty=difficulty,
            course_id=course_id,
            source_hits=source_hits,
            semantic_tier=semantic_tier,
            model_budget=model_budget,
        )

        summary = (
            f"DecisionKernel committed {action} for {target} at difficulty {difficulty:.3f}; "
            f"semantic tier T{semantic_tier}, model budget {model_budget}."
        )
        return DecisionFrame(
            target_concept_id=target,
            target_difficulty=difficulty,
            action=action,
            learner_reason=learner_reason,
            learner_intent=learner_intent,
            diagnosis=diagnosis,
            adaptive=adaptive,
            causal=causal,
            proof_learning=proof_state,
            sovereignty=sovereignty,
            teaching_policy=policy,
            source_hits=source_hits,
            source_mode=source_mode,
            research_synthesis=None,
            research_subqueries=[],
            research_calls_used=0,
            learner_query=query,
            external_advisory=external_advisory,
            semantic_tier=semantic_tier,
            semantic_requirement=semantic_requirement,
            model_call_budget=model_budget,
            selected_question_id=selected_question_id,
            context=policy_context,
            reason_codes=reason_codes,
            invariants=invariants,
            summary=summary,
        )

    def question_bank_allowed(self, course_id: str | None) -> bool:
        if not course_id:
            return True
        course = self.db.fetchone("SELECT course_kind FROM courses WHERE course_id=?", (course_id,))
        if not course:
            return False
        row = self.db.fetchone("SELECT policy_json FROM source_constitutions WHERE course_id=?", (course_id,))
        if row:
            policy = self.db.loads(row["policy_json"], {})
            return isinstance(policy, dict) and policy.get("external_sources_allowed") is True
        return course["course_kind"] != "class"

    def _learning_ir_inventory(self, course_id: str, concept_id: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for row in self.db.fetchall(
            "SELECT object_type,metadata_json FROM learning_ir_objects WHERE course_id=?", (course_id,)
        ):
            metadata = self.db.loads(row["metadata_json"], {})
            linked = {str(value) for value in (metadata.get("concept_ids") or [])}
            if concept_id not in linked:
                continue
            key = str(row["object_type"])
            counts[key] = counts.get(key, 0) + 1
        return counts

    @staticmethod
    def _base_action(*, diagnosis: dict[str, Any], causal_cause: str, requested_mode: str) -> tuple[str, str]:
        action = "practice"
        reason = "The current concept is ready for another targeted check."
        recommended = diagnosis.get("recommended_action")
        if recommended == "ask_diagnostic":
            action = "diagnose"
            reason = "Checking one prerequisite before changing the challenge."
        elif recommended == "teach":
            action = "explain"
            reason = "One earlier idea looks unstable, so the next move is an explanation."
        elif recommended == "reassess":
            action = "reassess"
            reason = "The concept improved and now needs a fresh verification."
        elif requested_mode == "review":
            action = "reassess"
            reason = "Review mode verifies what still holds without restarting the topic."

        if causal_cause == "prerequisite" and action in {"explain", "diagnose", "practice"}:
            return "prerequisite_rewind", "Evidence points to a prerequisite blocker, so OVAEL will repair it and return to the parent goal."
        if causal_cause == "misconception" and action in {"explain", "practice"}:
            return "contrast", "Evidence supports a competing mental model, so OVAEL will contrast the two before reassessing."
        if causal_cause == "retention" and action == "explain":
            return "reassess", "The concept was learned before; OVAEL will test retrieval before re-teaching it from scratch."
        return action, reason

    @staticmethod
    def _intent_reason(intent: str) -> str:
        return {
            "ask_question": "Answering the learner's current question before continuing the goal.",
            "need_explanation": "Re-teaching the idea before asking for another independent attempt.",
            "example": "Constructing an example for this turn; later outcomes decide whether similar programs are reused.",
            "repeat": "Reconstructing the concept with a different teaching program, not a fixed style preset.",
            "practice": "The learner explicitly requested independent practice.",
            "skip": "Compressing the current idea while preserving the parent goal.",
            "slow_down": "Reducing step size for this turn only; future pacing remains evidence-driven.",
        }.get(intent, "Continue the current evidence-driven teaching program.")

    @staticmethod
    def _semantic_requirement(*, action: str, source_mode: str, selected_question_id: str | None) -> tuple[int, SemanticRequirement, int]:
        # Structured checks are resolved before any research escalation. Reusing a
        # verified item stays T0 even if the learner's query wording looked complex.
        if action in {"ask", "practice", "reassess", "diagnose"}:
            if selected_question_id:
                return 0, "none", 0
            return 2, "assessment_generation", 2
        if action in {"explain", "hint", "contrast", "worked_example", "prerequisite_rewind", "summarize"}:
            if source_mode == "deep_candidate":
                # One bounded research-planning call + one final teaching call.
                # Intermediate synthesis is intentionally removed from live turns.
                return 3, "deep_research", 2
            return 2, "explanation", 1
        return 0, "none", 0

    @staticmethod
    def _invariants(
        *, target: str, difficulty: float, course_id: str | None,
        source_hits: list[dict[str, Any]], semantic_tier: int, model_budget: int,
    ) -> list[dict[str, Any]]:
        return [
            {"check": "single_state_owner", "ok": True, "detail": "DecisionKernel is read-only; MemoryCurator commits evidence."},
            {"check": "difficulty_bounds", "ok": 0.0 <= difficulty <= 1.0, "value": difficulty},
            {"check": "target_present", "ok": bool(target)},
            {"check": "course_scope", "ok": (not course_id) or all(bool(h.get("source_id")) for h in source_hits)},
            {"check": "bounded_ai", "ok": model_budget <= 2 or semantic_tier == 3, "budget": model_budget},
            {"check": "ai_cannot_commit_mastery", "ok": True},
        ]
