from __future__ import annotations

from typing import Any

from .adaptive import AdaptiveEngine
from .learning import LearnerEngine
from .memory import MemoryService
from .schemas import AdaptiveState, DiagnosisResult, EvidenceEvent


class MemoryCurator:
    """Single logical writer for learner evidence and derived state.

    The Decision Kernel is read-only with respect to mastery. All learner-state
    mutation continues to flow through this deterministic owner.
    """

    def __init__(self, learner: LearnerEngine, adaptive: AdaptiveEngine, memory: MemoryService):
        self.learner = learner
        self.adaptive = adaptive
        self.memory = memory

    def record(self, event: EvidenceEvent) -> tuple[list[Any], DiagnosisResult, AdaptiveState]:
        with self.memory.write_lock:
            states, diagnosis = self.learner.compute_event_update(event)
            adaptive_state = self.adaptive.update_from_event(event, persist=False)
            if self.memory.personalization_enabled(event.user_id):
                self.memory.commit_learning_update(
                    event=event,
                    states=states,
                    hypotheses=diagnosis.hypotheses,
                    target_concept_id=event.primary_concept_id,
                    adaptive_state=adaptive_state,
                )
            return states, diagnosis, adaptive_state

    def close_session(self, session_id: str) -> dict[str, Any]:
        return self.memory.complete_session(session_id)

    def rebuild_subject_after_curriculum_update(self, subject_id: str) -> int:
        with self.memory.write_lock:
            concept_ids = {
                row["concept_id"]
                for row in self.memory.db.fetchall(
                    "SELECT concept_id FROM concepts WHERE subject_id=?", (subject_id,)
                )
            }
            if not concept_ids:
                return 0
            users = {
                row["user_id"]
                for row in self.memory.db.fetchall(
                    "SELECT DISTINCT user_id FROM learning_events WHERE subject_id=?",
                    (subject_id,),
                )
            }
            with self.memory.db.transaction() as conn:
                conn.execute(
                    """
                    DELETE FROM gap_hypotheses
                    WHERE target_concept_id IN (SELECT concept_id FROM concepts WHERE subject_id=?)
                       OR gap_concept_id IN (SELECT concept_id FROM concepts WHERE subject_id=?)
                    """,
                    (subject_id, subject_id),
                )
            for user_id in sorted(users):
                self.learner.rebuild_user_state(user_id, concept_ids)
                self.adaptive.rebuild_user_state(user_id, concept_ids)
            return len(users)

    def delete_and_rebuild(
        self,
        *,
        user_id: str,
        subject_id: str | None,
        start_at: Any,
        end_at: Any,
        delete_all: bool,
    ) -> set[str]:
        affected = self.memory.delete_memory(
            user_id=user_id,
            subject_id=subject_id,
            start_at=start_at,
            end_at=end_at,
            delete_all=delete_all,
        )

        clauses = ["owner_user_id=?"]
        params: list[Any] = [user_id]
        if subject_id:
            clauses.append("subject_id=?"); params.append(subject_id)
        if start_at:
            clauses.append("updated_at>=?"); params.append(start_at.isoformat())
        if end_at:
            clauses.append("created_at<=?"); params.append(end_at.isoformat())
        if delete_all:
            clauses = ["owner_user_id=?"]; params = [user_id]
        session_rows = self.memory.db.fetchall(
            f"SELECT teaching_session_id,state_json FROM teaching_sessions WHERE {' AND '.join(clauses)}",
            tuple(params),
        )
        teaching_ids = [r["teaching_session_id"] for r in session_rows]
        shadow_user_ids: set[str] = set()
        for r in session_rows:
            state = self.memory.db.loads(r["state_json"], {})
            engine_id = str(state.get("engine_user_id") or "")
            if engine_id.startswith(f"lf:{user_id}:"):
                shadow_user_ids.add(engine_id)

        with self.memory.write_lock, self.memory.db.transaction() as conn:
            for shadow_id in shadow_user_ids:
                conn.execute("DELETE FROM sessions WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM concept_state WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM adaptive_state WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM gap_hypotheses WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM proof_learning_events WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM proof_learning_state WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM compacted_history WHERE user_id=?", (shadow_id,))
                conn.execute("DELETE FROM privacy_settings WHERE user_id=?", (shadow_id,))
            if teaching_ids:
                for start in range(0, len(teaching_ids), 300):
                    batch = teaching_ids[start:start + 300]
                    placeholders = ",".join("?" for _ in batch)
                    conn.execute(f"DELETE FROM handoff_tokens WHERE user_id=? AND teaching_session_id IN ({placeholders})", (user_id, *batch))
                    conn.execute(f"DELETE FROM external_learning_inbox WHERE user_id=? AND external_session_id IN ({placeholders})", (user_id, *batch))
                    conn.execute(f"DELETE FROM teaching_sessions WHERE owner_user_id=? AND teaching_session_id IN ({placeholders})", (user_id, *batch))

            item_clauses = ["owner_user_id=?"]
            item_params: list[Any] = [user_id]
            if subject_id:
                item_clauses.append("subject_id=?"); item_params.append(subject_id)
            if start_at:
                item_clauses.append("created_at>=?"); item_params.append(start_at.isoformat())
            if end_at:
                item_clauses.append("created_at<=?"); item_params.append(end_at.isoformat())
            conn.execute(f"DELETE FROM generated_items WHERE {' AND '.join(item_clauses)}", tuple(item_params))
            conn.execute("DELETE FROM mcp_context_relay WHERE user_id=?", (user_id,))
            if delete_all:
                conn.execute("DELETE FROM external_learning_inbox WHERE user_id=?", (user_id,))
                conn.execute("DELETE FROM handoff_tokens WHERE user_id=?", (user_id,))

        if not delete_all and affected:
            self.learner.rebuild_user_state(user_id, affected)
            self.adaptive.rebuild_user_state(user_id, affected)
        return affected
