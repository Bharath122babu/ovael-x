"""Recoverable learning turns: atomic evidence, then atomic delivery.

Provider work runs outside SQLite write transactions. An evidence_committed
turn is durable and resumes on the same request key without grading again.
"""
from uuid import NAMESPACE_URL, uuid4, uuid5
from contextlib import contextmanager
from datetime import datetime, timezone
import logging
from .inference import SemanticBudget
from .turn_runtime import request_hash, replay


def _prior(s, session_id, key, digest):
    row = s.db.fetchone("SELECT * FROM teaching_turns WHERE teaching_session_id=? AND idempotency_key=?",
                        (session_id, key))
    if row and row["request_hash"] and row["request_hash"] != digest:
        raise ValueError("Idempotency key belongs to a different answer")
    return row


def _privacy(s, user_id, state):
    enabled = s.memory.personalization_enabled(user_id)
    state["persist_personalization"] = enabled
    engine_id = str(state.get("engine_user_id") or user_id)
    if engine_id != user_id:
        s.memory.set_personalization(engine_id, enabled)
    return enabled


def _access(s, user_id, row):
    if row["status"] != "active":
        raise ValueError("Teaching session is not active")
    if row["course_id"] and not s.db.fetchone(
        """SELECT 1 FROM courses c JOIN subjects s ON s.subject_id=c.subject_id LEFT JOIN course_enrollments e
        ON e.course_id=c.course_id AND e.learner_user_id=? AND e.status='active'
        WHERE c.course_id=? AND (c.owner_user_id=? OR e.learner_user_id=?)
        AND (c.subject_id NOT LIKE 'USR:%' OR s.owner_user_id=c.owner_user_id)""",
        (user_id, row["course_id"], user_id, user_id),
    ):
        raise ValueError("Course access has been revoked")


@contextmanager
def _delivery_transaction(s, move):
    try:
        with s.memory.write_lock, s.db.transaction():
            yield
    except BaseException:
        # The candidate never became the delivered move if this transaction
        # rolled back. Its assessment is safe to discard; evidence stays pending.
        if move.generated_item_id:
            try:
                s.db.execute("DELETE FROM generated_items WHERE generated_item_id=?", (move.generated_item_id,))
            except Exception:
                logging.getLogger(__name__).exception("Undelivered assessment cleanup failed")
        raise


def run_turn(s, *, user_id, session_id, turn, idempotency_key, committed_request_hash=None):
    if not idempotency_key or len(idempotency_key) > 128:
        raise ValueError("Invalid idempotency key")
    digest = committed_request_hash or request_hash(s.db, turn, s._normalize_submission(turn))
    with s._session_locks.hold(session_id):
        row = s._session(user_id, session_id)
        prior = _prior(s, session_id, idempotency_key, digest)
        if prior and prior["status"] == "completed":
            return replay(s.db, prior, row)
        _access(s, user_id, row)
        if row["pending_turn_id"] and (not prior or row["pending_turn_id"] != prior["turn_id"]):
            raise ValueError("Retry the pending turn with its original idempotency key first")
        budget = SemanticBudget(3, decision_id=f"turn:{session_id}:{idempotency_key}")
        initial_state = s.db.loads(row["state_json"], {})
        current = initial_state.get("current_move") or {}
        # Only grading can contact a provider here. No learning state is mutated.
        evaluation = None
        if not prior and turn.learner_intent == "answer" and current.get("generated_item_id"):
            item = s.db.fetchone("SELECT item_json FROM generated_items WHERE generated_item_id=? AND owner_user_id=?",
                                 (current["generated_item_id"], user_id))
            if item:
                evaluation = s.evidence_engine.evaluate(s.db.loads(item["item_json"], {}),
                                                        s._normalize_submission(turn), budget=budget)
        # Recheck after grading and join all evidence writers into one transaction.
        with s.memory.write_lock, s.db.transaction():
            row = s._session(user_id, session_id)
            prior = _prior(s, session_id, idempotency_key, digest)
            if prior and prior["status"] == "completed":
                return replay(s.db, prior, row)
            _access(s, user_id, row)
            if row["pending_turn_id"] and (not prior or row["pending_turn_id"] != prior["turn_id"]):
                raise ValueError("Another turn is pending; retry it first")
            state = s.db.loads(row["state_json"], {})
            learner_id = str(state.get("engine_user_id") or user_id)
            enabled = _privacy(s, user_id, state)
            if prior:
                turn_id = prior["turn_id"]
                evidence = s.db.loads(prior["evidence_json"], {})
            else:
                if (state.get("current_move") or {}).get("move_id") != current.get("move_id"):
                    raise ValueError("The current assessment changed; reload before answering")
                turn_id = str(uuid4())
                event_id = str(uuid5(NAMESPACE_URL, f"ovael:{user_id}:{session_id}:{idempotency_key}"))
                normalized = s.io.learning_turn(
                    user_id=user_id, course_id=row["course_id"], subject_id=row["subject_id"],
                    concept_id=str(current.get("target_concept_id") or row["concept_id"]),
                    input_mode=turn.input_mode, response=turn.response, selected_option=turn.selected_option,
                    numeric_value=turn.numeric_value, code=turn.code, learner_intent=turn.learner_intent,
                    metadata={"hint_count": turn.hint_count, "attempt_count": turn.attempt_count,
                              "response_seconds": turn.response_seconds}, event_id=event_id,
                ).model_dump(mode="json")
                normalized.pop("content", None)
                if s.memory_mode == "local_first" or not enabled:
                    normalized.get("metadata", {}).pop("numeric_value", None)
                    normalized.get("metadata", {}).pop("selected_option", None)
                state["last_normalized_event"] = normalized
                if turn.learner_intent == "answer":
                    evidence = s._evaluate_current(user_id, learner_id, row, state, current, turn,
                                                   event_id=event_id, budget=budget,
                                                   evaluation_result=evaluation)
                else:
                    evidence = {"evaluation": None, "score": None, "correct": None,
                                "evaluator_confidence": 0.0, "non_assessment_turn": True}
                _record_policy(s, user_id, learner_id, row, state, current, turn, evidence, enabled)
                s._update_goal_stack_after_evidence(state, evidence, root_concept_id=row["concept_id"])
                payload = ({"redacted": True, "sha256": digest, "response_present": True}
                           if s.memory_mode == "local_first" or not enabled else turn.model_dump(mode="json"))
                evidence["inference"] = budget.snapshot()
                s.db.execute("""INSERT INTO teaching_turns(
                    turn_id,teaching_session_id,owner_user_id,idempotency_key,learner_response_json,
                    evidence_json,move_json,created_at,status,request_hash)
                    VALUES(?,?,?,?,?,?,'{}',?,'evidence_committed',?)""",
                    (turn_id, session_id, user_id, idempotency_key, s.db.dumps(payload),
                     s.db.dumps(evidence), _now(s), digest))
                s.db.execute("""UPDATE teaching_sessions SET state_json=?,pending_turn_id=?,
                    version=version+1,updated_at=? WHERE teaching_session_id=? AND owner_user_id=?""",
                    (s.db.dumps(state), turn_id, _now(s), session_id, user_id))
            version = s._session(user_id, session_id)["version"]

        # Persisted evidence is recoverable if generation or final delivery fails.
        # A resumed request has its own per-request provider budget.
        concept = s._active_goal_concept(state, fallback=str(current.get("target_concept_id") or row["concept_id"]))
        move, plan = s._next_move(
            learner_user_id=learner_id, content_user_id=user_id, subject_id=row["subject_id"],
            concept_id=concept, mode=row["mode"], query=turn.response or concept,
            course_id=row["course_id"], teaching_session_id=session_id,
            learner_intent=turn.learner_intent, budget=budget,
        )
        evidence["inference"] = budget.snapshot()
        state["turn_count"] = int(state.get("turn_count", 0)) + 1
        s._sync_goal_stack_from_plan(state, plan, root_concept_id=row["concept_id"])
        state["current_move"] = move.model_dump(mode="json")
        with _delivery_transaction(s, move):
            latest = s._session(user_id, session_id)
            prior = _prior(s, session_id, idempotency_key, digest)
            if prior and prior["status"] == "completed":
                delivered = s.db.loads(prior["move_json"], {})
                if move.generated_item_id and move.generated_item_id != delivered.get("generated_item_id"):
                    s.db.execute("DELETE FROM generated_items WHERE generated_item_id=?", (move.generated_item_id,))
                return replay(s.db, prior, latest)
            _access(s, user_id, latest)
            if latest["version"] != version or latest["pending_turn_id"] != turn_id:
                raise ValueError("Session changed while rendering; retry the same turn")
            enabled = _privacy(s, user_id, state)
            state_delta = s._state_delta_for_client(learner_id, row["subject_id"], enabled)
            state["state_delta"] = state_delta
            response = {
                "teaching_session_id": session_id, "turn_id": turn_id, "idempotent_replay": False,
                "evidence": evidence, "gap_update": evidence.get("gap_update"),
                "move": move.model_dump(mode="json"), "state_delta": state_delta,
                "decision_summary": plan.summary,
            }
            s.db.execute("""UPDATE teaching_turns SET status='completed',evidence_json=?,move_json=?,response_json=?
                WHERE turn_id=? AND status='evidence_committed'""",
                (s.db.dumps(evidence), s.db.dumps(response["move"]), s.db.dumps(response), turn_id))
            s._save_state(session_id, user_id, state)
            s.db.execute("UPDATE teaching_sessions SET pending_turn_id=NULL,version=version+1 WHERE teaching_session_id=?",
                         (session_id,))
        return response


def _now(s):
    return datetime.now(timezone.utc).isoformat()


def _record_policy(s, user_id, learner_id, row, state, current, turn, evidence, enabled):
    gap = s.decision.forensics(user_id=learner_id, case_owner_user_id=user_id,
                              subject_id=row["subject_id"], max_cases=6, persist=enabled)
    evidence["gap_update"] = gap
    if enabled and evidence.get("score") is not None:
        s.pedagogy_policy.record_outcome(
            user_id=user_id, subject_id=row["subject_id"],
            concept_id=str(current.get("target_concept_id") or row["concept_id"]),
            teaching_session_id=row["teaching_session_id"], teaching_program=current.get("teaching_plan"),
            score=evidence.get("score"), correct=evidence.get("correct"),
            independent=turn.hint_count == 0 and turn.attempt_count == 1,
            context={"mode": row["mode"], "learner_intent": turn.learner_intent,
                     "previous_action": current.get("action"), "interaction_mode": turn.input_mode},
            state_before={"goal_stack": list(state.get("goal_stack") or []),
                          "current_move": {k: current.get(k) for k in ("action", "target_concept_id", "target_difficulty")},
                          "learner_state": dict((current.get("teaching_plan") or {}).get("learner_state") or {})},
            state_after={"concept_states": evidence.get("states") or [], "gap_summary": gap.get("summary") or {}},
            outcome_details={"immediate_score": evidence.get("score"), "correct": evidence.get("correct"),
                             "hint_count": turn.hint_count, "attempt_count": turn.attempt_count,
                             "response_seconds": turn.response_seconds, "input_mode": turn.input_mode},
        )
