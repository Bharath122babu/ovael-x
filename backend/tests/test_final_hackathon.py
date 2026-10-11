from __future__ import annotations

import io
import zipfile

from fastapi.testclient import TestClient

from adaptive_backend.app import create_app


PASSWORD = "correct horse battery staple"


def _register(client: TestClient, username: str, role: str) -> dict[str, str]:
    response = client.post("/v1/auth/register", json={"username": username, "password": PASSWORD, "role": role})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_course_zip_compiles_source_authority_and_learning_ir(settings):
    client = TestClient(create_app(settings))
    teacher = _register(client, "compiler_teacher", "teacher")
    course = client.post(
        "/v1/courses", headers=teacher,
        json={"name": "Neuro", "subject_name": "Anatomy", "course_kind": "class"},
    ).json()
    package = io.BytesIO()
    with zipfile.ZipFile(package, "w") as archive:
        archive.writestr("official/textbook.txt", "The fourth ventricle lies between the pons and cerebellum.\n\nIts roof has named parts.")
        archive.writestr("exam/rubric.txt", "Explain the fourth ventricle and cerebrospinal fluid pathways.")
    imported = client.post(
        f"/v1/courses/{course['course_id']}/package", headers=teacher,
        files={"file": ("neuro.zip", package.getvalue(), "application/zip")},
    )
    assert imported.status_code == 200, imported.text
    assert imported.json()["imported_count"] == 2
    sources = client.get(f"/v1/courses/{course['course_id']}/sources", headers=teacher).json()
    roles = {source["filename"]: source["authority"] for source in sources}
    assert roles["textbook.txt"] == "canonical"
    assert roles["rubric.txt"] == "required"
    ir = client.get(f"/v1/courses/{course['course_id']}/learning-ir", headers=teacher).json()
    assert ir["total_objects"] >= 2


def test_personal_book_is_available_only_to_linking_learner(settings):
    client = TestClient(create_app(settings))
    teacher = _register(client, "privacy_teacher", "teacher")
    course = client.post(
        "/v1/courses", headers=teacher,
        json={"name": "Algorithms", "subject_id": "DSA", "course_kind": "class"},
    ).json()
    first = _register(client, "private_reader_one", "learner")
    second = _register(client, "private_reader_two", "learner")
    client.post(f"/v1/courses/{course['course_id']}/enroll", headers=teacher, json={"learner_username": "private_reader_one"})
    client.post(f"/v1/courses/{course['course_id']}/enroll", headers=teacher, json={"learner_username": "private_reader_two"})

    upload = client.post(
        "/v1/documents/upload", headers=first,
        files={"file": ("my-notes.txt", b"QUARTZNEBULA explains binary search with a staircase analogy.", "text/plain")},
    )
    assert upload.status_code == 200, upload.text
    document_id = upload.json()["document_id"]
    linked = client.post(
        f"/v1/courses/{course['course_id']}/personal-sources", headers=first,
        json={"document_id": document_id, "usage_role": "preferred_explanation"},
    )
    assert linked.status_code == 200, linked.text

    payload = {"query": "QUARTZNEBULA", "subject_id": "DSA", "course_id": course["course_id"], "limit": 10}
    mine = client.post("/v1/retrieval/search", headers=first, json=payload)
    other = client.post("/v1/retrieval/search", headers=second, json=payload)
    assert mine.status_code == 200 and any("QUARTZNEBULA" in hit["content"] for hit in mine.json())
    assert other.status_code == 200 and not any("QUARTZNEBULA" in hit["content"] for hit in other.json())


def test_dynamic_teaching_policy_learns_outcomes_without_style_label(settings):
    app = create_app(settings)
    client = TestClient(app)
    learner = _register(client, "policy_learner", "learner")
    user = client.get("/v1/auth/me", headers=learner).json()
    policy = app.state.services.pedagogy_policy
    diagnosis = {"confident": True, "hypotheses": [{"source": "direct"}]}
    initial = policy.choose(
        user_id=user["user_id"], subject_id="DSA", concept_id="binary_search",
        requested_action="explain", mode="study", diagnosis=diagnosis, context={"mode": "study"},
    )
    first = initial["selected"]
    alternative = initial["alternatives"][0]
    for idx in range(8):
        policy.record_outcome(
            user_id=user["user_id"], subject_id="DSA", concept_id="binary_search",
            teaching_session_id=f"bad-{idx}", teaching_program=first, score=0.0, correct=False,
            independent=True, context={"mode": "study", "diagnosis_source": "direct"},
        )
        policy.record_outcome(
            user_id=user["user_id"], subject_id="DSA", concept_id="binary_search",
            teaching_session_id=f"good-{idx}", teaching_program=alternative, score=1.0, correct=True,
            independent=True, context={"mode": "study", "diagnosis_source": "direct"},
        )
    learned = policy.choose(
        user_id=user["user_id"], subject_id="DSA", concept_id="binary_search",
        requested_action="explain", mode="study", diagnosis=diagnosis, context={"mode": "study"},
    )
    assert learned["selected"]["program_id"] == alternative["program_id"]
    assert "static learning-style" in learned["principle"]


def test_direct_teacher_course_upload_is_canonical_by_default(settings):
    client = TestClient(create_app(settings))
    teacher = _register(client, "direct_source_teacher", "teacher")
    course = client.post(
        "/v1/courses", headers=teacher,
        json={"name": "Direct Course", "subject_id": "DSA", "course_kind": "class"},
    ).json()
    uploaded = client.post(
        f"/v1/documents/upload?course_id={course['course_id']}", headers=teacher,
        files={"file": ("teacher-book.txt", b"CANONICAL_DIRECT_MARKER binary search requires sorted input.", "text/plain")},
    )
    assert uploaded.status_code == 200, uploaded.text
    sources = client.get(f"/v1/courses/{course['course_id']}/sources", headers=teacher).json()
    matching = [item for item in sources if item["document_id"] == uploaded.json()["document_id"]]
    assert matching and matching[0]["authority"] == "canonical"


def test_account_delete_removes_dynamic_pedagogy_history(settings):
    app = create_app(settings)
    client = TestClient(app)
    learner = _register(client, "delete_policy_history", "learner")
    me = client.get("/v1/auth/me", headers=learner).json()
    user_id = me["user_id"]
    policy = app.state.services.pedagogy_policy
    diagnosis = {"confident": True, "hypotheses": [{"source": "direct"}]}
    program = policy.choose(
        user_id=user_id, subject_id="DSA", concept_id="binary_search",
        requested_action="explain", mode="study", diagnosis=diagnosis, context={"mode": "study"},
    )["selected"]
    policy.record_outcome(
        user_id=user_id, subject_id="DSA", concept_id="binary_search",
        teaching_session_id="privacy-delete", teaching_program=program,
        score=1.0, correct=True, independent=True, context={"mode": "study"},
    )
    db = app.state.services.db
    assert db.fetchone("SELECT 1 FROM pedagogy_events WHERE user_id=?", (user_id,)) is not None
    deleted = client.request("DELETE", "/v1/auth/account", headers=learner, json={"password": PASSWORD})
    assert deleted.status_code == 200, deleted.text
    assert db.fetchone("SELECT 1 FROM pedagogy_events WHERE user_id=?", (user_id,)) is None
