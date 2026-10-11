from __future__ import annotations

import json
import sqlite3
import math
import hashlib
from threading import RLock
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import NAMESPACE_URL, uuid4, uuid5

from pydantic import BaseModel, ConfigDict, Field

from .state_control import MemoryCurator
from .decision import DecisionFrame, DecisionKernel
from .subject_runtime import SubjectRuntimeFactory
from .semantic import SemanticCoprocessor
from .inference import SemanticBudget
from .assessment_evidence import AssessmentEvidenceEngine, AnswerSubmission, EvaluationResult
from .database import Database
from .memory import MemoryService
from .models import ModelGateway, ModelUnavailable
from .pedagogy import DynamicTeachingPolicy
from .proof_learning import ProofOfLearningService
from .io_runtime import ModalityRuntime
from .ir import TeachingPlanIR
from .schemas import DiagnosisResult, EvidenceEvent, ResponseBehavior, TutorRequest, TutorResponse
from .subjects import CodeReviewService


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class TeachingMove(BaseModel):
    model_config = ConfigDict(extra="forbid")

    move_id: str = Field(default_factory=lambda: str(uuid4()))
    action: Literal[
        "explain",
        "ask",
        "hint",
        "diagnose",
        "contrast",
        "worked_example",
        "practice",
        "prerequisite_rewind",
        "reassess",
        "summarize",
    ]
    target_concept_id: str
    target_difficulty: float = Field(ge=0.0, le=1.0)
    pedagogical_goal: str
    content: str
    answer_type: Literal["free_text", "mcq", "boolean", "numeric", "code", "diagram", "labelled_image", "oral", "handwritten", "long_answer", "short_answer", "flowchart", "mixed"] | None = None
    options: list[str] = Field(default_factory=list)
    required_modalities: list[str] = Field(default_factory=list)
    expected_evidence: str
    learner_reason: str
    citations: list[str] = Field(default_factory=list)
    validation_state: Literal["generated_validated", "generated_unvalidated", "fallback_validated", "explanation"]
    generated_item_id: str | None = None
    decision_trace: dict[str, Any] = Field(default_factory=dict)
    decision_frame: dict[str, Any] = Field(default_factory=dict)
    teaching_plan: dict[str, Any] = Field(default_factory=dict)
    output_intent: dict[str, Any] = Field(default_factory=dict)
    assistance_level: int = Field(default=0, ge=0, le=6)
    assistance_label: str = "independent attempt"
    evidence_dimension: Literal["acquisition", "independent", "transfer", "retention", "diagnostic"] = "acquisition"
    sovereignty_reason: str = ""
    content_status: Literal["generated", "source_excerpt", "unavailable", "assessment"] = "assessment"


class LearningSessionStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject_id: str
    concept_id: str
    course_id: str | None = None
    goal: str | None = Field(default=None, max_length=1000)
    mode: Literal["study", "practice", "review", "calibration"] = "study"
    source_client: Literal["web", "chatgpt", "claude", "mcp", "system"] = "web"
    context_capsule: dict[str, Any] = Field(default_factory=dict)


class LearningTurnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response: str = Field(default="", max_length=200_000)
    selected_option: int | None = Field(default=None, ge=0, le=20)
    numeric_value: float | None = None
    code: str | None = Field(default=None, max_length=200_000)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    hint_count: int = Field(default=0, ge=0, le=100)
    attempt_count: int = Field(default=1, ge=1, le=100)
    response_seconds: float | None = Field(default=None, ge=0.0, le=86_400)
    learner_intent: Literal[
        "answer", "ask_question", "need_explanation", "example", "repeat", "practice", "skip", "slow_down"
    ] = "answer"
    input_mode: Literal["text", "voice", "code", "image", "handwriting", "diagram", "mixed"] = "text"
    submission: AnswerSubmission | None = None


class TeachingService:
    """One pedagogical engine shared by OVAEL web and MCP surfaces."""

    def __init__(
        self,
        db: Database,
        memory: MemoryService,
        curator: MemoryCurator,
        models: ModelGateway,
        decision_kernel: DecisionKernel,
        code_service: CodeReviewService | None = None,
        subject_runtime: SubjectRuntimeFactory | None = None,
        semantic: SemanticCoprocessor | None = None,
        *,
        pedagogy_policy: DynamicTeachingPolicy | None = None,
        proof_learning: ProofOfLearningService | None = None,
        modality_runtime: ModalityRuntime | None = None,
        memory_mode: str = "local_first",
    ):
        self.db = db
        self.memory = memory
        self.curator = curator
        self.models = models
        self.decision = decision_kernel
        self.code = code_service
        self.subject_runtime = subject_runtime or SubjectRuntimeFactory(db)
        self.semantic = semantic or SemanticCoprocessor(models, self.subject_runtime, decision_kernel.knowledge)
        self.pedagogy_policy = pedagogy_policy or DynamicTeachingPolicy(db)
        self.proof_learning = proof_learning or ProofOfLearningService(db)
        self.io = modality_runtime or ModalityRuntime()
        if memory_mode not in {"local_first", "server"}:
            raise ValueError("memory_mode must be local_first or server")
        self.memory_mode = memory_mode
        # Serializes same-process turn commits. Durable event IDs derived from the
        # idempotency key provide an additional cross-worker duplicate boundary.
        self._turn_lock = RLock()
        self.evidence_engine = AssessmentEvidenceEngine(self.semantic, self.code)

    def respond_legacy(self, request: TutorRequest) -> TutorResponse:
        """Compatibility bridge into the unified Decision Kernel runtime."""
        session = self.memory.get_session(request.session_id)
        if not session:
            raise ValueError("Unknown session")
        if session.user_id != request.user_id or session.subject_id != request.subject_id:
            raise ValueError("Tutor request does not match the session")
        if session.status != "active":
            raise ValueError("Tutor request requires an active session")
        concept = self.db.fetchone(
            "SELECT subject_id FROM concepts WHERE concept_id=?", (request.target_concept_id,)
        )
        if not concept or concept["subject_id"] != request.subject_id:
            raise ValueError("Target concept does not belong to the active subject")

        action_to_intent = {
            "explain": "need_explanation", "hint": "need_explanation",
            "analogy": "need_explanation", "worked_example": "example",
            "socratic_question": "practice", "practice": "practice",
            "reassess": "practice", "prerequisite_rewind": "need_explanation",
            "summary": "skip",
        }
        frame = self.decision.plan(
            user_id=request.user_id, content_user_id=request.user_id,
            subject_id=request.subject_id, concept_id=request.target_concept_id,
            requested_mode="study", query=request.user_message or request.target_concept_id,
            learner_intent=action_to_intent.get(request.action, "answer"),
        )
        move = self._generate_move(
            user_id=request.user_id, subject_id=request.subject_id, course_id=None, plan=frame
        )
        self.memory.record_intervention(
            session_id=request.session_id, user_id=request.user_id, subject_id=request.subject_id,
            concept_id=frame.target_concept_id, action_type=move.action, content=move.content,
            grounded=bool(move.citations), source_ids=move.citations, supervisor_used=False,
            metadata={"compatibility_bridge": True, "decision_frame": frame.model_dump(mode="json")},
        )
        return TutorResponse(
            message=move.content, action=move.action, grounded=bool(move.citations),
            citations=move.citations, supervisor_used=False, next_check=move.generated_item_id,
            diagnosis=DiagnosisResult.model_validate(frame.diagnosis),
        )

    def start(self, *, user_id: str, request: LearningSessionStart) -> dict[str, Any]:
        # Opportunistically reap abandoned local-first shadows before creating a
        # new session.  Normal completion still cleans immediately; this closes
        # the browser-close/crash path so ephemeral derived state cannot persist
        # indefinitely.
        if self.memory_mode == "local_first":
            self._expire_stale_local_first_shadows(owner_user_id=user_id)
        concept = self.db.fetchone(
            "SELECT concept_id,subject_id,name FROM concepts WHERE concept_id=?",
            (request.concept_id,),
        )
        if not concept or concept["subject_id"] != request.subject_id:
            raise ValueError("Unknown concept or subject/concept mismatch")
        if str(request.subject_id).startswith("USR:") and not request.course_id:
            raise ValueError("User-created subjects require an accessible course")
        if request.course_id:
            course = self.db.fetchone(
                """SELECT c.subject_id FROM courses c
                   LEFT JOIN course_enrollments e ON e.course_id=c.course_id AND e.learner_user_id=? AND e.status='active'
                   WHERE c.course_id=? AND (c.owner_user_id=? OR e.learner_user_id=?)""",
                (user_id, request.course_id, user_id, user_id),
            )
            if not course:
                raise ValueError("Unknown or inaccessible course")
            if course["subject_id"] and course["subject_id"] != request.subject_id:
                raise ValueError("Course does not belong to the requested subject")

        session_id = str(uuid4())
        persist_personalization = self.memory.personalization_enabled(user_id)
        capsule = self._bounded_capsule(request.context_capsule) if persist_personalization else {}
        learner_user_id = (
            user_id if self.memory_mode == "server" else f"lf:{user_id}:{session_id}"
        )
        if self.memory_mode == "local_first":
            self._hydrate_local_first_state(
                learner_user_id=learner_user_id,
                subject_id=request.subject_id,
                capsule=capsule,
            )
        legacy = self.memory.start_session(
            user_id=learner_user_id,
            subject_id=request.subject_id,
            goal=request.goal,
            source="system",
        )
        state = {
            "memory_session_id": legacy.session_id,
            "engine_user_id": learner_user_id,
            "memory_mode": self.memory_mode,
            "persist_personalization": persist_personalization,
            "context_capsule": capsule,
            "current_move": None,
            "turn_count": 0,
            "goal_stack": [
                {
                    "concept_id": request.concept_id,
                    "kind": "root",
                    "reason": request.goal or f"Learn {concept['name']}",
                    "success_criterion": "independent verified evidence",
                    "attempt_budget": 12,
                }
            ],
            "policy_context": {
                "mode": request.mode,
                "goal": request.goal,
                "source_client": request.source_client,
            },
            "state_delta": self._state_delta_for_client(learner_user_id, request.subject_id, persist_personalization),
        }
        now = _now()
        self.db.execute(
            """
            INSERT INTO teaching_sessions(teaching_session_id,owner_user_id,subject_id,course_id,concept_id,goal,mode,source_client,state_json,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                session_id,
                user_id,
                request.subject_id,
                request.course_id,
                request.concept_id,
                request.goal,
                request.mode,
                request.source_client,
                self.db.dumps(state),
                now,
                now,
            ),
        )
        move, plan = self._next_move(
            learner_user_id=learner_user_id,
            content_user_id=user_id,
            subject_id=request.subject_id,
            concept_id=request.concept_id,
            mode=request.mode,
            query=request.goal or concept["name"],
            course_id=request.course_id,
            teaching_session_id=session_id,
        )
        self._sync_goal_stack_from_plan(state, plan, root_concept_id=request.concept_id)
        state["current_move"] = move.model_dump(mode="json")
        state["state_delta"] = self._state_delta_for_client(learner_user_id, request.subject_id, persist_personalization)
        self._save_state(session_id, user_id, state)
        return {
            "teaching_session_id": session_id,
            "status": "active",
            "move": move.model_dump(mode="json"),
            "state_delta": state["state_delta"],
            "decision_summary": plan.summary,
        }

    def turn(
        self,
        *,
        user_id: str,
        session_id: str,
        turn: LearningTurnInput,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if not idempotency_key or len(idempotency_key) > 128:
            raise ValueError("Invalid idempotency key")
        with self._turn_lock:
            row = self._session(user_id, session_id)
            if row["status"] != "active":
                raise ValueError("Teaching session is not active")
            prior = self.db.fetchone(
                "SELECT move_json,evidence_json,turn_id FROM teaching_turns WHERE teaching_session_id=? AND idempotency_key=?",
                (session_id, idempotency_key),
            )
            if prior:
                replay_state = self.db.loads(row["state_json"], {})
                replay_evidence = self.db.loads(prior["evidence_json"], {})
                return {
                    "teaching_session_id": session_id,
                    "turn_id": prior["turn_id"],
                    "idempotent_replay": True,
                    "evidence": replay_evidence,
                    "gap_update": replay_evidence.get("gap_update"),
                    "move": self.db.loads(prior["move_json"], {}),
                    "state_delta": replay_state.get("state_delta", {}),
                    "decision_summary": None,
                }

            # Shared across grading and the subsequent move; the DecisionFrame
            # additionally constrains generation via a child sub-budget.
            turn_budget = SemanticBudget(3, decision_id=f"turn:{session_id}:{idempotency_key}")
            state = self.db.loads(row["state_json"], {})
            learner_user_id = str(state.get("engine_user_id") or user_id)
            current = state.get("current_move") or {}
            deterministic_event_id = str(
                uuid5(NAMESPACE_URL, f"ovael:{user_id}:{session_id}:{idempotency_key}")
            )
            normalized = self.io.learning_turn(
                user_id=user_id, course_id=row["course_id"], subject_id=row["subject_id"],
                concept_id=str(current.get("target_concept_id") or row["concept_id"]),
                input_mode=turn.input_mode, response=turn.response, selected_option=turn.selected_option,
                numeric_value=turn.numeric_value, code=turn.code, learner_intent=turn.learner_intent,
                metadata={"hint_count": turn.hint_count, "attempt_count": turn.attempt_count, "response_seconds": turn.response_seconds},
                event_id=deterministic_event_id,
            )
            # Keep only the modality/control envelope in resumable state; raw learner
            # text remains governed by the existing local-first/server memory policy.
            normalized_public = normalized.model_dump(mode="json")
            normalized_public.pop("content", None)
            state["last_normalized_event"] = normalized_public
            current_teaching_plan = current.get("teaching_plan") if isinstance(current, dict) else {}
            if not isinstance(current_teaching_plan, dict):
                current_teaching_plan = {}
            state_before_policy = {
                "goal_stack": list(state.get("goal_stack") or []),
                "current_move": {
                    "action": current.get("action"),
                    "target_concept_id": current.get("target_concept_id"),
                    "target_difficulty": current.get("target_difficulty"),
                },
                # This is the bounded learner-state snapshot used when the teaching program
                # was chosen.  It makes later policy reuse state-conditioned, not
                # merely concept/mode-conditioned.
                "learner_state": dict(current_teaching_plan.get("learner_state") or {}),
            }
            try:
                if turn.learner_intent == "answer":
                    evidence = self._evaluate_current(
                        user_id, learner_user_id, row, state, current, turn,
                        event_id=deterministic_event_id, budget=turn_budget,
                    )
                else:
                    # A request for a hint/explanation is NOT a failed attempt.
                    evidence = {"evaluation": None, "score": None, "correct": None,
                                "evaluator_confidence": 0.0, "non_assessment_turn": True}
            except (ValueError, sqlite3.IntegrityError) as exc:
                if isinstance(exc, sqlite3.IntegrityError) or "already been recorded" in str(exc):
                    replay = self.db.fetchone(
                        "SELECT move_json,evidence_json,turn_id FROM teaching_turns WHERE teaching_session_id=? AND idempotency_key=?",
                        (session_id, idempotency_key),
                    )
                    if replay:
                        replay_state = self.db.loads(row["state_json"], {})
                        replay_evidence = self.db.loads(replay["evidence_json"], {})
                        return {
                            "teaching_session_id": session_id,
                            "turn_id": replay["turn_id"],
                            "idempotent_replay": True,
                            "evidence": replay_evidence,
                            "gap_update": replay_evidence.get("gap_update"),
                            "move": self.db.loads(replay["move_json"], {}),
                            "state_delta": replay_state.get("state_delta", {}),
                            "decision_summary": None,
                        }
                    raise ValueError("A matching learner turn is already being processed") from exc
                raise

            # The causal-gap engine observes the same newly committed evidence and writes
            # only a derived, privacy-safe case projection to the owning account.
            # In local-first mode the evidence identity is session-scoped, so the
            # explicit case owner keeps Gap Forensics available across screens.
            try:
                gap_update = self.decision.forensics(
                    user_id=learner_user_id,
                    case_owner_user_id=user_id,
                    subject_id=row["subject_id"],
                    max_cases=6,
                    persist=bool(state.get("persist_personalization", True)),
                )
            except Exception:
                gap_update = {
                    "subject_id": row["subject_id"],
                    "generated_at": _now(),
                    "summary": {
                        "case_count": 0,
                        "headline": "Gap analysis will retry after the next learning turn.",
                    },
                    "cases": [],
                    "status": "temporarily_unavailable",
                }
            evidence["gap_update"] = gap_update

            # Persist the outcome of the *previous* teaching program. This is the
            # dynamic personalization signal: no static visual/story profile is
            # written, only state/action/outcome evidence.
            if bool(state.get("persist_personalization", True)) and evidence.get("score") is not None:
                self.pedagogy_policy.record_outcome(
                    user_id=user_id,
                    subject_id=row["subject_id"],
                    concept_id=str(current.get("target_concept_id") or row["concept_id"]),
                    teaching_session_id=session_id,
                    teaching_program=current.get("teaching_plan") if isinstance(current, dict) else None,
                    score=evidence.get("score"),
                    correct=evidence.get("correct"),
                    independent=(turn.hint_count == 0 and turn.attempt_count == 1),
                    context={
                        "mode": row["mode"],
                        "learner_intent": turn.learner_intent,
                        "previous_action": current.get("action") if isinstance(current, dict) else None,
                        "interaction_mode": turn.input_mode,
                    },
                    state_before=state_before_policy,
                    state_after={"concept_states": evidence.get("states") or [], "gap_summary": (gap_update.get("summary") or {})},
                    outcome_details={
                        "immediate_score": evidence.get("score"), "correct": evidence.get("correct"),
                        "hint_count": turn.hint_count, "attempt_count": turn.attempt_count,
                        "response_seconds": turn.response_seconds, "input_mode": turn.input_mode,
                    },
                )

            self._update_goal_stack_after_evidence(state, evidence, root_concept_id=row["concept_id"])
            plan_concept = self._active_goal_concept(state, fallback=str(current.get("target_concept_id") or row["concept_id"]))
            move, plan = self._next_move(
                learner_user_id=learner_user_id,
                content_user_id=user_id,
                subject_id=row["subject_id"],
                concept_id=plan_concept,
                mode=row["mode"],
                query=turn.response or plan_concept,
                course_id=row["course_id"],
                teaching_session_id=session_id,
                learner_intent=turn.learner_intent,
                budget=turn_budget,
            )
            evidence["inference"] = turn_budget.snapshot()
            state["turn_count"] = int(state.get("turn_count", 0)) + 1
            self._sync_goal_stack_from_plan(state, plan, root_concept_id=row["concept_id"])
            state["current_move"] = move.model_dump(mode="json")
            state_delta = self._state_delta_for_client(
                learner_user_id, row["subject_id"], bool(state.get("persist_personalization", True))
            )
            state["state_delta"] = state_delta

            turn_id = str(uuid4())
            if self.memory_mode == "local_first":
                response_payload = {
                    "redacted": True,
                    "sha256": hashlib.sha256(
                        self.db.dumps(turn.model_dump(mode="json")).encode("utf-8")
                    ).hexdigest(),
                    "response_present": bool(turn.response or turn.code or turn.submission or turn.selected_option is not None or turn.numeric_value is not None),
                }
            else:
                response_payload = turn.model_dump(mode="json")
            try:
                self.db.execute(
                    """
                    INSERT INTO teaching_turns(turn_id,teaching_session_id,owner_user_id,idempotency_key,learner_response_json,evidence_json,move_json,created_at)
                    VALUES(?,?,?,?,?,?,?,?)
                    """,
                    (
                        turn_id, session_id, user_id, idempotency_key,
                        self.db.dumps(response_payload), self.db.dumps(evidence),
                        self.db.dumps(move.model_dump(mode="json")), _now(),
                    ),
                )
            except sqlite3.IntegrityError as exc:
                replay = self.db.fetchone(
                    "SELECT move_json,evidence_json,turn_id FROM teaching_turns WHERE teaching_session_id=? AND idempotency_key=?",
                    (session_id, idempotency_key),
                )
                if replay:
                    replay_state = self.db.loads(row["state_json"], {})
                    return {
                        "teaching_session_id": session_id,
                        "turn_id": replay["turn_id"],
                        "idempotent_replay": True,
                        "evidence": self.db.loads(replay["evidence_json"], {}),
                        "gap_update": self.db.loads(replay["evidence_json"], {}).get("gap_update"),
                        "move": self.db.loads(replay["move_json"], {}),
                        "state_delta": replay_state.get("state_delta", {}),
                        "decision_summary": None,
                    }
                raise ValueError("A matching learner turn is already being processed") from exc

            self._save_state(session_id, user_id, state)
            return {
                "teaching_session_id": session_id,
                "turn_id": turn_id,
                "idempotent_replay": False,
                "evidence": evidence,
                "gap_update": gap_update,
                "move": move.model_dump(mode="json"),
                "state_delta": state_delta,
                "decision_summary": plan.summary,
            }

    @staticmethod
    def _active_goal_concept(state: dict[str, Any], *, fallback: str) -> str:
        stack = state.get("goal_stack") or []
        if isinstance(stack, list) and stack:
            top = stack[-1]
            if isinstance(top, dict) and top.get("concept_id"):
                return str(top["concept_id"])
        return fallback

    def _update_goal_stack_after_evidence(
        self, state: dict[str, Any], evidence: dict[str, Any], *, root_concept_id: str
    ) -> None:
        stack = state.get("goal_stack")
        if not isinstance(stack, list) or not stack:
            stack = [{
                "concept_id": root_concept_id,
                "kind": "root",
                "reason": "Original learning goal",
                "success_criterion": "independent verified evidence",
                "attempt_budget": 12,
                "attempts_used": 0,
            }]
            state["goal_stack"] = stack
        if len(stack) <= 1:
            return

        top = stack[-1] if isinstance(stack[-1], dict) else {}
        if str(top.get("kind") or "") != "repair":
            return
        target = str(top.get("concept_id") or "")
        matching_state: dict[str, Any] | None = None
        for item in evidence.get("states") or []:
            if isinstance(item, dict) and str(item.get("concept_id")) == target:
                matching_state = item
                break
        if matching_state is None:
            return

        # Every committed evidence-bearing attempt against the active repair goal
        # consumes one budget unit.  The budget is control state, not decoration.
        budget = max(1, int(top.get("attempt_budget", 6) or 6))
        attempts_used = max(0, int(top.get("attempts_used", 0) or 0)) + 1
        top["attempts_used"] = attempts_used
        top["attempts_remaining"] = max(0, budget - attempts_used)

        mastery = float(matching_state.get("mastery_belief", 0.0) or 0.0)
        confidence = float(matching_state.get("confidence", 0.0) or 0.0)
        status = str(matching_state.get("status") or "")
        if status in {"verified", "recovered"} or (mastery >= 0.75 and confidence >= 0.45):
            stack.pop()
            state["last_goal_transition"] = {
                "event": "repair_completed",
                "completed_concept_id": target,
                "attempts_used": attempts_used,
                "returned_to": str(stack[-1].get("concept_id") or root_concept_id),
                "at": _now(),
            }
            return

        if attempts_used >= budget:
            stack.pop()
            exhausted = state.setdefault("repair_exhausted_concepts", [])
            if isinstance(exhausted, list) and target not in exhausted:
                exhausted.append(target)
                del exhausted[:-12]
            state["last_goal_transition"] = {
                "event": "repair_budget_exhausted",
                "concept_id": target,
                "attempts_used": attempts_used,
                "attempt_budget": budget,
                "returned_to": str(stack[-1].get("concept_id") or root_concept_id),
                "at": _now(),
            }

    def _sync_goal_stack_from_plan(
        self, state: dict[str, Any], plan: DecisionFrame, *, root_concept_id: str
    ) -> None:
        stack = state.get("goal_stack")
        if not isinstance(stack, list) or not stack:
            stack = [{
                "concept_id": root_concept_id,
                "kind": "root",
                "reason": "Original learning goal",
                "success_criterion": "independent verified evidence",
                "attempt_budget": 12,
                "attempts_used": 0,
            }]
            state["goal_stack"] = stack
        active = str(stack[-1].get("concept_id") or root_concept_id) if isinstance(stack[-1], dict) else root_concept_id
        if plan.action != "prerequisite_rewind" or plan.target_concept_id == active:
            return

        # Prevent recursive prerequisite drift and immediate re-entry into a
        # repair that has already consumed its evidence budget this session.
        repair_depth = sum(1 for frame in stack if isinstance(frame, dict) and frame.get("kind") == "repair")
        exhausted = {str(x) for x in (state.get("repair_exhausted_concepts") or [])}
        if plan.target_concept_id in exhausted:
            state["last_goal_transition"] = {
                "event": "repair_reentry_blocked",
                "concept_id": plan.target_concept_id,
                "returned_to": active,
                "at": _now(),
            }
            return
        if repair_depth >= 3:
            state["last_goal_transition"] = {
                "event": "repair_depth_limit",
                "concept_id": plan.target_concept_id,
                "max_repair_depth": 3,
                "returned_to": active,
                "at": _now(),
            }
            return

        # Do not duplicate an already-active/recent repair frame.
        if not any(isinstance(frame, dict) and frame.get("concept_id") == plan.target_concept_id for frame in stack[-3:]):
            stack.append({
                "concept_id": plan.target_concept_id,
                "kind": "repair",
                "parent_concept_id": active,
                "reason": plan.learner_reason,
                "success_criterion": "mastery>=0.75 with independent evidence or recovered/verified status",
                "attempt_budget": 6,
                "attempts_used": 0,
                "attempts_remaining": 6,
                "entered_at": _now(),
            })
            state["last_goal_transition"] = {
                "event": "repair_started",
                "concept_id": plan.target_concept_id,
                "parent_concept_id": active,
                "at": _now(),
            }

    def complete(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        row = self._session(user_id, session_id)
        state = self.db.loads(row["state_json"], {})
        learner_user_id = str(state.get("engine_user_id") or user_id)
        persist_personalization = bool(state.get("persist_personalization", True))
        state_delta = state.get("state_delta") or self._state_delta_for_client(
            learner_user_id, row["subject_id"], persist_personalization
        )
        if row["status"] == "completed":
            return {"teaching_session_id": session_id, "status": "completed", "state_delta": state_delta}
        memory_session_id = state.get("memory_session_id")
        if memory_session_id:
            try:
                self.curator.close_session(memory_session_id)
            except ValueError:
                pass
        # Snapshot after session close because close/compaction may update state.
        state_delta = self._state_delta_for_client(learner_user_id, row["subject_id"], persist_personalization)
        now = _now()
        if self.memory_mode == "local_first":
            # Persist only the resumable teaching pointer and explicit state delta.
            # Raw input capsule and ephemeral learner engine identifiers are scrubbed.
            public_state = {
                "memory_mode": "local_first",
                "current_move": state.get("current_move"),
                "turn_count": int(state.get("turn_count", 0)),
                "state_delta": state_delta,
            }
            self.db.execute(
                "UPDATE teaching_sessions SET status='completed',ended_at=?,updated_at=?,state_json=? WHERE teaching_session_id=? AND owner_user_id=?",
                (now, now, self.db.dumps(public_state), session_id, user_id),
            )
            self._cleanup_shadow_state(learner_user_id)
        else:
            state["state_delta"] = state_delta
            self.db.execute(
                "UPDATE teaching_sessions SET status='completed',ended_at=?,updated_at=?,state_json=? WHERE teaching_session_id=? AND owner_user_id=?",
                (now, now, self.db.dumps(state), session_id, user_id),
            )
        return {"teaching_session_id": session_id, "status": "completed", "state_delta": state_delta}

    def get(self, *, user_id: str, session_id: str) -> dict[str, Any]:
        row = self._session(user_id, session_id)
        state = self.db.loads(row["state_json"], {})
        return {
            "teaching_session_id": row["teaching_session_id"],
            "subject_id": row["subject_id"],
            "course_id": row["course_id"],
            "concept_id": row["concept_id"],
            "goal": row["goal"],
            "mode": row["mode"],
            "source_client": row["source_client"],
            "status": row["status"],
            "turn_count": int(state.get("turn_count", 0)),
            "move": state.get("current_move"),
            "state_delta": state.get("state_delta"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    # ------------------------------------------------------------------
    # Planning + dynamic generation
    # ------------------------------------------------------------------
    @staticmethod
    def _diagnosis_context(frame: DecisionFrame) -> dict[str, Any]:
        """Return the already-unified diagnosis projection from DecisionKernel."""
        return dict(frame.diagnosis or {})

    def _learning_ir_inventory(self, course_id: str, concept_id: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for ir_row in self.db.fetchall(
            "SELECT object_type,metadata_json FROM learning_ir_objects WHERE course_id=?",
            (course_id,),
        ):
            metadata = self.db.loads(ir_row["metadata_json"], {})
            linked = {str(value) for value in (metadata.get("concept_ids") or [])}
            if concept_id not in linked:
                continue
            object_type = str(ir_row["object_type"])
            counts[object_type] = counts.get(object_type, 0) + 1
        return counts

    def _next_move(
        self,
        *,
        learner_user_id: str,
        content_user_id: str,
        subject_id: str,
        concept_id: str,
        mode: str,
        query: str,
        course_id: str | None = None,
        teaching_session_id: str | None = None,
        learner_intent: str = "answer",
        budget: SemanticBudget | None = None,
    ) -> tuple[TeachingMove, DecisionFrame]:
        session_state: dict[str, Any] = {}
        session_goal: str | None = None
        advisory: str | None = None
        if teaching_session_id:
            session_row = self.db.fetchone(
                "SELECT state_json,goal FROM teaching_sessions WHERE teaching_session_id=? AND owner_user_id=?",
                (teaching_session_id, content_user_id),
            )
            if session_row:
                session_state = self.db.loads(session_row["state_json"], {})
                session_goal = session_row["goal"]
            advisory = self._consume_teaching_suggestion(content_user_id, teaching_session_id)

        frame = self.decision.plan(
            user_id=learner_user_id,
            content_user_id=content_user_id,
            subject_id=subject_id,
            concept_id=concept_id,
            requested_mode=mode,
            query=query,
            course_id=course_id,
            learner_intent=learner_intent,
            session_state=session_state,
            session_goal=session_goal,
            external_advisory=advisory,
        )
        move = self._generate_move(
            user_id=content_user_id, subject_id=subject_id, course_id=course_id, plan=frame, transaction_budget=budget
        )
        return move, frame

    def _generate_move(self, *, user_id: str, subject_id: str, course_id: str | None,
                       plan: DecisionFrame, transaction_budget: SemanticBudget | None = None) -> TeachingMove:
        # One hard inference budget spans all semantic work for this learner turn.
        # The DecisionKernel only declares the ceiling; it never spends it.
        budget = (transaction_budget.child(plan.model_call_budget) if transaction_budget is not None
                  else self.semantic.budget_for(plan))
        if plan.semantic_requirement == "deep_research":
            plan = self.semantic.enrich_research(
                frame=plan, budget=budget, user_id=user_id, subject_id=subject_id, course_id=course_id
            )

        concept_row = self.db.fetchone("SELECT name FROM concepts WHERE concept_id=?", (plan.target_concept_id,))
        concept_name = concept_row["name"] if concept_row else plan.target_concept_id
        source_hits = list(plan.source_hits or [])
        citations = [h.get("citation_location") or h.get("source_id") for h in source_hits[:4]]
        citations = [str(c) for c in citations if c]
        action = plan.action
        policy = dict(plan.teaching_policy or {})
        sovereignty = dict(plan.sovereignty or {})
        assistance_level = int(sovereignty.get("assistance_level", 0) or 0)
        assistance_label = str(sovereignty.get("assistance_label") or "independent attempt")
        evidence_dimension = str(sovereignty.get("evidence_dimension") or "acquisition")
        sovereignty_reason = str(sovereignty.get("reason") or "")
        teaching_plan_ir = TeachingPlanIR.build(
            target_concept_id=plan.target_concept_id,
            target_difficulty=plan.target_difficulty,
            action=action,
            learner_reason=plan.learner_reason,
            policy=policy,
            citations=citations,
            source_hits=source_hits,
            diagnosis=self._diagnosis_context(plan),
            learner_state={"diagnosis": plan.diagnosis, "adaptive": plan.adaptive},
            context=policy.get("context") or {},
        )
        teaching_plan = teaching_plan_ir.model_dump(mode="json")

        # Explanation-like moves don't require an answer key.
        if action in {"explain", "hint", "contrast", "worked_example", "prerequisite_rewind", "summarize"}:
            content, content_status = self._generate_explanation(plan, budget, concept_name, subject_id=subject_id, course_id=course_id)
            output_intent = self.io.output_intent(
                teaching_plan_id=teaching_plan_ir.teaching_plan_id, content=content, citations=citations,
                assessment=None, representation_sequence=teaching_plan_ir.representation_sequence,
            ).model_dump(mode="json")
            return TeachingMove(
                action=action, target_concept_id=plan.target_concept_id, target_difficulty=plan.target_difficulty,
                pedagogical_goal=f"Improve understanding of {concept_name}", content=content,
                expected_evidence="Learner can restate or apply the idea on the next check.",
                learner_reason=plan.learner_reason, citations=citations, validation_state="explanation",
                decision_trace={**self._decision_trace(plan), "inference": budget.snapshot()}, decision_frame=self._public_decision_frame(plan),
                teaching_plan=teaching_plan, output_intent=output_intent,
                assistance_level=assistance_level, assistance_label=assistance_label,
                evidence_dimension=evidence_dimension, sovereignty_reason=sovereignty_reason,
                content_status=content_status,
            )

        item = self._generate_assessment(subject_id=subject_id, course_id=course_id, plan=plan, budget=budget, concept_name=concept_name)
        generated_item_id = self._persist_generated_item(user_id, subject_id, plan, item)
        assessment_payload = {
            "generated_item_id": generated_item_id, "answer_type": item["answer_type"],
            "options": item.get("options") or [], "expected_evidence": item.get("expected_evidence"),
            "submission_contract": {
                "modalities": ["text", "image", "handwriting", "diagram", "audio", "code", "numeric", "choice", "mixed"],
                "required_modalities": item.get("required_modalities") or
                    ((item.get("answer_key") or {}).get("required_modalities") if isinstance(item.get("answer_key"), dict) else []),
                "supports_partial_credit": True,
                "visual_topology_autograding": False,
            },
        }
        output_intent = self.io.output_intent(
            teaching_plan_id=teaching_plan_ir.teaching_plan_id, content=item["stem"], citations=citations,
            assessment=assessment_payload, representation_sequence=teaching_plan_ir.representation_sequence,
        ).model_dump(mode="json")
        return TeachingMove(
            action=action if action in {"diagnose", "practice", "reassess", "ask"} else "practice",
            target_concept_id=plan.target_concept_id,
            target_difficulty=float(item.get("difficulty", plan.target_difficulty)),
            pedagogical_goal=item.get("goal") or f"Check {concept_name}", content=item["stem"],
            answer_type=item["answer_type"], options=item.get("options") or [],
            required_modalities=assessment_payload["submission_contract"]["required_modalities"],
            expected_evidence=item.get("expected_evidence") or "Correctness and response behavior.",
            learner_reason=plan.learner_reason, citations=citations, validation_state=item["validation_state"],
            generated_item_id=generated_item_id, decision_trace={**self._decision_trace(plan), "inference": budget.snapshot()},
            decision_frame=self._public_decision_frame(plan),
            teaching_plan=teaching_plan, output_intent=output_intent,
            assistance_level=assistance_level, assistance_label=assistance_label,
            evidence_dimension=evidence_dimension, sovereignty_reason=sovereignty_reason,
        )

    def _generate_explanation(self, plan: DecisionFrame, budget: SemanticBudget, concept_name: str, *, subject_id: str, course_id: str | None) -> tuple[str, str]:
        source_excerpt = "\n\n".join(
            f"[{str(h.get('source_role') or ('verified_global' if h.get('verified') else 'private_source')).upper()} | {h.get('citation_location') or h.get('source_id')}]\n{h.get('content', '')[:1200]}"
            for h in plan.source_hits[:4]
        )
        rendered = self.semantic.explain(
            frame=plan, budget=budget, concept_name=concept_name, subject_id=subject_id, course_id=course_id,
            source_excerpt=source_excerpt,
        )
        if rendered:
            return rendered, "generated"
        if source_excerpt.strip():
            return (f"AI explanation is unavailable for {concept_name}. Here is an excerpt from the available course material. "
                    "It has not been independently verified as a complete lesson.\n\n" + source_excerpt[:2600], "source_excerpt")
        return (f"No verified teaching content is available for {concept_name}. "
                "Upload appropriate course material or configure a teaching model. "
                "You can still submit an answer, but unverified questions will not count toward mastery.", "unavailable")

    def _generate_assessment(self, *, subject_id: str, course_id: str | None, plan: DecisionFrame, budget: SemanticBudget, concept_name: str) -> dict[str, Any]:
        source_excerpt = "\n\n".join(
            f"[{str(h.get('source_role') or ('verified_global' if h.get('verified') else 'private_source')).upper()} | {h.get('citation_location') or h.get('source_id')}]\n{h.get('content', '')[:1000]}"
            for h in plan.source_hits[:4]
        )

        # If the adaptive engine selected an information-gain or calibrated practice item,
        # deliver that exact item. The previous architecture computed a useful
        # question ID and then threw it away by generating a different question.
        diagnosis = plan.diagnosis or {}
        adaptive = plan.adaptive or {}
        selected_question_id = plan.selected_question_id
        if selected_question_id:
            selected = self.db.fetchone(
                "SELECT * FROM questions WHERE question_id=? AND subject_id=?",
                (selected_question_id, subject_id),
            )
            if selected:
                answer_type = str(selected["answer_type"])
                answer_key = self.db.loads(selected["answer_key_json"], None)
                options: list[str] = []
                metadata = self.db.loads(selected["metadata_json"], {})
                if isinstance(metadata, dict) and isinstance(metadata.get("options"), list):
                    options = [str(v) for v in metadata.get("options") or []]
                if isinstance(answer_key, dict) and isinstance(answer_key.get("options"), list):
                    options = [str(v) for v in answer_key.get("options") or []]
                    answer_key = answer_key.get("correct_index", answer_key.get("answer"))
                if answer_type in {"short"}:
                    answer_type = "free_text"
                if answer_type == "mcq" and not options:
                    # Older trusted question packs may label a textual rubric as
                    # MCQ. Preserve the exact stem and answer key but normalize the
                    # runtime response mode so it remains deterministically gradable.
                    answer_type = "free_text"
                if answer_type == "code" and isinstance(answer_key, dict):
                    code_tests = metadata.get("code_tests") if isinstance(metadata, dict) else None
                    if isinstance(code_tests, dict):
                        answer_key = code_tests
                return {
                    "stem": selected["stem"],
                    "answer_type": answer_type if answer_type in {"mcq", "boolean", "numeric", "free_text", "code", "diagram", "flowchart", "labelled_image", "oral", "handwritten", "long_answer", "short_answer", "mixed"} else "free_text",
                    "options": options,
                    "answer_key": answer_key,
                    "required_modalities": list(answer_key.get("required_modalities") or []) if isinstance(answer_key, dict) else [],
                    "goal": f"Evidence-selected check of {concept_name}",
                    "expected_evidence": "Exact diagnostic/adaptive item selected by learner-state information gain or calibrated difficulty.",
                    "validation_state": "fallback_validated",
                    "difficulty": float(selected["difficulty"]),
                    "source_question_id": str(selected_question_id),
                }
        raw = self.semantic.generate_assessment(
            frame=plan, budget=budget, subject_id=subject_id, course_id=course_id,
            concept_name=concept_name, source_excerpt=source_excerpt,
        )
        if raw is not None:
            try:
                item = self._validate_item(raw, plan.target_difficulty, subject_id=subject_id)
                return self._validate_generated_content(
                    frame=plan, budget=budget, item=item, subject_id=subject_id, concept_name=concept_name, source_excerpt=source_excerpt
                )
            except (ModelUnavailable, ValueError, KeyError, TypeError):
                pass
        # Model outage fallback may use the small verified anchor set. Anchors are
        # deliberately excluded from the normal generated path, but they provide
        # deterministically gradable evidence when generation/validation is down.
        anchor = self.db.fetchone(
            """SELECT * FROM questions WHERE subject_id=? AND primary_concept_id=?
            ORDER BY ABS(difficulty-?) ASC, is_diagnostic ASC LIMIT 1""",
            (subject_id, plan.target_concept_id, plan.target_difficulty),
        )
        if anchor:
            answer_type = str(anchor["answer_type"])
            answer_key = self.db.loads(anchor["answer_key_json"], None)
            options: list[str] = []
            if isinstance(answer_key, dict) and "options" in answer_key:
                options = [str(v) for v in (answer_key.get("options") or [])]
                answer_key = answer_key.get("correct_index", answer_key.get("answer"))
            # Legacy anchor packs often encode accepted textual answers even when
            # the old UI labelled the item "mcq"/"short". The dynamic teaching
            # API must never expose an MCQ without actual options, so normalize
            # those anchors to a deterministically gradable free-text check.
            if answer_type in {"mcq", "short"} and not options:
                answer_type = "free_text"
            if answer_type not in {"mcq", "boolean", "numeric", "free_text", "code", "diagram", "flowchart", "labelled_image", "oral", "handwritten", "long_answer", "short_answer", "mixed"}:
                answer_type = "free_text"
            return {
                "stem": anchor["stem"],
                "answer_type": answer_type,
                "options": options,
                "answer_key": answer_key,
                "required_modalities": list(answer_key.get("required_modalities") or []) if isinstance(answer_key, dict) else [],
                "goal": f"Fallback verification of {concept_name}",
                "expected_evidence": "Deterministically gradable anchor evidence during model outage.",
                "validation_state": "fallback_validated",
                "difficulty": float(anchor["difficulty"]),
            }
        # Domains without a verified anchor can still teach, but this open-ended
        # move is intentionally weak evidence until a model/evaluator is available.
        return {
            "stem": f"In your own words, explain the core rule of {concept_name} and give one example where it applies.",
            "answer_type": "free_text",
            "options": [],
            "answer_key": None,
            "goal": f"Elicit transferable understanding of {concept_name}",
            "expected_evidence": "A correct rule plus a relevant example; ungraded responses do not change mastery.",
            "validation_state": "generated_unvalidated",
            "difficulty": plan.target_difficulty,
        }

    def _validate_item(self, raw: dict[str, Any], target_difficulty: float, *, subject_id: str) -> dict[str, Any]:
        stem = str(raw.get("stem") or "").strip()
        if not 8 <= len(stem) <= 5000:
            raise ValueError("Generated item stem is invalid")
        answer_type = str(raw.get("answer_type") or "").strip().lower()
        supported = {"mcq", "boolean", "numeric", "free_text"}
        if subject_id in {"DSA", "PROG", "GAME", "SYS"}:
            supported.add("code")
        supported |= {"diagram", "labelled_image", "oral", "handwritten", "long_answer", "short_answer", "flowchart", "mixed"}
        if answer_type not in supported:
            raise ValueError("Unsupported generated answer type")
        options = raw.get("options") or []
        key = raw.get("answer_key")
        if answer_type == "mcq":
            if not isinstance(options, list) or not 2 <= len(options) <= 6:
                raise ValueError("MCQ requires 2-6 options")
            normalized = [str(o).strip().casefold() for o in options]
            if any(not value for value in normalized) or len(set(normalized)) != len(normalized):
                raise ValueError("MCQ options must be non-empty and distinct")
            if not isinstance(key, int) or not 0 <= key < len(options):
                raise ValueError("MCQ answer key must be an option index")
        elif answer_type == "boolean":
            if not isinstance(key, bool):
                raise ValueError("Boolean answer key must be true or false")
        elif answer_type == "numeric":
            try:
                numeric_key = float(key)
            except (TypeError, ValueError) as exc:
                raise ValueError("Numeric answer key must be finite") from exc
            if not math.isfinite(numeric_key):
                raise ValueError("Numeric answer key must be finite")
            key = numeric_key
        elif answer_type in {"free_text", "diagram", "labelled_image", "oral", "handwritten", "long_answer", "short_answer", "flowchart", "mixed"}:
            if key is None or not str(key).strip():
                raise ValueError("Free-text generated items require a grading reference")
            key = key if isinstance(key, (dict, list)) else str(key)[:8000]
        elif answer_type == "code":
            if not isinstance(key, dict):
                raise ValueError("Code answer key must contain executable tests")
            entry = key.get("entry_function")
            cases = key.get("cases")
            if not isinstance(entry, str) or not entry.isidentifier():
                raise ValueError("Code task requires a valid entry_function")
            if not isinstance(cases, list) or not 1 <= len(cases) <= 50:
                raise ValueError("Code task requires 1-50 hidden tests")
            if len(json.dumps(key, ensure_ascii=False, default=repr).encode("utf-8")) > 250_000:
                raise ValueError("Code task test specification is too large")

        requested = max(0.0, min(1.0, float(target_difficulty)))
        candidate_difficulty = max(0.0, min(1.0, float(raw.get("difficulty", requested))))
        if abs(candidate_difficulty - requested) > 0.20:
            raise ValueError("Generated item difficulty is outside the requested adaptive window")
        return {
            "stem": stem,
            "answer_type": answer_type,
            "options": [str(o)[:1000] for o in options],
            "answer_key": key,
            "goal": str(raw.get("goal") or "Targeted adaptive check")[:1000],
            "expected_evidence": str(raw.get("expected_evidence") or "Correctness and reasoning")[:1000],
            "validation_state": "generated_unvalidated",
            "difficulty": candidate_difficulty,
            "required_modalities": list(key.get("required_modalities") or []) if isinstance(key, dict) else [],
        }

    def _validate_generated_content(
        self,
        *,
        frame: DecisionFrame,
        budget: SemanticBudget,
        item: dict[str, Any],
        subject_id: str,
        concept_name: str,
        source_excerpt: str,
    ) -> dict[str, Any]:
        """Require independent semantic validation only for newly generated items."""
        verdict = self.semantic.validate_assessment(
            frame=frame, budget=budget, item=item, subject_id=subject_id, concept_name=concept_name, source_excerpt=source_excerpt
        )
        if verdict is None:
            raise ValueError("Generated item validation budget/provider unavailable")
        accepted = bool(verdict.get("accepted"))
        confidence = float(verdict.get("confidence", 0.0))
        if not accepted or confidence < 0.55:
            raise ValueError("Generated item failed independent validation")
        validated = dict(item)
        validated["validation_state"] = "generated_validated"
        validated["validation"] = {
            "accepted": True,
            "confidence": max(0.0, min(1.0, confidence)),
            "reason": str(verdict.get("reason") or "validated")[:1000],
        }
        return validated

    def _persist_generated_item(self, user_id: str, subject_id: str, plan: DecisionFrame, item: dict[str, Any]) -> str:
        item_id = str(uuid4())
        now = _now()
        model = self.models.settings.mimo_model or self.models.settings.tutor_model or "deterministic-fallback"
        answer_type = str(item.get("answer_type") or "free_text")
        center = round(float(item.get("difficulty", plan.target_difficulty)) * 10.0) / 10.0
        bucket_key = hashlib.sha256(
            f"{subject_id}|{plan.target_concept_id}|{answer_type}|{model}|{center:.1f}".encode("utf-8")
        ).hexdigest()
        bucket = self.db.fetchone(
            "SELECT difficulty_posterior FROM item_calibration_buckets WHERE bucket_key=?",
            (bucket_key,),
        )
        prior = float(item.get("difficulty", plan.target_difficulty))
        posterior = float(bucket["difficulty_posterior"]) if bucket else prior
        self.db.execute(
            """
            INSERT INTO generated_items(
              generated_item_id,owner_user_id,subject_id,concept_id,generation_id,generator_model,
              requested_difficulty,difficulty_prior,difficulty_posterior,calibration_bucket_key,
              item_json,validation_json,created_at,updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                item_id,
                user_id,
                subject_id,
                plan.target_concept_id,
                str(uuid4()),
                model,
                plan.target_difficulty,
                prior,
                posterior,
                bucket_key,
                self.db.dumps(item),
                self.db.dumps(item.get("validation") or {"state": item["validation_state"]}),
                now,
                now,
            ),
        )
        if not bucket:
            self.db.execute(
                """
                INSERT OR IGNORE INTO item_calibration_buckets(
                  bucket_key,subject_id,concept_id,answer_type,generator_model,
                  requested_difficulty_center,difficulty_posterior,updated_at
                ) VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    bucket_key,
                    subject_id,
                    plan.target_concept_id,
                    answer_type,
                    model,
                    center,
                    prior,
                    now,
                ),
            )
        return item_id

    # ------------------------------------------------------------------
    # Evaluation + calibration
    # ------------------------------------------------------------------
    def _evaluate_current(
        self,
        owner_user_id: str,
        learner_user_id: str,
        session_row: Any,
        state: dict[str, Any],
        move: dict[str, Any],
        turn: LearningTurnInput,
        *,
        event_id: str | None = None,
        budget: SemanticBudget | None = None,
    ) -> dict[str, Any]:
        item_id = move.get("generated_item_id")
        score: float | None = None
        correct: bool | None = None
        evaluator_confidence = 0.3
        item: dict[str, Any] = {}
        evaluation_public: dict[str, Any] | None = None
        effective_difficulty = float(move.get("target_difficulty", 0.5) or 0.5)
        if item_id:
            item_row = self.db.fetchone(
                "SELECT * FROM generated_items WHERE generated_item_id=? AND owner_user_id=?",
                (item_id, owner_user_id),
            )
            if item_row:
                item = self.db.loads(item_row["item_json"], {})
                result = self.evidence_engine.evaluate(item, self._normalize_submission(turn), budget=budget)
                score, correct, evaluator_confidence = result.score, result.correct, result.confidence
                evaluation_public = result.public_dict()
                # Use the best calibrated difficulty available for the learner
                # update rather than always trusting requested generation difficulty.
                effective_difficulty = float(item_row["difficulty_posterior"] or effective_difficulty)
                self._calibrate_item(item_row, score, turn)

        behavior = ResponseBehavior(
            response_seconds=turn.response_seconds,
            hint_count=turn.hint_count,
            attempt_count=turn.attempt_count,
            self_confidence=turn.confidence,
            evaluator_confidence=evaluator_confidence,
        )
        memory_session_id = state.get("memory_session_id")
        event_result: dict[str, Any] = {
            "evaluation": evaluation_public,
            "score": score,
            "correct": correct,
            "evaluator_confidence": evaluator_confidence,
        }
        # An unverified score is not evidence of proficiency. Do not feed it to
        # BKT/IRT, adaptive state, proof of learning, or durable evidence logs.
        if memory_session_id and score is not None:
            event = EvidenceEvent(
                event_id=event_id or str(uuid4()),
                session_id=memory_session_id,
                user_id=learner_user_id,
                subject_id=session_row["subject_id"],
                concept_ids=[move.get("target_concept_id") or session_row["concept_id"]],
                primary_concept_id=move.get("target_concept_id") or session_row["concept_id"],
                activity_type="dynamic_teaching_turn",
                input_mode="code" if turn.code else ("ocr" if turn.input_mode in {"image", "handwriting", "diagram", "mixed"} else turn.input_mode),
                correct=correct,
                score=score,
                evidence_strength=1.0 if score is not None else 0.15,
                # Local-first persistence stores derived evidence only.  Raw
                # learner text/code is kept out of the SQLite shadow entirely so
                # a crash cannot turn an ephemeral session into a transcript log.
                response_text=(None if self.memory_mode == "local_first" else ((turn.code or turn.response)[:20_000] or None)),
                metadata={
                    "generated_item_id": item_id,
                    "source_question_id": item.get("source_question_id"),
                    "question_difficulty": effective_difficulty,
                    "difficulty": effective_difficulty,
                    "irt": {
                        "a": 1.0,
                        "c": (1.0 / len(item.get("options") or [])) if item.get("answer_type") == "mcq" and len(item.get("options") or []) >= 2 else (0.5 if item.get("answer_type") == "boolean" else 0.0),
                    },
                    "behavior": behavior.model_dump(mode="json"),
                    "assessment_evaluation": evaluation_public,
                    "teaching_session_id": session_row["teaching_session_id"],
                    "teaching_program": move.get("teaching_plan") or {},
                },
            )
            states, diagnosis, adaptive = self.curator.record(event)
            proof_state = self.proof_learning.record(
                event=event,
                requested_dimension=str(move.get("evidence_dimension") or "acquisition"),
                assistance_level=int(move.get("assistance_level", 0) or 0),
                persist=bool(state.get("persist_personalization", True)),
            )
            public_states = []
            for concept_state in states:
                payload = concept_state.model_dump(mode="json")
                payload.pop("user_id", None)
                public_states.append(payload)
            adaptive_payload = adaptive.model_dump(mode="json")
            adaptive_payload.pop("user_id", None)
            event_result.update(
                {
                    "event_id": event.event_id,
                    "states": public_states,
                    "diagnosis": diagnosis.model_dump(mode="json"),
                    "adaptive": adaptive_payload,
                    "proof_learning": proof_state,
                }
            )
        return event_result

    @staticmethod
    def _normalize_submission(turn: LearningTurnInput) -> AnswerSubmission:
        if turn.submission is not None:
            parts = list(turn.submission.parts)
            if not parts and (turn.response or turn.code or turn.numeric_value is not None or turn.selected_option is not None):
                return AnswerSubmission.from_legacy(turn)
            return turn.submission
        return AnswerSubmission.from_legacy(turn)

    def _calibrate_item(self, row: Any, score: float | None, turn: LearningTurnInput) -> None:
        if score is None:
            return
        attempts = int(row["attempt_count"]) + 1
        independent = int(row["independent_attempt_count"])
        hinted = int(row["hinted_count"]) + (1 if turn.hint_count or turn.attempt_count > 1 else 0)
        correct_count = float(row["correct_count"]) + score
        clean = turn.hint_count == 0 and turn.attempt_count == 1
        if clean:
            independent += 1

        prior = float(row["difficulty_prior"])
        # Per-item estimate is deliberately conservative because dynamically
        # generated items are usually seen only once by a learner.
        clean_success = score if clean else None
        if clean_success is None:
            posterior = float(row["difficulty_posterior"])
        else:
            posterior = (5.0 * prior + (1.0 - clean_success)) / 6.0
        status = "provisional"

        bucket_key = row["calibration_bucket_key"]
        if bucket_key:
            bucket = self.db.fetchone(
                "SELECT * FROM item_calibration_buckets WHERE bucket_key=?",
                (bucket_key,),
            )
            if bucket:
                b_attempts = int(bucket["attempt_count"]) + 1
                b_independent = int(bucket["independent_attempt_count"]) + (1 if clean else 0)
                b_correct = float(bucket["correct_sum"]) + (score if clean else 0.0)
                b_hinted = int(bucket["hinted_or_retried_count"]) + (0 if clean else 1)
                if b_independent:
                    success_rate = b_correct / b_independent
                    empirical_difficulty = 1.0 - success_rate
                    center = float(bucket["requested_difficulty_center"])
                    b_posterior = (8.0 * center + b_independent * empirical_difficulty) / (8.0 + b_independent)
                else:
                    b_posterior = float(bucket["difficulty_posterior"])
                status = "provisional" if b_independent < 5 else ("estimated" if b_independent < 30 else "calibrated")
                self.db.execute(
                    """
                    UPDATE item_calibration_buckets SET
                      attempt_count=?,independent_attempt_count=?,correct_sum=?,hinted_or_retried_count=?,
                      difficulty_posterior=?,calibration_status=?,updated_at=?
                    WHERE bucket_key=?
                    """,
                    (
                        b_attempts,
                        b_independent,
                        b_correct,
                        b_hinted,
                        b_posterior,
                        status,
                        _now(),
                        bucket_key,
                    ),
                )
                posterior = b_posterior

        self.db.execute(
            """
            UPDATE generated_items SET attempt_count=?,independent_attempt_count=?,correct_count=?,hinted_count=?,
              difficulty_posterior=?,calibration_status=?,updated_at=?
            WHERE generated_item_id=?
            """,
            (attempts, independent, correct_count, hinted, posterior, status, _now(), row["generated_item_id"]),
        )

    def _consume_teaching_suggestion(self, owner_user_id: str, session_id: str) -> str | None:
        row = self.db.fetchone(
            """SELECT suggestion_id,suggestion FROM teaching_suggestions
            WHERE teaching_session_id=? AND owner_user_id=? AND status='pending'
            ORDER BY created_at ASC LIMIT 1""",
            (session_id, owner_user_id),
        )
        if not row:
            return None
        self.db.execute(
            "UPDATE teaching_suggestions SET status='used_as_context',resolved_at=? WHERE suggestion_id=? AND status='pending'",
            (_now(), row["suggestion_id"]),
        )
        return str(row["suggestion"])[:4000]

    # ------------------------------------------------------------------
    # Local-first learner-state bridge
    # ------------------------------------------------------------------
    def _hydrate_local_first_state(
        self, *, learner_user_id: str, subject_id: str, capsule: dict[str, Any]
    ) -> None:
        """Hydrate only a bounded, typed learner-state projection into an ephemeral shadow user.

        Raw event ledgers are deliberately not accepted. The shadow state exists only
        for the lifetime of this teaching session and is scrubbed on completion.
        """
        now = _now()
        # Browser local-first handoff stores recent full state deltas under
        # local_state_deltas.  Hydrate from the newest compatible projection so
        # a new session does not silently start from zero after a page reload.
        projection = dict(capsule)
        deltas = capsule.get("local_state_deltas")
        if isinstance(deltas, list):
            for candidate in reversed(deltas[-10:]):
                if not isinstance(candidate, dict):
                    continue
                if candidate.get("subject_id") not in {None, subject_id}:
                    continue
                for key in ("concept_states", "adaptive_states", "proof_states", "proof_summary"):
                    if key in candidate and key not in projection:
                        projection[key] = candidate[key]
                break
        raw_states = projection.get("concept_states") or projection.get("states") or []
        if isinstance(raw_states, dict):
            raw_states = [dict({"concept_id": key}, **(value if isinstance(value, dict) else {})) for key, value in raw_states.items()]
        if not isinstance(raw_states, list):
            raw_states = []
        for item in raw_states[:250]:
            if not isinstance(item, dict):
                continue
            concept_id = str(item.get("concept_id") or "").strip()
            concept = self.db.fetchone(
                "SELECT subject_id FROM concepts WHERE concept_id=?", (concept_id,)
            )
            if not concept or concept["subject_id"] != subject_id:
                continue
            try:
                mastery = max(0.0, min(1.0, float(item.get("mastery_belief", item.get("mastery", 0.2)))))
                confidence = max(0.0, min(1.0, float(item.get("confidence", 0.0))))
                evidence_count = max(0, min(1_000_000, int(item.get("evidence_count", 0))))
                recurrence = max(0, min(1_000_000, int(item.get("recurrence_count", 0))))
            except (TypeError, ValueError):
                continue
            status = str(item.get("status") or "unknown")[:64]
            last_observed = item.get("last_observed_at")
            self.db.execute(
                """INSERT OR REPLACE INTO concept_state(
                user_id,concept_id,mastery_belief,confidence,evidence_count,last_observed_at,status,recurrence_count,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?)""",
                (learner_user_id, concept_id, mastery, confidence, evidence_count, last_observed, status, recurrence, now),
            )

        raw_adaptive = projection.get("adaptive_states") or []
        if isinstance(raw_adaptive, dict):
            raw_adaptive = [dict({"concept_id": key}, **(value if isinstance(value, dict) else {})) for key, value in raw_adaptive.items()]
        if not isinstance(raw_adaptive, list):
            raw_adaptive = []
        for item in raw_adaptive[:250]:
            if not isinstance(item, dict):
                continue
            concept_id = str(item.get("concept_id") or "").strip()
            concept = self.db.fetchone(
                "SELECT subject_id FROM concepts WHERE concept_id=?", (concept_id,)
            )
            if not concept or concept["subject_id"] != subject_id:
                continue
            try:
                theta = max(-6.0, min(6.0, float(item.get("theta", 0.0))))
                variance = max(0.01, min(25.0, float(item.get("variance", 2.25))))
                target = max(0.0, min(1.0, float(item.get("target_difficulty", 0.5))))
                observations = max(0, min(1_000_000, int(item.get("observations", 0))))
                micro = max(0, min(1_000_000, int(item.get("micro_stage_position", 0))))
            except (TypeError, ValueError):
                continue
            band = str(item.get("difficulty_band") or "medium")[:32]
            profile = str(item.get("behavior_profile") or "insufficient_evidence")[:128]
            self.db.execute(
                """INSERT OR REPLACE INTO adaptive_state(
                user_id,subject_id,concept_id,theta,variance,target_difficulty,difficulty_band,observations,micro_stage_position,behavior_profile,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (learner_user_id, subject_id, concept_id, theta, variance, target, band, observations, micro, profile, now),
            )

        raw_proof = projection.get("proof_states") or projection.get("proof_learning") or []
        if isinstance(raw_proof, dict):
            raw_proof = raw_proof.get("states") or []
        if isinstance(raw_proof, list):
            self.proof_learning.hydrate(user_id=learner_user_id, subject_id=subject_id, states=raw_proof)

    def _state_delta_for_client(
        self, learner_user_id: str, subject_id: str, persist_personalization: bool
    ) -> dict[str, Any]:
        if persist_personalization:
            delta = self._snapshot_state(learner_user_id, subject_id)
            delta["personalization_enabled"] = True
            delta["persist"] = True
            return delta
        return {
            "memory_mode": self.memory_mode,
            "subject_id": subject_id,
            "personalization_enabled": False,
            "persist": False,
            "concept_states": [],
            "adaptive_states": [],
            "proof_states": [],
            "gap_hypotheses": [],
            "events": [],
            "merge_semantics": "do_not_persist",
            "generated_at": _now(),
        }

    def _snapshot_state(self, learner_user_id: str, subject_id: str) -> dict[str, Any]:
        concept_rows = self.db.fetchall(
            """SELECT s.* FROM concept_state s JOIN concepts c ON c.concept_id=s.concept_id
            WHERE s.user_id=? AND c.subject_id=? ORDER BY s.concept_id LIMIT 500""",
            (learner_user_id, subject_id),
        )
        adaptive_rows = self.db.fetchall(
            "SELECT * FROM adaptive_state WHERE user_id=? AND subject_id=? ORDER BY concept_id LIMIT 500",
            (learner_user_id, subject_id),
        )
        gaps = self.db.fetchall(
            "SELECT target_concept_id,gap_concept_id,probability,source,updated_at FROM gap_hypotheses WHERE user_id=? ORDER BY probability DESC LIMIT 200",
            (learner_user_id,),
        )
        proof_snapshot = self.proof_learning.snapshot(user_id=learner_user_id, subject_id=subject_id)
        event_rows = self.db.fetchall(
            """SELECT event_id,timestamp,subject_id,primary_concept_id,concept_ids_json,correct,score,
            evidence_strength,mistake_type,metadata_json FROM learning_events
            WHERE user_id=? AND subject_id=? ORDER BY timestamp,event_id LIMIT 500""",
            (learner_user_id, subject_id),
        )
        return {
            "memory_mode": self.memory_mode,
            "subject_id": subject_id,
            "concept_states": [
                {
                    "concept_id": r["concept_id"],
                    "mastery_belief": r["mastery_belief"],
                    "confidence": r["confidence"],
                    "evidence_count": r["evidence_count"],
                    "last_observed_at": r["last_observed_at"],
                    "status": r["status"],
                    "recurrence_count": r["recurrence_count"],
                } for r in concept_rows
            ],
            "adaptive_states": [
                {
                    "concept_id": r["concept_id"],
                    "theta": r["theta"],
                    "variance": r["variance"],
                    "target_difficulty": r["target_difficulty"],
                    "difficulty_band": r["difficulty_band"],
                    "observations": r["observations"],
                    "micro_stage_position": r["micro_stage_position"],
                    "behavior_profile": r["behavior_profile"],
                } for r in adaptive_rows
            ],
            "gap_hypotheses": [dict(r) for r in gaps],
            "proof_states": proof_snapshot.get("states", []),
            "proof_summary": proof_snapshot.get("summary", {}),
            "events": [
                {
                    "event_id": r["event_id"],
                    "timestamp": r["timestamp"],
                    "subject_id": r["subject_id"],
                    "primary_concept_id": r["primary_concept_id"],
                    "concept_ids": self.db.loads(r["concept_ids_json"], []),
                    "correct": None if r["correct"] is None else bool(r["correct"]),
                    "score": r["score"],
                    "evidence_strength": r["evidence_strength"],
                    "mistake_type": r["mistake_type"],
                    "metadata": self.db.loads(r["metadata_json"], {}),
                } for r in event_rows
            ],
            "merge_semantics": "deduplicate_by_event_id_then_replay_in_timestamp_order",
            "generated_at": _now(),
        }

    def _expire_stale_local_first_shadows(self, *, owner_user_id: str, ttl_hours: int = 24) -> int:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=max(1, ttl_hours))).isoformat()
        rows = self.db.fetchall(
            "SELECT teaching_session_id,state_json FROM teaching_sessions "
            "WHERE owner_user_id=? AND status='active' AND updated_at<?",
            (owner_user_id, cutoff),
        )
        expired = 0
        for row in rows:
            state = self.db.loads(row["state_json"], {})
            engine_id = str(state.get("engine_user_id") or "")
            if state.get("memory_mode") != "local_first" or not engine_id.startswith(f"lf:{owner_user_id}:"):
                continue
            state_delta = state.get("state_delta") or {"memory_mode": "local_first", "expired": True}
            public_state = {
                "memory_mode": "local_first",
                "current_move": state.get("current_move"),
                "turn_count": int(state.get("turn_count", 0)),
                "state_delta": state_delta,
                "expired": True,
            }
            now = _now()
            self.db.execute(
                "UPDATE teaching_sessions SET status='expired',ended_at=?,updated_at=?,state_json=? "
                "WHERE teaching_session_id=? AND owner_user_id=? AND status='active'",
                (now, now, self.db.dumps(public_state), row["teaching_session_id"], owner_user_id),
            )
            self._cleanup_shadow_state(engine_id)
            expired += 1
        return expired

    def _cleanup_shadow_state(self, learner_user_id: str) -> None:
        if not learner_user_id.startswith("lf:"):
            return
        with self.db.transaction() as conn:
            # sessions cascades learning_events, interventions and session summaries
            conn.execute("DELETE FROM sessions WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM concept_state WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM adaptive_state WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM gap_hypotheses WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM proof_learning_events WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM proof_learning_state WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM compacted_history WHERE user_id=?", (learner_user_id,))
            conn.execute("DELETE FROM privacy_settings WHERE user_id=?", (learner_user_id,))

    # ------------------------------------------------------------------
    def _session(self, user_id: str, session_id: str) -> Any:
        row = self.db.fetchone(
            "SELECT * FROM teaching_sessions WHERE teaching_session_id=? AND owner_user_id=?",
            (session_id, user_id),
        )
        if not row:
            raise ValueError("Unknown teaching session")
        return row

    def _save_state(self, session_id: str, user_id: str, state: dict[str, Any]) -> None:
        self.db.execute(
            "UPDATE teaching_sessions SET state_json=?,updated_at=? WHERE teaching_session_id=? AND owner_user_id=?",
            (self.db.dumps(state), _now(), session_id, user_id),
        )

    @staticmethod
    def _bounded_capsule(value: dict[str, Any]) -> dict[str, Any]:
        # Fail closed on huge/inappropriate capsules. This is a safe projection,
        # not a raw event-database transport.
        encoded = json.dumps(value, ensure_ascii=False)
        if len(encoded.encode("utf-8")) > 32_000:
            raise ValueError("Context capsule is too large")
        blocked = {"password", "api_key", "access_token", "refresh_token", "raw_event_ledger", "secret", "token"}
        def scan(node: Any, depth: int = 0) -> None:
            if depth > 8:
                raise ValueError("Context capsule is nested too deeply")
            if isinstance(node, dict):
                for key, child in node.items():
                    lowered = str(key).strip().lower()
                    if lowered in blocked or lowered.endswith("_password") or lowered.endswith("_secret") or lowered.endswith("_token"):
                        raise ValueError("Context capsule contains a forbidden field")
                    scan(child, depth + 1)
            elif isinstance(node, list):
                for child in node[:500]:
                    scan(child, depth + 1)
        scan(value)
        return value

    @staticmethod
    def _public_decision_frame(frame: DecisionFrame) -> dict[str, Any]:
        """Privacy-safe, inspectable control-plane projection for clients."""
        return {
            "decision_id": frame.decision_id,
            "target_concept_id": frame.target_concept_id,
            "target_difficulty": frame.target_difficulty,
            "action": frame.action,
            "learner_reason": frame.learner_reason,
            "learner_intent": frame.learner_intent,
            "source_mode": frame.source_mode,
            "semantic_tier": frame.semantic_tier,
            "semantic_requirement": frame.semantic_requirement,
            "model_call_budget": frame.model_call_budget,
            "selected_question_id": frame.selected_question_id,
            "reason_codes": frame.reason_codes,
            "invariants": frame.invariants,
            "sovereignty": frame.sovereignty,
            "proof_learning": frame.proof_learning,
        }

    @staticmethod
    def _decision_trace(frame: DecisionFrame) -> dict[str, Any]:
        return {
            "controller": "DecisionKernel",
            "decision_id": frame.decision_id,
            "summary": frame.summary,
            "path": "code" if frame.semantic_tier == 0 else f"semantic_t{frame.semantic_tier}",
            "semantic_requirement": frame.semantic_requirement,
            "model_call_budget": frame.model_call_budget,
            "research_calls_used": frame.research_calls_used,
            "reason_codes": frame.reason_codes,
            "invariants": frame.invariants,
            "principle": "AI renders bounded semantic work; deterministic code owns state and control.",
        }
