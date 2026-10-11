from __future__ import annotations

import io
import json
import zipfile

from fastapi.testclient import TestClient

from adaptive_backend.app import create_app


PASSWORD = "correct horse battery staple"


def _register(client: TestClient, username: str, role: str = "learner") -> dict[str, str]:
    response = client.post(
        "/v1/auth/register", json={"username": username, "password": PASSWORD, "role": role}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_runtime_has_one_decision_kernel_and_semantic_coprocessor(settings):
    app = create_app(settings)
    services = app.state.services
    assert hasattr(services, "decision")
    assert hasattr(services, "semantic")
    assert not hasattr(services, "cognitive")
    assert not hasattr(services, "x")
    assert not hasattr(services, "navigator")
    assert not hasattr(services, "tutor")

    with TestClient(app) as client:
        headers = _register(client, "architecture_one")
        topology = client.get("/v1/system/decision", headers=headers).json()
        assert topology["controller"]["name"] == "DecisionKernel"
        assert topology["semantic_coprocessor"]["tiers"]["T0"] == "deterministic code"


def test_teaching_move_emits_teaching_plan_ir_and_output_intent(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        headers = _register(client, "plan_ir")
        started = client.post(
            "/v1/learning/sessions", headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi", "mode": "study"},
        )
        assert started.status_code == 200, started.text
        move = started.json()["move"]
        plan = move["teaching_plan"]
        assert plan["teaching_plan_id"]
        assert plan["program_id"]
        assert plan["target_concept_id"]
        assert isinstance(plan["representation_sequence"], list)
        assert "visual learner" not in json.dumps(plan).lower()
        output = move["output_intent"]
        assert output["teaching_plan_id"] == plan["teaching_plan_id"]
        assert "text" in output["modalities"]
        assert "voice" in output["modalities"]
        assert move["decision_trace"]["controller"] == "DecisionKernel"
        assert move["decision_frame"]["semantic_tier"] in {0, 2, 3}


def test_learning_turn_uses_normalized_modality_envelope_without_raw_text(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        headers = _register(client, "normalized_event")
        started = client.post(
            "/v1/learning/sessions", headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi", "mode": "study"},
        ).json()
        sid = started["teaching_session_id"]
        secret = "PRIVATE-VOICE-ANSWER-OMEGA"
        turned = client.post(
            f"/v1/learning/sessions/{sid}/turns",
            headers={**headers, "Idempotency-Key": "normalized-1"},
            json={"response": secret, "input_mode": "voice", "learner_intent": "answer"},
        )
        assert turned.status_code == 200, turned.text
        row = app.state.services.db.fetchone(
            "SELECT state_json FROM teaching_sessions WHERE teaching_session_id=?", (sid,)
        )
        state = app.state.services.db.loads(row["state_json"], {})
        normalized = state["last_normalized_event"]
        assert normalized["modality"] == "voice"
        assert normalized["event_type"] == "learning_turn"
        assert "content" not in normalized
        assert secret not in row["state_json"]


def test_learning_ir_v2_builds_typed_objects_concept_links_and_relations(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        teacher = _register(client, "semantic_teacher", "teacher")
        course = client.post(
            "/v1/courses", headers=teacher,
            json={"name": "Cell Course", "subject_id": "BIO", "course_kind": "class"},
        ).json()
        package = io.BytesIO()
        with zipfile.ZipFile(package, "w") as archive:
            archive.writestr(
                "official/textbook.txt",
                "The Golgi apparatus is an organelle that modifies and sorts proteins.\n\n"
                "Example: proteins move through Golgi cisternae before packaging.\n\n"
                "Figure 2 shows the Golgi apparatus beside the rough endoplasmic reticulum.",
            )
        imported = client.post(
            f"/v1/courses/{course['course_id']}/package", headers=teacher,
            files={"file": ("bio.zip", package.getvalue(), "application/zip")},
        )
        assert imported.status_code == 200, imported.text
        summary = client.get(f"/v1/courses/{course['course_id']}/learning-ir", headers=teacher).json()
        assert summary["semantic_version"] == 2
        assert summary["total_objects"] >= 3
        assert summary["total_relations"] >= 2
        assert summary["concept_links"] >= 1
        assert "definition" in summary["by_type"]
        assert "example" in summary["by_type"]


def test_policy_composes_representation_from_current_source_assets(settings):
    app = create_app(settings)
    policy = app.state.services.pedagogy_policy
    decision = policy.choose(
        user_id="source-composition-user",
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_action="explain",
        mode="study",
        diagnosis={"confident": True, "hypotheses": [{"source": "direct"}]},
        context={"mode": "study", "learning_ir_types": ["visual_reference", "definition", "example"], "course_scoped": True},
        learner_state={"mastery": 0.4},
    )
    programs = [decision["selected"], *decision["alternatives"]]
    flattened = {step for program in programs for step in program["representation_sequence"]}
    assert "source_visual" in flattened
    assert "source_worked_example" in flattened
    assert decision["candidate_count"] >= 4


def test_judge_mode_exposes_closed_loop_without_raw_response(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        headers = _register(client, "judge_trace")
        started = client.post(
            "/v1/learning/sessions", headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi", "mode": "study"},
        ).json()
        sid = started["teaching_session_id"]
        secret = "DO-NOT-EXPOSE-RAW-LEARNER-TEXT"
        response = client.post(
            f"/v1/learning/sessions/{sid}/turns",
            headers={**headers, "Idempotency-Key": "judge-turn-1"},
            json={"response": secret, "learner_intent": "answer"},
        )
        assert response.status_code == 200, response.text
        judge = client.get("/v1/judge/latest", headers=headers)
        assert judge.status_code == 200, judge.text
        payload = judge.json()
        assert payload["status"] == "ready"
        assert payload["architecture"]["controller"] == "DecisionKernel"
        assert payload["decision"]["teaching_plan"]
        assert payload["belief_change"]
        assert secret not in judge.text


def test_unknown_graph_nodes_do_not_dilute_observed_gap_probability(settings):
    """Adding unobserved prerequisites must not weaken the same learner evidence."""
    app = create_app(settings)
    s = app.state.services
    session = s.memory.start_session(user_id="graph-density-user", subject_id="BIO", goal=None, source="text")
    from adaptive_backend.schemas import EvidenceEvent

    s.learner.process_event(EvidenceEvent(
        session_id=session.session_id,
        user_id="graph-density-user",
        subject_id="BIO",
        concept_ids=["bio_golgi"],
        primary_concept_id="bio_golgi",
        activity_type="independent_check",
        correct=False,
        evidence_strength=1.0,
        concept_likelihoods={"bio_golgi": 6.0},
    ))
    before = s.learner.diagnose("graph-density-user", "bio_golgi")
    before_p = next(h.probability for h in before.hypotheses if h.concept_id == "bio_golgi")

    # Add several curriculum-only prerequisites with no learner observations.
    for i in range(8):
        cid = f"density_unknown_{i}"
        s.db.execute(
            "INSERT INTO concepts(concept_id,subject_id,name,description,bkt_params_json,metadata_json) VALUES(?,?,?,?,?,?)",
            (cid, "BIO", f"Unknown prerequisite {i}", "", "{}", "{}"),
        )
        s.db.execute(
            "INSERT INTO concept_edges(source_concept_id,target_concept_id,relation,strength) VALUES(?,?,?,?)",
            (cid, "bio_golgi", "prerequisite", 0.9),
        )

    after = s.learner.diagnose("graph-density-user", "bio_golgi")
    after_p = next(h.probability for h in after.hypotheses if h.concept_id == "bio_golgi")
    assert after_p == before_p
    assert all(not h.concept_id.startswith("density_unknown_") for h in after.hypotheses)
