from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from .database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _iso_age_days(value: str | None) -> float:
    if not value:
        return 3650.0
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0)
    except (TypeError, ValueError):
        return 3650.0


@dataclass(slots=True)
class TeachingProgramCandidate:
    program_id: str
    representation_sequence: list[str]
    organization: str
    reasoning_form: str
    interaction: str
    chunk_size: str
    depth: str
    scaffolding: float
    assessment_intent: str
    source_strategy: str
    predicted_utility: float = 0.5
    uncertainty: float = 1.0
    evidence_weight: float = 0.0
    reason: str = "insufficient personalized evidence"
    composition_trace: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "program_id": self.program_id,
            "representation_sequence": self.representation_sequence,
            "organization": self.organization,
            "reasoning_form": self.reasoning_form,
            "interaction": self.interaction,
            "chunk_size": self.chunk_size,
            "depth": self.depth,
            "scaffolding": round(self.scaffolding, 4),
            "assessment_intent": self.assessment_intent,
            "source_strategy": self.source_strategy,
            "predicted_utility": round(self.predicted_utility, 4),
            "uncertainty": round(self.uncertainty, 4),
            "evidence_weight": round(self.evidence_weight, 4),
            "reason": self.reason,
            "composition_trace": self.composition_trace,
        }


class DynamicTeachingPolicy:
    """Online, state-dependent teaching-program policy.

    The policy never stores a durable "visual/story/facts learner" label. It
    composes candidate programs from the *current* diagnosis, goal, source assets,
    context and requested move, then scores them against temporally weighted
    state/action/outcome history. Evidence can therefore reverse a previous choice
    without mutating a learner personality profile.
    """

    def __init__(self, db: Database):
        self.db = db

    @staticmethod
    def _program_id(payload: dict[str, Any]) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]

    def _candidate(
        self,
        *,
        representation_sequence: list[str],
        organization: str,
        reasoning_form: str,
        interaction: str,
        chunk_size: str,
        depth: str,
        scaffolding: float,
        assessment_intent: str,
        source_strategy: str = "canonical_truth_plus_contextual_explanation",
        composition_trace: list[str] | None = None,
    ) -> TeachingProgramCandidate:
        raw = {
            "representation_sequence": representation_sequence,
            "organization": organization,
            "reasoning_form": reasoning_form,
            "interaction": interaction,
            "chunk_size": chunk_size,
            "depth": depth,
            "scaffolding": round(scaffolding, 3),
            "assessment_intent": assessment_intent,
            "source_strategy": source_strategy,
        }
        return TeachingProgramCandidate(
            program_id=self._program_id(raw),
            composition_trace=list(composition_trace or []),
            **raw,
        )

    @staticmethod
    def _available(context: dict[str, Any]) -> set[str]:
        return {str(x) for x in (context.get("learning_ir_types") or [])}

    def _compose_candidates(
        self,
        *,
        requested_action: str,
        mode: str,
        diagnosis: dict[str, Any],
        context: dict[str, Any],
    ) -> list[TeachingProgramCandidate]:
        hypotheses = diagnosis.get("hypotheses") or []
        # Causal evidence refines policy only when independent evidence is sufficient;
        # otherwise the learner-state diagnosis remains the fallback.
        top_source = str(
            diagnosis.get("causal_cause_type") or diagnosis.get("iris_cause_type")
            or (hypotheses[0].get("source") if hypotheses else "direct")
        )
        low_evidence = not bool(diagnosis.get("confident"))
        exam_like = bool(context.get("exam_mode") or mode in {"review", "calibration"})
        short_time = str(context.get("time_budget") or "").lower() in {"short", "urgent", "rapid"}
        available = self._available(context)
        has_visual = bool(available.intersection({"visual_reference"})) or bool(context.get("visual_assets"))
        has_example = bool(available.intersection({"example", "procedure"}))
        has_rule = bool(available.intersection({"definition", "equation_or_rule", "claim", "terminology"}))
        source_strategy = (
            "canonical_truth_plus_contextual_explanation"
            if context.get("course_scoped")
            else "best_authorized_source_with_provenance"
        )
        candidates: list[TeachingProgramCandidate] = []

        def add(**kwargs: Any) -> None:
            candidate = self._candidate(source_strategy=source_strategy, **kwargs)
            if all(c.program_id != candidate.program_id for c in candidates):
                candidates.append(candidate)

        if requested_action in {"diagnose", "ask", "practice", "reassess"}:
            intent = "diagnostic" if requested_action == "diagnose" else ("verification" if requested_action == "reassess" else "learning")
            add(
                representation_sequence=["independent_question", "evidence_capture", "minimal_feedback"],
                organization="problem_first", reasoning_form="diagnostic_discrimination" if intent == "diagnostic" else "procedural",
                interaction="independent_retrieval", chunk_size="micro", depth="targeted",
                scaffolding=0.02 if intent == "verification" else 0.12, assessment_intent=intent,
                composition_trace=["requested assessment move", f"intent={intent}"],
            )
            if intent != "verification":
                add(
                    representation_sequence=["micro_scaffold", "independent_question", "feedback"],
                    organization="guided_then_problem", reasoning_form="causal_chain",
                    interaction="guided_then_independent", chunk_size="micro", depth="targeted",
                    scaffolding=0.30, assessment_intent=intent,
                    composition_trace=["uncertainty-aware assessment", "light scaffold before evidence"],
                )
            return candidates

        # Causal repair candidates are synthesized before generic explanation.
        if top_source in {"prerequisite", "component"} or requested_action == "prerequisite_rewind":
            add(
                representation_sequence=["prerequisite_bridge", "worked_micro_example", "return_check"],
                organization="dependency_first", reasoning_form="causal_chain", interaction="repair_then_return",
                chunk_size="micro", depth="repair", scaffolding=0.55, assessment_intent="diagnostic",
                composition_trace=["causal/prerequisite evidence", "goal-stack repair path"],
            )
        if top_source == "misconception":
            add(
                representation_sequence=["rival_models", "contrast_example", "discrimination_check"],
                organization="comparison_first", reasoning_form="contrastive", interaction="predict_then_correct",
                chunk_size="micro", depth="repair", scaffolding=0.40, assessment_intent="diagnostic",
                composition_trace=["misconception hypothesis", "discriminating evidence required"],
            )

        if has_visual:
            add(
                representation_sequence=["source_visual", "relational_walkthrough", "reconstruction_check"],
                organization="structure_first", reasoning_form="spatial_relational", interaction="observe_then_reconstruct",
                chunk_size="micro" if short_time else "standard", depth="exam" if exam_like else "conceptual",
                scaffolding=0.36, assessment_intent="learning",
                composition_trace=["current source contains visual evidence", "representation available now"],
            )
        if has_example:
            add(
                representation_sequence=["source_worked_example", "prediction_pause", "novel_transfer_check"],
                organization="example_first", reasoning_form="procedural", interaction="guided_prediction",
                chunk_size="standard", depth="applied", scaffolding=0.42, assessment_intent="learning",
                composition_trace=["current source contains example/procedure", "transfer-oriented follow-up"],
            )
        if has_rule or not available:
            add(
                representation_sequence=["concept_frame", "structured_explanation", "retrieval_check"],
                organization="overview_first", reasoning_form="causal_chain", interaction="explain_then_predict",
                chunk_size="micro" if short_time else "standard", depth="exam" if exam_like else "conceptual",
                scaffolding=0.32, assessment_intent="learning",
                composition_trace=["fact/definition source available" if has_rule else "cold-start general explanation"],
            )

        # These are optional transaction candidates, not learner types. They are
        # included so outcome evidence can show when narrative/contrast/fact-first
        # organization works for this state and when it does not.
        add(
            representation_sequence=["contrast_map", "explanation", "discrimination_check"],
            organization="comparison_first", reasoning_form="contrastive", interaction="contrast_then_recall",
            chunk_size="micro", depth="targeted", scaffolding=0.28,
            assessment_intent="diagnostic" if low_evidence else "learning",
            composition_trace=["candidate for rival-concept separation"],
        )
        if exam_like or short_time:
            add(
                representation_sequence=["required_facts", "dense_explanation", "rapid_recall"],
                organization="definition_first", reasoning_form="fact_structured", interaction="direct_then_recall",
                chunk_size="micro", depth="exam", scaffolding=0.18,
                assessment_intent="verification" if exam_like else "learning",
                composition_trace=["current goal/time context favors compact factual path"],
            )
        else:
            add(
                representation_sequence=["context_hook", "causal_story", "concept_mapping", "application_check"],
                organization="context_first", reasoning_form="narrative_causal", interaction="story_then_apply",
                chunk_size="standard", depth="conceptual", scaffolding=0.33, assessment_intent="learning",
                composition_trace=["alternative representation for controlled outcome comparison"],
            )
        return candidates[:8]

    @staticmethod
    def _program_similarity(old: dict[str, Any], candidate: TeachingProgramCandidate) -> float:
        if not old:
            return 0.0
        score = 0.0
        if old.get("organization") == candidate.organization:
            score += 0.22
        if old.get("reasoning_form") == candidate.reasoning_form:
            score += 0.22
        if old.get("interaction") == candidate.interaction:
            score += 0.18
        if old.get("assessment_intent") == candidate.assessment_intent:
            score += 0.12
        old_seq = set(old.get("representation_sequence") or [])
        new_seq = set(candidate.representation_sequence)
        if old_seq and new_seq:
            score += 0.26 * (len(old_seq & new_seq) / len(old_seq | new_seq))
        return score

    @staticmethod
    def _context_similarity(event: dict[str, Any], current: dict[str, Any]) -> float:
        weight = 0.0
        if event.get("concept_id") == current.get("concept_id"):
            weight += 1.0
        elif event.get("subject_id") == current.get("subject_id"):
            weight += 0.30
        event_ctx = event.get("context") or {}
        current_ctx = current.get("context") or {}
        if event_ctx.get("mode") == current_ctx.get("mode"):
            weight += 0.18
        if event_ctx.get("goal_kind") and event_ctx.get("goal_kind") == current_ctx.get("goal_kind"):
            weight += 0.14
        if event_ctx.get("diagnosis_source") and event_ctx.get("diagnosis_source") == current_ctx.get("diagnosis_source"):
            weight += 0.22
        for key, bonus in (
            ("interaction_mode", 0.07), ("exam_mode", 0.08), ("revision_goal", 0.06),
            ("teacher_mode", 0.05), ("time_budget", 0.05),
        ):
            if event_ctx.get(key) is not None and event_ctx.get(key) == current_ctx.get(key):
                weight += bonus

        # State/action/outcome reuse should actually depend on learner state.
        # The previous program stores the bounded learner-state snapshot that existed at
        # selection time.  Compare only stable numeric/decision fields; never
        # infer a durable "learning style" from them.
        old_state = (event.get("state_before") or {}).get("learner_state") or {}
        new_state = current.get("learner_state") or {}
        old_adaptive = old_state.get("adaptive") or {}
        new_adaptive = new_state.get("adaptive") or {}
        if old_adaptive and new_adaptive:
            try:
                theta_delta = abs(float(old_adaptive.get("theta", 0.0)) - float(new_adaptive.get("theta", 0.0)))
                weight += 0.18 * math.exp(-theta_delta / 1.25)
            except (TypeError, ValueError):
                pass
            try:
                diff_delta = abs(float(old_adaptive.get("target_difficulty", 0.5)) - float(new_adaptive.get("target_difficulty", 0.5)))
                weight += 0.14 * max(0.0, 1.0 - diff_delta / 0.50)
            except (TypeError, ValueError):
                pass
            if old_adaptive.get("behavior_profile") and old_adaptive.get("behavior_profile") == new_adaptive.get("behavior_profile"):
                weight += 0.08
        old_diag = old_state.get("diagnosis") or {}
        new_diag = new_state.get("diagnosis") or {}
        if old_diag.get("recommended_action") and old_diag.get("recommended_action") == new_diag.get("recommended_action"):
            weight += 0.10
        return weight

    @staticmethod
    def _outcome_value(event: dict[str, Any]) -> float | None:
        if event.get("outcome_score") is None:
            return None
        value = float(event["outcome_score"])
        details = event.get("outcome") or {}
        # Stronger evidence if later/transfer measures exist; immediate correctness
        # remains useful but cannot dominate a durable learning signal.
        delayed = details.get("delayed_retention")
        transfer = details.get("transfer")
        if isinstance(delayed, (int, float)):
            value = 0.70 * value + 0.30 * float(delayed)
        if isinstance(transfer, (int, float)):
            value = 0.75 * value + 0.25 * float(transfer)
        return _clamp(value)

    def choose(
        self,
        *,
        user_id: str,
        subject_id: str,
        concept_id: str,
        requested_action: str,
        mode: str,
        diagnosis: dict[str, Any],
        context: dict[str, Any] | None = None,
        learner_state: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        context = dict(context or {})
        hypotheses = diagnosis.get("hypotheses") or []
        context.setdefault("mode", mode)
        context.setdefault(
            "diagnosis_source",
            str(diagnosis.get("causal_cause_type") or diagnosis.get("iris_cause_type") or (hypotheses[0].get("source") if hypotheses else "unknown")),
        )
        context.setdefault("goal_kind", "repair" if requested_action == "prerequisite_rewind" else "primary")
        candidates = self._compose_candidates(
            requested_action=requested_action, mode=mode, diagnosis=diagnosis, context=context
        )

        rows = self.db.fetchall(
            """SELECT subject_id,concept_id,program_id,teaching_program_json,outcome_score,independent,
                      context_json,state_before_json,state_after_json,outcome_json,created_at
               FROM pedagogy_events WHERE user_id=? AND subject_id=? ORDER BY created_at DESC LIMIT 500""",
            (user_id, subject_id),
        )
        history: list[dict[str, Any]] = []
        for row in rows:
            history.append({
                "subject_id": row["subject_id"], "concept_id": row["concept_id"], "program_id": row["program_id"],
                "program": self.db.loads(row["teaching_program_json"], {}),
                "outcome_score": row["outcome_score"], "independent": bool(row["independent"]),
                "context": self.db.loads(row["context_json"], {}),
                "state_before": self.db.loads(row["state_before_json"], {}),
                "state_after": self.db.loads(row["state_after_json"], {}),
                "outcome": self.db.loads(row["outcome_json"], {}), "created_at": row["created_at"],
            })

        current = {"subject_id": subject_id, "concept_id": concept_id, "context": context, "learner_state": learner_state or {}}
        for candidate in candidates:
            weighted_sum = 0.0
            total_weight = 0.0
            direct_matches = 0
            generalized_matches = 0
            for event in history:
                outcome = self._outcome_value(event)
                if outcome is None:
                    continue
                context_sim = self._context_similarity(event, current)
                program_sim = 1.0 if event["program_id"] == candidate.program_id else self._program_similarity(event["program"], candidate)
                if context_sim <= 0 or program_sim < 0.20:
                    continue
                # 90-day half-life with a floor keeps long-term procedural memory
                # informative without allowing years-old evidence to dominate now.
                recency = max(0.20, 0.5 ** (_iso_age_days(event.get("created_at")) / 90.0))
                weight = context_sim * program_sim * recency
                if event["independent"]:
                    weight *= 1.25
                weighted_sum += weight * outcome
                total_weight += weight
                if event["concept_id"] == concept_id and event["program_id"] == candidate.program_id:
                    direct_matches += 1
                elif program_sim >= 0.45:
                    generalized_matches += 1

            prior = 0.55
            if candidate.assessment_intent == "diagnostic" and not diagnosis.get("confident"):
                prior += 0.04
            if requested_action == "prerequisite_rewind" and candidate.depth == "repair":
                prior += 0.08
            if mode == "review" and candidate.depth == "exam":
                prior += 0.04
            # Explicit preference is turn-level evidence only and is intentionally
            # weaker than verified outcomes.
            explicit = str(context.get("explicit_representation_request") or "").casefold()
            if explicit and any(explicit in step.casefold() for step in candidate.representation_sequence):
                prior += 0.03
            # Cap historical influence without breaking the weighted mean.  The
            # previous implementation capped only the denominator, so a long
            # history could push the mean above 1.0 and make many candidates
            # saturate at the clamp ceiling.  Rescale numerator and denominator
            # together so the posterior remains a true bounded weighted mean.
            if total_weight > 0.0:
                history_scale = min(1.0, 14.0 / total_weight)
                posterior_weight = total_weight * history_scale
                posterior_sum = weighted_sum * history_scale
                mean_utility = (3.0 * prior + posterior_sum) / (3.0 + posterior_weight)
            else:
                posterior_weight = 0.0
                mean_utility = prior
            candidate.evidence_weight = total_weight
            candidate.uncertainty = _clamp(1.0 / math.sqrt(1.0 + total_weight))
            # Small deterministic exploration bonus prevents a single early winner
            # from suppressing all alternatives forever while remaining reproducible.
            explore = 0.025 * candidate.uncertainty if total_weight < 4.0 else 0.0
            candidate.predicted_utility = _clamp(mean_utility + explore)
            if total_weight:
                candidate.reason = (
                    f"ranked from {total_weight:.2f} temporally weighted outcome evidence; "
                    f"{direct_matches} direct and {generalized_matches} structurally similar prior program(s)"
                )
            else:
                candidate.reason = "cold-start state/source/context prior; outcome evidence will update this transaction policy"

        candidates.sort(key=lambda c: (c.predicted_utility, -c.uncertainty, c.program_id), reverse=True)
        selected = candidates[0]
        return {
            "selected": selected.to_dict(),
            "alternatives": [c.to_dict() for c in candidates[1:5]],
            "policy_state": "personalized" if selected.evidence_weight >= 1.0 else "cold_start_dynamic",
            "principle": "No static learning-style label is stored; teaching programs are composed and ranked from current state plus outcome evidence.",
            "context": context,
            "candidate_count": len(candidates),
        }

    def record_outcome(
        self,
        *,
        user_id: str,
        subject_id: str,
        concept_id: str,
        teaching_session_id: str,
        teaching_program: dict[str, Any] | None,
        score: float | None,
        correct: bool | None,
        independent: bool,
        context: dict[str, Any] | None = None,
        state_before: dict[str, Any] | None = None,
        state_after: dict[str, Any] | None = None,
        outcome_details: dict[str, Any] | None = None,
    ) -> None:
        if not teaching_program:
            return
        # Privacy is a hard persistence boundary.  Dynamic pedagogy history is
        # personalized learner state too, so an explicit personalization pause
        # must suppress it even if a caller forgets to guard the call.
        privacy = self.db.fetchone(
            "SELECT personalization_enabled FROM privacy_settings WHERE user_id=?",
            (user_id,),
        )
        if privacy is not None and not bool(privacy["personalization_enabled"]):
            return
        program_id = str(teaching_program.get("program_id") or "")
        if not program_id or (score is None and correct is None):
            return
        outcome = float(score) if score is not None else (1.0 if correct else 0.0)
        details = dict(outcome_details or {})
        details.setdefault("immediate_score", _clamp(outcome))
        details.setdefault("correct", correct)
        details.setdefault("independent", bool(independent))
        self.db.execute(
            """INSERT INTO pedagogy_events(
                 pedagogy_event_id,user_id,subject_id,concept_id,teaching_session_id,program_id,
                 teaching_program_json,outcome_score,independent,context_json,state_before_json,
                 state_after_json,outcome_json,created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                str(uuid4()), user_id, subject_id, concept_id, teaching_session_id, program_id,
                self.db.dumps(teaching_program), _clamp(outcome), int(independent), self.db.dumps(context or {}),
                self.db.dumps(state_before or {}), self.db.dumps(state_after or {}), self.db.dumps(details), _now(),
            ),
        )


class LearnerTwinService:
    """Dynamic, multi-timescale learner projection.

    This service is read-only. The learner-state layer remains the sole state writer.
    The twin exposes slow knowledge state, recent domain trajectory, current-session
    procedural evidence and the latest turn without freezing any representation
    preference into a personality category.
    """

    def __init__(self, db: Database):
        self.db = db

    def snapshot(self, *, user_id: str, subject_id: str | None = None) -> dict[str, Any]:
        params: list[Any] = [user_id]
        clause = "cs.user_id=?"
        if subject_id:
            clause += " AND c.subject_id=?"
            params.append(subject_id)
        states = self.db.fetchall(
            f"""SELECT cs.*,c.subject_id,c.name AS concept_name,a.theta,a.variance,a.target_difficulty,a.observations
                FROM concept_state cs JOIN concepts c ON c.concept_id=cs.concept_id
                LEFT JOIN adaptive_state a ON a.user_id=cs.user_id AND a.concept_id=cs.concept_id
                WHERE {clause} ORDER BY cs.updated_at DESC LIMIT 250""",
            tuple(params),
        )
        event_params: list[Any] = [user_id]
        event_clause = "user_id=?"
        if subject_id:
            event_clause += " AND subject_id=?"
            event_params.append(subject_id)
        events = self.db.fetchall(
            f"""SELECT event_id,session_id,subject_id,primary_concept_id,timestamp,activity_type,input_mode,
                       correct,score,evidence_strength,mistake_type,metadata_json
                FROM learning_events WHERE {event_clause} ORDER BY timestamp DESC LIMIT 80""",
            tuple(event_params),
        )
        pedagogy = self.db.fetchall(
            f"""SELECT subject_id,concept_id,program_id,teaching_program_json,outcome_score,independent,
                       context_json,state_before_json,state_after_json,outcome_json,created_at
                FROM pedagogy_events WHERE {event_clause} ORDER BY created_at DESC LIMIT 120""",
            tuple(event_params),
        )
        sessions = self.db.fetchall(
            f"SELECT session_id,subject_id,started_at,ended_at,status,goal,source FROM sessions WHERE {event_clause} ORDER BY started_at DESC LIMIT 20",
            tuple(event_params),
        )
        proof_rows = self.db.fetchall(
            f"""SELECT p.*,c.name AS concept_name FROM proof_learning_state p
                JOIN concepts c ON c.concept_id=p.concept_id
                WHERE {clause.replace('cs.', 'p.')} ORDER BY p.updated_at DESC LIMIT 250""",
            tuple(params),
        )

        procedural: dict[str, dict[str, Any]] = {}
        for row in pedagogy:
            key = str(row["program_id"])
            bucket = procedural.setdefault(key, {
                "program_id": key,
                "teaching_program": self.db.loads(row["teaching_program_json"], {}),
                "observations": 0,
                "weighted_outcome_sum": 0.0,
                "independent_count": 0,
                "last_used_at": row["created_at"],
            })
            if row["outcome_score"] is not None:
                recency = max(0.20, 0.5 ** (_iso_age_days(row["created_at"]) / 90.0))
                bucket["weighted_outcome_sum"] += recency * float(row["outcome_score"])
                bucket["observations"] += recency
            bucket["independent_count"] += int(bool(row["independent"]))
        procedural_view = []
        for bucket in procedural.values():
            denom = float(bucket.pop("observations"))
            bucket["effective_observations"] = round(denom, 3)
            bucket["mean_outcome"] = round(float(bucket.pop("weighted_outcome_sum")) / denom, 3) if denom else None
            procedural_view.append(bucket)
        procedural_view.sort(key=lambda x: (x["effective_observations"], x["last_used_at"]), reverse=True)

        latest_event = None
        if events:
            row = events[0]
            latest_event = {
                **{k: row[k] for k in row.keys() if k != "metadata_json"},
                "metadata": self.db.loads(row["metadata_json"], {}),
            }

        proof_states = []
        for row in proof_rows:
            assisted_mass = float(row["assisted_mass"] or 0.0)
            independent_mass = float(row["independent_mass"] or 0.0)
            proof_states.append({
                "concept_id": row["concept_id"], "concept_name": row["concept_name"],
                "acquisition": round(float(row["acquisition"]), 4),
                "independent": round(float(row["independent"]), 4),
                "transfer": round(float(row["transfer"]), 4),
                "retention": round(float(row["retention"]), 4),
                "evidence_quality": round(float(row["evidence_quality"]), 4),
                "uncertainty": round(float(row["uncertainty"]), 4),
                "assistance_gap": None if row["assistance_gap"] is None else round(float(row["assistance_gap"]), 4),
                "assisted_performance": round(float(row["assisted_sum"]) / assisted_mass, 4) if assisted_mass else None,
                "evidence_mass": {
                    "acquisition": round(float(row["acquisition_mass"]), 3),
                    "independent": round(independent_mass, 3),
                    "transfer": round(float(row["transfer_mass"]), 3),
                    "retention": round(float(row["retention_mass"]), 3),
                },
                "next_retention_check_at": row["next_retention_check_at"],
                "retention_interval_days": int(row["retention_interval_days"] or 3),
            })

        return {
            "subject_id": subject_id,
            "generated_at": _now(),
            "principle": "Dynamic multi-timescale state only; no permanent visual/story/disorder learning-style label.",
            "long_term": [dict(row) for row in states[:120]],
            "domain_state": {
                "recent_concepts": [dict(row) for row in states[:30]],
                "recent_sessions": [dict(row) for row in sessions[:12]],
                "recent_learning_events": [
                    {**{k: row[k] for k in row.keys() if k != "metadata_json"}, "metadata": self.db.loads(row["metadata_json"], {})}
                    for row in events[:24]
                ],
            },
            "session_state": {
                "recent_teaching_outcomes": [
                    {
                        "subject_id": row["subject_id"], "concept_id": row["concept_id"], "program_id": row["program_id"],
                        "teaching_program": self.db.loads(row["teaching_program_json"], {}),
                        "outcome_score": row["outcome_score"], "independent": bool(row["independent"]),
                        "context": self.db.loads(row["context_json"], {}), "outcome": self.db.loads(row["outcome_json"], {}),
                        "created_at": row["created_at"],
                    }
                    for row in pedagogy[:16]
                ]
            },
            "turn_state": latest_event,
            "procedural_memory": procedural_view[:12],
            "pedagogy_evidence_count": len(pedagogy),
            "proof_learning": {
                "states": proof_states,
                "principle": "Assisted success is not automatically independent, retained, transferable competence.",
            },
        }
