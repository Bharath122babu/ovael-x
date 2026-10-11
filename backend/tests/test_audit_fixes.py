from __future__ import annotations

from dataclasses import replace

from fastapi.testclient import TestClient

from adaptive_backend.app import create_app


PASSWORD = "correct horse battery staple"


def _register(client: TestClient, username: str) -> tuple[dict, dict[str, str]]:
    response = client.post(
        "/v1/auth/register",
        json={"username": username, "password": PASSWORD, "role": "learner"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return body, {"Authorization": f"Bearer {body['access_token']}"}


def test_pedagogy_history_cap_rescales_numerator_and_does_not_saturate(settings):
    app = create_app(settings)
    policy = app.state.services.pedagogy_policy
    user_id = "posterior-cap-user"
    program = policy.choose(
        user_id=user_id,
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_action="explain",
        mode="study",
        diagnosis={"confident": True, "hypotheses": [{"source": "direct"}]},
        context={"mode": "study"},
        learner_state={
            "diagnosis": {"recommended_action": "practice"},
            "adaptive": {"theta": 0.1, "target_difficulty": 0.55, "behavior_profile": "steady"},
        },
    )["selected"]
    for i in range(80):
        policy.record_outcome(
            user_id=user_id,
            subject_id="BIO",
            concept_id="bio_golgi",
            teaching_session_id=f"cap-{i}",
            teaching_program=program,
            score=0.60,
            correct=True,
            independent=True,
            context={"mode": "study", "diagnosis_source": "direct", "goal_kind": "primary"},
            state_before={
                "learner_state": {
                    "diagnosis": {"recommended_action": "practice"},
                    "adaptive": {"theta": 0.1, "target_difficulty": 0.55, "behavior_profile": "steady"},
                }
            },
        )
    decision = policy.choose(
        user_id=user_id,
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_action="explain",
        mode="study",
        diagnosis={"confident": True, "hypotheses": [{"source": "direct"}]},
        context={"mode": "study"},
        learner_state={
            "diagnosis": {"recommended_action": "practice"},
            "adaptive": {"theta": 0.1, "target_difficulty": 0.55, "behavior_profile": "steady"},
        },
    )
    utilities = [decision["selected"]["predicted_utility"], *[p["predicted_utility"] for p in decision["alternatives"]]]
    assert max(utilities) < 0.90
    assert decision["selected"]["evidence_weight"] > 14.0


def test_personalization_pause_is_hard_boundary_for_pedagogy_history(settings):
    app = create_app(settings)
    s = app.state.services
    user_id = "privacy-pedagogy-user"
    s.memory.set_personalization(user_id, False)
    program = s.pedagogy_policy.choose(
        user_id=user_id,
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_action="explain",
        mode="study",
        diagnosis={"confident": True, "hypotheses": [{"source": "direct"}]},
        context={"mode": "study"},
    )["selected"]
    s.pedagogy_policy.record_outcome(
        user_id=user_id,
        subject_id="BIO",
        concept_id="bio_golgi",
        teaching_session_id="privacy-boundary",
        teaching_program=program,
        score=1.0,
        correct=True,
        independent=True,
    )
    assert s.db.fetchone("SELECT 1 FROM pedagogy_events WHERE user_id=?", (user_id,)) is None


def test_local_first_active_shadow_never_stores_raw_answer(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        body, headers = _register(client, "raw-shadow-guard")
        started = client.post(
            "/v1/learning/sessions",
            headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi", "mode": "study"},
        ).json()
        sid = started["teaching_session_id"]
        secret = "RAW-LEARNER-SECRET-SHOULD-NEVER-PERSIST"
        turned = client.post(
            f"/v1/learning/sessions/{sid}/turns",
            headers={**headers, "Idempotency-Key": "raw-shadow-1"},
            json={"response": secret, "learner_intent": "answer"},
        )
        assert turned.status_code == 200, turned.text
        state_row = app.state.services.db.fetchone(
            "SELECT state_json FROM teaching_sessions WHERE teaching_session_id=?", (sid,)
        )
        state = app.state.services.db.loads(state_row["state_json"], {})
        engine_id = state["engine_user_id"]
        event_rows = app.state.services.db.fetchall(
            "SELECT response_text FROM learning_events WHERE user_id=?", (engine_id,)
        )
        # Unverified free text is a session turn, not a learning-evidence event.
        assert turned.json()["evidence"].get("score") is None or event_rows
        assert all(row["response_text"] is None for row in event_rows)
        serialized = " ".join(str(row["response_text"] or "") for row in event_rows)
        assert secret not in serialized
        assert engine_id.startswith(f"lf:{body['user_id']}:")


def test_repair_attempt_budget_is_enforced(settings):
    app = create_app(settings)
    service = app.state.services.teaching
    state = {
        "goal_stack": [
            {"concept_id": "bio_golgi", "kind": "root", "attempt_budget": 12},
            {
                "concept_id": "bio_er",
                "kind": "repair",
                "parent_concept_id": "bio_golgi",
                "attempt_budget": 6,
                "attempts_used": 5,
            },
        ]
    }
    service._update_goal_stack_after_evidence(
        state,
        {
            "states": [
                {
                    "concept_id": "bio_er",
                    "mastery_belief": 0.45,
                    "confidence": 0.40,
                    "status": "developing",
                }
            ]
        },
        root_concept_id="bio_golgi",
    )
    assert len(state["goal_stack"]) == 1
    assert state["last_goal_transition"]["event"] == "repair_budget_exhausted"
    assert "bio_er" in state["repair_exhausted_concepts"]


def test_abandoned_local_first_shadow_is_reaped_on_next_session(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        _body, headers = _register(client, "shadow-expiry-user")
        first = client.post(
            "/v1/learning/sessions",
            headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi"},
        ).json()
        first_id = first["teaching_session_id"]
        row = app.state.services.db.fetchone(
            "SELECT state_json FROM teaching_sessions WHERE teaching_session_id=?", (first_id,)
        )
        state = app.state.services.db.loads(row["state_json"], {})
        engine_id = state["engine_user_id"]
        app.state.services.db.execute(
            "UPDATE teaching_sessions SET updated_at=? WHERE teaching_session_id=?",
            ("2000-01-01T00:00:00+00:00", first_id),
        )
        second = client.post(
            "/v1/learning/sessions",
            headers=headers,
            json={"subject_id": "BIO", "concept_id": "bio_golgi"},
        )
        assert second.status_code == 200, second.text
        expired = app.state.services.db.fetchone(
            "SELECT status,state_json FROM teaching_sessions WHERE teaching_session_id=?", (first_id,)
        )
        assert expired["status"] == "expired"
        assert "engine_user_id" not in app.state.services.db.loads(expired["state_json"], {})
        assert app.state.services.db.fetchone("SELECT 1 FROM sessions WHERE user_id=?", (engine_id,)) is None


def test_production_teacher_registration_requires_invite(settings):
    invite = "teacher-invite-code-2026-secure"
    cfg = replace(
        settings,
        debug=False,
        allow_teacher_self_registration=False,
        teacher_invite_code=invite,
    )
    app = create_app(cfg)
    with TestClient(app) as client:
        denied = client.post(
            "/v1/auth/register",
            json={"username": "teacher-without-invite", "password": PASSWORD, "role": "teacher"},
        )
        assert denied.status_code == 403
        allowed = client.post(
            "/v1/auth/register",
            json={
                "username": "teacher-with-invite",
                "password": PASSWORD,
                "role": "teacher",
                "teacher_invite_code": invite,
            },
        )
        assert allowed.status_code == 200, allowed.text
        assert allowed.json()["role"] == "teacher"


def test_learning_ir_inventory_is_concept_specific(settings):
    app = create_app(settings)
    s = app.state.services
    now = "2026-10-07T00:00:00+00:00"
    s.db.execute(
        "INSERT INTO courses(course_id,owner_user_id,subject_id,name,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        ("course-ir-scope", "teacher", "BIO", "IR scope", now, now),
    )
    rows = [
        (
            "ir-golgi-visual", "course-ir-scope", None, "teacher", "BIO", "visual_reference", "1:1",
            "Figure of Golgi", "page 1", s.db.dumps({"concept_ids": ["bio_golgi"]}), now,
        ),
        (
            "ir-er-example", "course-ir-scope", None, "teacher", "BIO", "example", "2:1",
            "ER example", "page 2", s.db.dumps({"concept_ids": ["bio_er"]}), now,
        ),
    ]
    s.db.executemany(
        """INSERT INTO learning_ir_objects(
            ir_object_id,course_id,document_id,owner_user_id,subject_id,object_type,object_key,
            content,source_location,metadata_json,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    golgi = s.teaching._learning_ir_inventory("course-ir-scope", "bio_golgi")
    er = s.teaching._learning_ir_inventory("course-ir-scope", "bio_er")
    assert golgi == {"visual_reference": 1}
    assert er == {"example": 1}


def test_policy_similarity_uses_learner_state_not_only_mode_and_concept(settings):
    app = create_app(settings)
    policy = app.state.services.pedagogy_policy
    event = {
        "concept_id": "bio_golgi",
        "subject_id": "BIO",
        "context": {"mode": "study"},
        "state_before": {
            "learner_state": {
                "diagnosis": {"recommended_action": "practice"},
                "adaptive": {"theta": 0.2, "target_difficulty": 0.55, "behavior_profile": "steady"},
            }
        },
    }
    close = {
        "concept_id": "bio_golgi",
        "subject_id": "BIO",
        "context": {"mode": "study"},
        "learner_state": {
            "diagnosis": {"recommended_action": "practice"},
            "adaptive": {"theta": 0.25, "target_difficulty": 0.58, "behavior_profile": "steady"},
        },
    }
    far = {
        "concept_id": "bio_golgi",
        "subject_id": "BIO",
        "context": {"mode": "study"},
        "learner_state": {
            "diagnosis": {"recommended_action": "teach"},
            "adaptive": {"theta": 2.5, "target_difficulty": 0.95, "behavior_profile": "high_support"},
        },
    }
    assert policy._context_similarity(event, close) > policy._context_similarity(event, far)
