from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from adaptive_backend.app import create_app
from adaptive_backend.proof_learning import ProofOfLearningService
from adaptive_backend.schemas import EvidenceEvent


PASSWORD = "correct horse battery staple"


def _event(*, user: str, session: str, score: float, hints: int = 0, attempts: int = 1, concept: str = "bio_golgi") -> EvidenceEvent:
    return EvidenceEvent(
        session_id=session,
        user_id=user,
        subject_id="BIO",
        concept_ids=[concept],
        primary_concept_id=concept,
        activity_type="proof_test",
        correct=score >= 0.5,
        score=score,
        evidence_strength=1.0,
        metadata={
            "behavior": {
                "hint_count": hints,
                "attempt_count": attempts,
                "evaluator_confidence": 1.0,
            }
        },
    )


def test_proof_learning_separates_assisted_and_independent(core):
    db, _retrieval, memory, _learner = core
    proof = ProofOfLearningService(db)
    session = memory.start_session(user_id="proof-user", subject_id="BIO", goal=None, source="system")

    assisted = proof.record(
        event=_event(user="proof-user", session=session.session_id, score=1.0, hints=2),
        requested_dimension="acquisition",
        assistance_level=3,
    )
    assert assisted["acquisition"] == 1.0
    assert assisted["independent"] == 0.0
    assert assisted["assistance_gap"] is None

    independent_fail = proof.record(
        event=_event(user="proof-user", session=session.session_id, score=0.0),
        requested_dimension="independent",
        assistance_level=0,
    )
    assert independent_fail["independent"] == 0.0
    assert independent_fail["assisted_performance"] == 1.0
    assert independent_fail["assistance_gap"] == 1.0
    assert independent_fail["status"] == "needs_independent_practice"


def test_proof_learning_tracks_transfer_retention_and_schedule(core):
    db, _retrieval, memory, _learner = core
    proof = ProofOfLearningService(db)
    session = memory.start_session(user_id="proof-transfer", subject_id="BIO", goal=None, source="system")

    # Establish independent evidence first.
    for _ in range(2):
        proof.record(
            event=_event(user="proof-transfer", session=session.session_id, score=1.0),
            requested_dimension="independent",
            assistance_level=0,
        )
    transferred = proof.record(
        event=_event(user="proof-transfer", session=session.session_id, score=0.8),
        requested_dimension="transfer",
        assistance_level=0,
    )
    assert transferred["transfer"] == 0.8
    assert transferred["next_retention_check_at"] is not None

    retained = proof.record(
        event=_event(user="proof-transfer", session=session.session_id, score=0.9),
        requested_dimension="retention",
        assistance_level=0,
    )
    assert retained["retention"] == 0.9
    assert retained["retention_interval_days"] >= 6


def test_cognitive_sovereignty_prefers_minimum_assistance(core):
    db, _retrieval, _memory, _learner = core
    proof = ProofOfLearningService(db)
    state = proof.get(user_id="new-user", subject_id="BIO", concept_id="bio_golgi")
    decision = proof.sovereignty(
        requested_action="practice",
        learner_intent="answer",
        proof_state=state,
        recent_failures=0,
    )
    assert decision.assistance_level == 0
    assert decision.evidence_dimension == "independent"

    help_decision = proof.sovereignty(
        requested_action="explain",
        learner_intent="need_explanation",
        proof_state=state,
        recent_failures=1,
    )
    assert help_decision.assistance_level == 2
    assert help_decision.action == "hint"

    due_state = dict(state)
    due_state.update({
        "independent": 0.9,
        "evidence_mass": {"independent": 3.0, "transfer": 2.0, "retention": 0.0},
        "next_retention_check_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
    })
    retention = proof.sovereignty(
        requested_action="explain",
        learner_intent="answer",
        proof_state=due_state,
        recent_failures=0,
    )
    assert retention.assistance_level == 0
    assert retention.action == "reassess"
    assert retention.evidence_dimension == "retention"


def test_teacher_interventions_use_shared_derived_proof_only(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        teacher = client.post("/v1/auth/register", json={"username": "proof-teacher", "password": PASSWORD, "role": "teacher"}).json()
        learner = client.post("/v1/auth/register", json={"username": "proof-learner", "password": PASSWORD, "role": "learner"}).json()
        th = {"Authorization": f"Bearer {teacher['access_token']}"}
        lh = {"Authorization": f"Bearer {learner['access_token']}"}
        created = client.post(
            "/v1/courses", headers=th,
            json={"name": "Proof class", "subject_id": "BIO", "course_kind": "class"},
        )
        assert created.status_code == 200, created.text
        cid = created.json()["course_id"]
        enrolled = client.post(f"/v1/courses/{cid}/enroll", headers=th, json={"learner_username": "proof-learner"})
        assert enrolled.status_code == 200, enrolled.text
        shared = client.post(
            f"/v1/courses/{cid}/progress-snapshot", headers=lh,
            json={
                "graph_version": "v1",
                "concept_states": [{"concept_id": "bio_golgi", "status": "developing"}],
                "gap_summary": [],
                "proof_states": [{
                    "concept_id": "bio_golgi", "acquisition": 0.95, "independent": 0.4,
                    "transfer": 0.1, "retention": 0.0, "evidence_quality": 0.8,
                    "assistance_gap": 0.5, "status": "needs_independent_practice",
                }],
                "shared_with_teacher": True,
            },
        )
        assert shared.status_code == 200, shared.text
        intelligence = client.get(f"/v1/teacher/courses/{cid}/interventions", headers=th)
        assert intelligence.status_code == 200, intelligence.text
        body = intelligence.json()
        assert body["top_interventions"]
        top = body["top_interventions"][0]
        assert top["intervention"] == "verify_without_scaffolding"
        assert "learner_response" not in str(body).lower()

def test_local_first_proof_hydration_preserves_assistance_gap(core):
    db, _retrieval, _memory, _learner = core
    proof = ProofOfLearningService(db)
    proof.hydrate(
        user_id="lf:user:session",
        subject_id="BIO",
        states=[{
            "concept_id": "bio_golgi",
            "acquisition": 0.9,
            "independent": 0.5,
            "transfer": 0.2,
            "retention": 0.0,
            "evidence_quality": 0.7,
            "uncertainty": 0.3,
            "assistance_gap": 0.35,
            "assisted_performance": 0.85,
            "evidence_mass": {"acquisition": 3.0, "independent": 1.5, "transfer": 0.5, "retention": 0.0, "assisted": 2.0},
        }],
    )
    state = proof.get(user_id="lf:user:session", subject_id="BIO", concept_id="bio_golgi")
    assert state["assisted_performance"] == 0.85
    assert state["assistance_gap"] == 0.35
    assert state["evidence_mass"]["assisted"] == 2.0

def test_privacy_delete_all_removes_proof_learning_state(core):
    db, _retrieval, memory, _learner = core
    proof = ProofOfLearningService(db)
    session = memory.start_session(user_id="proof-delete", subject_id="BIO", goal=None, source="system")
    proof.record(
        event=_event(user="proof-delete", session=session.session_id, score=1.0),
        requested_dimension="independent",
        assistance_level=0,
    )
    assert db.fetchone("SELECT 1 FROM proof_learning_state WHERE user_id=?", ("proof-delete",)) is not None
    memory.delete_memory(user_id="proof-delete", delete_all=True)
    assert db.fetchone("SELECT 1 FROM proof_learning_state WHERE user_id=?", ("proof-delete",)) is None
    assert db.fetchone("SELECT 1 FROM proof_learning_events WHERE user_id=?", ("proof-delete",)) is None
