from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from .database import Database
from .schemas import EvidenceEvent, ResponseBehavior


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _parse_ts(value: Any) -> str | None:
    """Normalize a client-carried timestamp to aware UTC ISO text, or None if unusable."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return _iso(parsed)


@dataclass(slots=True, frozen=True)
class SovereigntyDecision:
    assistance_level: int
    assistance_label: str
    action: str
    evidence_dimension: str
    reason: str


class ProofOfLearningService:
    """Evidence-dimensional learning projection.

    This intentionally does not replace the canonical learner-state/BKT layer, which owns the concept
    mastery belief. Proof-of-Learning answers a different question: what kind of
    competence has actually been demonstrated (acquisition, independent use,
    transfer, and delayed retention), and how large is the gap between assisted
    and independent performance?

    It is deterministic and auditable. Its scores are internal evidence indices,
    not psychometric claims or universal probabilities of human competence.
    """

    DIMENSIONS = {"acquisition", "independent", "transfer", "retention", "diagnostic"}

    def __init__(self, db: Database):
        self.db = db

    @staticmethod
    def classify_dimension(*, requested: str | None, independent: bool) -> str:
        value = str(requested or "").strip().lower()
        if value in ProofOfLearningService.DIMENSIONS:
            if value == "diagnostic":
                return value
            # A claimed independent check with hints/retries is not independent.
            if value == "independent" and not independent:
                return "acquisition"
            return value
        return "independent" if independent else "acquisition"

    @staticmethod
    def _quality(event: EvidenceEvent, behavior: ResponseBehavior) -> float:
        q = _clamp(event.evidence_strength)
        if behavior.evaluator_confidence is not None:
            q *= max(0.10, _clamp(behavior.evaluator_confidence))
        # Repeated attempts and hints do not erase useful acquisition evidence,
        # but they reduce how much a single observation can move the proof state.
        if behavior.hint_count:
            q /= 1.0 + 0.20 * behavior.hint_count
        if behavior.attempt_count > 1:
            q /= 1.0 + 0.10 * (behavior.attempt_count - 1)
        return _clamp(q)

    @staticmethod
    def _mean(total: float, mass: float) -> float:
        return _clamp(total / mass) if mass > 1e-9 else 0.0

    @staticmethod
    def _confidence(total_mass: float) -> float:
        # Saturating evidence-sufficiency curve; deliberately conservative.
        if total_mass <= 0.0:
            return 0.0
        return _clamp(1.0 - 2.0 ** (-total_mass / 5.0))

    def get(self, *, user_id: str, subject_id: str, concept_id: str) -> dict[str, Any]:
        row = self.db.fetchone(
            "SELECT * FROM proof_learning_state WHERE user_id=? AND subject_id=? AND concept_id=?",
            (user_id, subject_id, concept_id),
        )
        if not row:
            return {
                "user_id": user_id,
                "subject_id": subject_id,
                "concept_id": concept_id,
                "acquisition": 0.0,
                "independent": 0.0,
                "transfer": 0.0,
                "retention": 0.0,
                "evidence_quality": 0.0,
                "uncertainty": 1.0,
                "assistance_gap": None,
                "evidence_mass": {"acquisition": 0.0, "independent": 0.0, "transfer": 0.0, "retention": 0.0},
                "next_retention_check_at": None,
                "retention_interval_days": 3,
                "status": "insufficient_evidence",
            }
        return self._public(dict(row))

    def snapshot(self, *, user_id: str, subject_id: str | None = None, limit: int = 250) -> dict[str, Any]:
        params: list[Any] = [user_id]
        clause = "p.user_id=?"
        if subject_id:
            clause += " AND p.subject_id=?"
            params.append(subject_id)
        rows = self.db.fetchall(
            f"""SELECT p.*,c.name AS concept_name FROM proof_learning_state p
                JOIN concepts c ON c.concept_id=p.concept_id
                WHERE {clause} ORDER BY p.updated_at DESC LIMIT ?""",
            (*params, max(1, min(limit, 1000))),
        )
        states = [self._public(dict(row)) for row in rows]
        gaps = [s["assistance_gap"] for s in states if isinstance(s.get("assistance_gap"), (int, float))]
        due = sum(1 for s in states if s.get("retention_due"))
        return {
            "subject_id": subject_id,
            "generated_at": _iso(_now()),
            "principle": "Assisted performance is evidence of acquisition, not automatic proof of independent retained transferable competence.",
            "states": states,
            "summary": {
                "concepts": len(states),
                "mean_assistance_gap": round(sum(gaps) / len(gaps), 4) if gaps else None,
                "retention_checks_due": due,
                "independently_verified": sum(1 for s in states if s["status"] in {"independent_verified", "transfer_verified", "retained"}),
                "transfer_verified": sum(1 for s in states if s["status"] in {"transfer_verified", "retained"}),
                "retained": sum(1 for s in states if s["status"] == "retained"),
            },
        }

    def due_retention(self, *, user_id: str, subject_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        now = _iso(_now())
        params: list[Any] = [user_id, now]
        clause = "p.user_id=? AND p.next_retention_check_at IS NOT NULL AND p.next_retention_check_at<=?"
        if subject_id:
            clause += " AND p.subject_id=?"
            params.append(subject_id)
        rows = self.db.fetchall(
            f"""SELECT p.*,c.name AS concept_name FROM proof_learning_state p
                JOIN concepts c ON c.concept_id=p.concept_id
                WHERE {clause} ORDER BY p.next_retention_check_at ASC LIMIT ?""",
            (*params, max(1, min(limit, 200))),
        )
        return [self._public(dict(r)) for r in rows]

    def record(
        self,
        *,
        event: EvidenceEvent,
        requested_dimension: str | None,
        assistance_level: int,
        persist: bool = True,
    ) -> dict[str, Any]:
        raw_behavior = event.metadata.get("behavior") or {}
        try:
            behavior = ResponseBehavior.model_validate(raw_behavior if isinstance(raw_behavior, dict) else {})
        except ValueError:
            behavior = ResponseBehavior()
        independent = behavior.hint_count == 0 and behavior.attempt_count == 1 and int(assistance_level) <= 2
        dimension = self.classify_dimension(requested=requested_dimension, independent=independent)
        score = event.score
        if score is None and event.correct is not None:
            score = 1.0 if event.correct else 0.0
        if score is None:
            return self.get(user_id=event.user_id, subject_id=event.subject_id, concept_id=event.primary_concept_id)
        score = _clamp(float(score))
        quality = self._quality(event, behavior)
        if quality <= 0.0:
            return self.get(user_id=event.user_id, subject_id=event.subject_id, concept_id=event.primary_concept_id)

        previous = self.db.fetchone(
            "SELECT * FROM proof_learning_state WHERE user_id=? AND subject_id=? AND concept_id=?",
            (event.user_id, event.subject_id, event.primary_concept_id),
        )
        state = dict(previous) if previous else {
            "user_id": event.user_id,
            "subject_id": event.subject_id,
            "concept_id": event.primary_concept_id,
            "acquisition_sum": 0.0, "acquisition_mass": 0.0,
            "independent_sum": 0.0, "independent_mass": 0.0,
            "transfer_sum": 0.0, "transfer_mass": 0.0,
            "retention_sum": 0.0, "retention_mass": 0.0,
            "assisted_sum": 0.0, "assisted_mass": 0.0,
            "retention_interval_days": 3,
            "next_retention_check_at": None,
        }

        # Every graded task contributes to acquisition/performance evidence.
        state["acquisition_sum"] = float(state.get("acquisition_sum") or 0.0) + score * quality
        state["acquisition_mass"] = float(state.get("acquisition_mass") or 0.0) + quality

        if independent:
            state["independent_sum"] = float(state.get("independent_sum") or 0.0) + score * quality
            state["independent_mass"] = float(state.get("independent_mass") or 0.0) + quality
        else:
            state["assisted_sum"] = float(state.get("assisted_sum") or 0.0) + score * quality
            state["assisted_mass"] = float(state.get("assisted_mass") or 0.0) + quality

        if dimension == "transfer":
            state["transfer_sum"] = float(state.get("transfer_sum") or 0.0) + score * quality
            state["transfer_mass"] = float(state.get("transfer_mass") or 0.0) + quality
        elif dimension == "retention":
            state["retention_sum"] = float(state.get("retention_sum") or 0.0) + score * quality
            state["retention_mass"] = float(state.get("retention_mass") or 0.0) + quality

        acq = self._mean(state["acquisition_sum"], state["acquisition_mass"])
        indep = self._mean(state["independent_sum"], state["independent_mass"])
        transfer = self._mean(state["transfer_sum"], state["transfer_mass"])
        retention = self._mean(state["retention_sum"], state["retention_mass"])
        assisted_mean = self._mean(state["assisted_sum"], state["assisted_mass"])
        gap = None
        if state["assisted_mass"] > 0 and state["independent_mass"] > 0:
            gap = max(-1.0, min(1.0, assisted_mean - indep))
        total_mass = (
            float(state["acquisition_mass"]) + float(state["independent_mass"]) +
            float(state["transfer_mass"]) + float(state["retention_mass"])
        )
        evidence_quality = self._confidence(total_mass)
        uncertainty = 1.0 - evidence_quality

        interval = int(state.get("retention_interval_days") or 3)
        next_retention = state.get("next_retention_check_at")
        now = _now()
        # Independent success creates the first delayed check. Successful delayed
        # retrieval expands the interval; failure shortens it without erasing history.
        if dimension == "retention":
            if score >= 0.70:
                interval = min(30, max(3, interval * 2))
            else:
                interval = 3
            next_retention = _iso(now + timedelta(days=interval))
        elif independent and score >= 0.70 and not next_retention:
            interval = max(3, interval)
            next_retention = _iso(now + timedelta(days=interval))

        payload = {
            "user_id": event.user_id,
            "subject_id": event.subject_id,
            "concept_id": event.primary_concept_id,
            "acquisition": acq,
            "independent": indep,
            "transfer": transfer,
            "retention": retention,
            "evidence_quality": evidence_quality,
            "uncertainty": uncertainty,
            "assistance_gap": gap,
            **{k: state[k] for k in (
                "acquisition_sum", "acquisition_mass", "independent_sum", "independent_mass",
                "transfer_sum", "transfer_mass", "retention_sum", "retention_mass",
                "assisted_sum", "assisted_mass",
            )},
            "last_evidence_at": _iso(event.timestamp),
            "next_retention_check_at": next_retention,
            "retention_interval_days": interval,
            "updated_at": _iso(now),
        }
        if persist:
            self.db.execute(
                """INSERT INTO proof_learning_state(
                    user_id,subject_id,concept_id,acquisition,independent,transfer,retention,evidence_quality,uncertainty,assistance_gap,
                    acquisition_sum,acquisition_mass,independent_sum,independent_mass,transfer_sum,transfer_mass,retention_sum,retention_mass,
                    assisted_sum,assisted_mass,last_evidence_at,next_retention_check_at,retention_interval_days,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(user_id,subject_id,concept_id) DO UPDATE SET
                    acquisition=excluded.acquisition,independent=excluded.independent,transfer=excluded.transfer,retention=excluded.retention,
                    evidence_quality=excluded.evidence_quality,uncertainty=excluded.uncertainty,assistance_gap=excluded.assistance_gap,
                    acquisition_sum=excluded.acquisition_sum,acquisition_mass=excluded.acquisition_mass,
                    independent_sum=excluded.independent_sum,independent_mass=excluded.independent_mass,
                    transfer_sum=excluded.transfer_sum,transfer_mass=excluded.transfer_mass,
                    retention_sum=excluded.retention_sum,retention_mass=excluded.retention_mass,
                    assisted_sum=excluded.assisted_sum,assisted_mass=excluded.assisted_mass,
                    last_evidence_at=excluded.last_evidence_at,next_retention_check_at=excluded.next_retention_check_at,
                    retention_interval_days=excluded.retention_interval_days,updated_at=excluded.updated_at""",
                tuple(payload[k] for k in (
                    "user_id","subject_id","concept_id","acquisition","independent","transfer","retention","evidence_quality","uncertainty","assistance_gap",
                    "acquisition_sum","acquisition_mass","independent_sum","independent_mass","transfer_sum","transfer_mass","retention_sum","retention_mass",
                    "assisted_sum","assisted_mass","last_evidence_at","next_retention_check_at","retention_interval_days","updated_at"
                )),
            )
            try:
                self.db.execute(
                    """INSERT INTO proof_learning_events(
                        proof_event_id,source_event_id,user_id,subject_id,concept_id,dimension,score,quality,independent,assistance_level,metadata_json,created_at
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        str(uuid4()), event.event_id, event.user_id, event.subject_id, event.primary_concept_id,
                        dimension, score, quality, int(independent), int(max(0, min(6, assistance_level))),
                        self.db.dumps({"activity_type": event.activity_type}), _iso(now),
                    ),
                )
            except Exception as exc:
                # Idempotent replay can reach here if a source event was already
                # converted before the teaching-turn row was committed.
                if "UNIQUE" not in str(exc).upper():
                    raise
        return self._public(payload, concept_name=None)

    def recommend_verification(self, state: dict[str, Any]) -> str:
        if state.get("next_retention_check_at"):
            try:
                if datetime.fromisoformat(str(state["next_retention_check_at"])) <= _now():
                    return "retention"
            except (ValueError, TypeError):
                pass
        masses = state.get("evidence_mass") or {}
        if float(masses.get("independent", 0.0) or 0.0) < 1.5:
            return "independent"
        if float(state.get("independent", 0.0) or 0.0) >= 0.70 and float(masses.get("transfer", 0.0) or 0.0) < 1.5:
            return "transfer"
        return "acquisition"

    def sovereignty(
        self,
        *,
        requested_action: str,
        learner_intent: str,
        proof_state: dict[str, Any],
        recent_failures: int,
    ) -> SovereigntyDecision:
        verification = self.recommend_verification(proof_state)
        # When delayed/transfer evidence is due, protect the measurement by using
        # an unassisted task even if a generic planner would otherwise explain.
        if verification in {"retention", "transfer"} and learner_intent not in {"need_explanation", "repeat"}:
            return SovereigntyDecision(
                assistance_level=0,
                assistance_label="independent check",
                action="reassess",
                evidence_dimension=verification,
                reason=f"Collect {verification} evidence before adding more assistance.",
            )
        if verification == "independent" and requested_action in {"practice", "reassess", "ask", "diagnose"}:
            return SovereigntyDecision(0, "independent attempt", requested_action, "independent", "Preserve an unassisted attempt so performance can be separated from tutoring support.")

        if learner_intent in {"need_explanation", "repeat", "slow_down"}:
            if recent_failures <= 0:
                return SovereigntyDecision(1, "small cue", "hint", "acquisition", "Start with the least revealing support likely to unblock the learner.")
            if recent_failures == 1:
                return SovereigntyDecision(2, "conceptual hint", "hint", "acquisition", "Escalate one level after an unsuccessful independent attempt.")
            if recent_failures == 2:
                return SovereigntyDecision(3, "guided scaffold", "explain", "acquisition", "Use guided structure after repeated difficulty, without solving the full task.")
            return SovereigntyDecision(4, "worked partial example", "worked_example", "acquisition", "Repeated difficulty justifies a worked partial example while preserving a later independent check.")

        action_levels = {
            "practice": 0, "reassess": 0, "ask": 0, "diagnose": 0,
            "hint": 1, "contrast": 2, "prerequisite_rewind": 2,
            "explain": 3, "summarize": 3, "worked_example": 4,
        }
        level = int(action_levels.get(requested_action, 2))
        labels = {
            0: "independent attempt", 1: "small cue", 2: "conceptual support",
            3: "guided explanation", 4: "worked partial example", 5: "full explanation", 6: "full solution",
        }
        dimension = "independent" if level == 0 else "acquisition"
        return SovereigntyDecision(level, labels[level], requested_action, dimension, "Use the minimum assistance implied by the current pedagogical action.")

    def recent_failure_count(self, *, user_id: str, subject_id: str, concept_id: str, limit: int = 4) -> int:
        rows = self.db.fetchall(
            """SELECT correct,score FROM learning_events WHERE user_id=? AND subject_id=? AND primary_concept_id=?
               ORDER BY timestamp DESC LIMIT ?""",
            (user_id, subject_id, concept_id, max(1, min(limit, 10))),
        )
        count = 0
        for row in rows:
            score = row["score"]
            failed = row["correct"] == 0 or (score is not None and float(score) < 0.60)
            if not failed:
                break
            count += 1
        return count

    def hydrate(self, *, user_id: str, subject_id: str, states: list[dict[str, Any]]) -> None:
        now = _iso(_now())
        valid = {r["concept_id"] for r in self.db.fetchall("SELECT concept_id FROM concepts WHERE subject_id=?", (subject_id,))}
        for item in states[:250]:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("concept_id") or "")
            if cid not in valid:
                continue
            def num(name: str, default: float = 0.0) -> float:
                try: return _clamp(float(item.get(name, default)))
                except (TypeError, ValueError): return default
            mass = item.get("evidence_mass") or {}
            if not isinstance(mass, dict): mass = {}
            def m(name: str) -> float:
                try: return max(0.0, min(10000.0, float(mass.get(name, 0.0))))
                except (TypeError, ValueError): return 0.0
            acq, indep, transfer, retention = num("acquisition"), num("independent"), num("transfer"), num("retention")
            am, im, tm, rm, asm = m("acquisition"), m("independent"), m("transfer"), m("retention"), m("assisted")
            gap = item.get("assistance_gap")
            try: gap = None if gap is None else max(-1.0, min(1.0, float(gap)))
            except (TypeError, ValueError): gap = None
            assisted_perf = item.get("assisted_performance")
            try:
                assisted_perf = None if assisted_perf is None else _clamp(float(assisted_perf))
            except (TypeError, ValueError):
                assisted_perf = None
            if assisted_perf is None and gap is not None:
                assisted_perf = _clamp(indep + gap)
            if assisted_perf is not None and asm <= 0.0:
                # Preserve a bounded amount of browser-carried evidence without
                # inventing a large effective sample size.
                asm = 1.0
            try:
                interval_days = max(3, min(30, int(item.get("retention_interval_days", 3) or 3)))
            except (TypeError, ValueError, OverflowError):
                interval_days = 3
            self.db.execute(
                """INSERT OR REPLACE INTO proof_learning_state(
                    user_id,subject_id,concept_id,acquisition,independent,transfer,retention,evidence_quality,uncertainty,assistance_gap,
                    acquisition_sum,acquisition_mass,independent_sum,independent_mass,transfer_sum,transfer_mass,retention_sum,retention_mass,
                    assisted_sum,assisted_mass,last_evidence_at,next_retention_check_at,retention_interval_days,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    user_id, subject_id, cid, acq, indep, transfer, retention, num("evidence_quality"), num("uncertainty", 1.0), gap,
                    acq*am, am, indep*im, im, transfer*tm, tm, retention*rm, rm,
                    (float(assisted_perf) * asm) if assisted_perf is not None else 0.0, asm, _parse_ts(item.get("last_evidence_at")), _parse_ts(item.get("next_retention_check_at")),
                    interval_days, now,
                ),
            )

    def _public(self, row: dict[str, Any], concept_name: str | None = None) -> dict[str, Any]:
        assisted_mass = float(row.get("assisted_mass") or 0.0)
        independent_mass = float(row.get("independent_mass") or 0.0)
        next_retention = row.get("next_retention_check_at")
        retention_due = False
        if next_retention:
            try: retention_due = datetime.fromisoformat(str(next_retention)) <= _now()
            except (ValueError, TypeError): retention_due = False
        result = {
            "subject_id": row["subject_id"],
            "concept_id": row["concept_id"],
            "concept_name": row.get("concept_name") if concept_name is None else concept_name,
            "acquisition": round(_clamp(row.get("acquisition", 0.0)), 4),
            "independent": round(_clamp(row.get("independent", 0.0)), 4),
            "transfer": round(_clamp(row.get("transfer", 0.0)), 4),
            "retention": round(_clamp(row.get("retention", 0.0)), 4),
            "evidence_quality": round(_clamp(row.get("evidence_quality", 0.0)), 4),
            "uncertainty": round(_clamp(row.get("uncertainty", 1.0)), 4),
            "assistance_gap": None if row.get("assistance_gap") is None else round(float(row["assistance_gap"]), 4),
            "assisted_performance": round(self._mean(float(row.get("assisted_sum") or 0.0), assisted_mass), 4) if assisted_mass else None,
            "evidence_mass": {
                "acquisition": round(float(row.get("acquisition_mass") or 0.0), 3),
                "independent": round(independent_mass, 3),
                "transfer": round(float(row.get("transfer_mass") or 0.0), 3),
                "retention": round(float(row.get("retention_mass") or 0.0), 3),
                "assisted": round(assisted_mass, 3),
            },
            "last_evidence_at": row.get("last_evidence_at"),
            "next_retention_check_at": next_retention,
            "retention_due": retention_due,
            "retention_interval_days": int(row.get("retention_interval_days") or 3),
        }
        result["status"] = self._status(result)
        result["recommended_verification"] = self.recommend_verification(result)
        return result

    @staticmethod
    def _status(state: dict[str, Any]) -> str:
        masses = state.get("evidence_mass") or {}
        if float(masses.get("independent", 0.0) or 0.0) < 1.0:
            return "insufficient_evidence"
        if float(state.get("independent", 0.0) or 0.0) < 0.70:
            return "needs_independent_practice"
        if float(masses.get("transfer", 0.0) or 0.0) < 1.0 or float(state.get("transfer", 0.0) or 0.0) < 0.70:
            return "independent_verified"
        if float(masses.get("retention", 0.0) or 0.0) < 1.0 or float(state.get("retention", 0.0) or 0.0) < 0.70:
            return "transfer_verified"
        return "retained"
