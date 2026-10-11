from __future__ import annotations

from pathlib import Path

from adaptive_backend.app import create_app


def test_legacy_agents_module_is_removed():
    package_dir = Path(__file__).resolve().parents[1] / "src" / "adaptive_backend"
    assert not (package_dir / "agents.py").exists()
    assert (package_dir / "decision.py").exists()
    assert (package_dir / "semantic.py").exists()


def test_verified_practice_item_stays_on_t0_code_path(settings):
    app = create_app(settings)
    frame = app.state.services.decision.plan(
        user_id="decision-test-user",
        content_user_id="decision-test-user",
        subject_id="DSA",
        concept_id="binary_search",
        requested_mode="practice",
        query="practice binary search",
        learner_intent="practice",
    )
    assert frame.selected_question_id is not None
    assert frame.semantic_tier == 0
    assert frame.semantic_requirement == "none"
    assert frame.model_call_budget == 0
    assert "REUSE_VERIFIED_QUESTION" in frame.reason_codes or frame.adaptive.get("selected_question_id")


def test_normal_why_question_does_not_force_deep_research(settings):
    app = create_app(settings)
    frame = app.state.services.decision.plan(
        user_id="decision-test-user",
        content_user_id="decision-test-user",
        subject_id="BIO",
        concept_id="bio_cell",
        requested_mode="study",
        query="why is the cell the basic structural unit of life?",
        learner_intent="ask_question",
    )
    assert frame.source_mode == "rag"
    assert frame.research_calls_used == 0
    assert frame.semantic_tier == 2
    assert frame.model_call_budget == 1


def test_decision_kernel_never_calls_model_even_for_deep_candidate(settings, monkeypatch):
    app = create_app(settings)
    services = app.state.services

    def forbidden(*args, **kwargs):  # pragma: no cover - only runs on regression
        raise AssertionError("DecisionKernel must not call a model")

    monkeypatch.setattr(services.models, "route_json", forbidden)
    monkeypatch.setattr(services.models, "route_chat", forbidden)
    frame = services.decision.plan(
        user_id="decision-test-user",
        content_user_id="decision-test-user",
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_mode="study",
        query="reconcile conflicting sources across documents about Golgi and rough ER",
        learner_intent="ask_question",
    )
    assert frame.source_mode == "deep_candidate"
    assert frame.semantic_tier == 3
    assert frame.semantic_requirement == "deep_research"
    assert frame.model_call_budget == 2
    assert frame.research_calls_used == 0


def test_semantic_budget_is_a_hard_ceiling():
    from adaptive_backend.inference import SemanticBudget

    budget = SemanticBudget(2, decision_id="budget-test")
    assert budget.take("first", route="planning") is True
    assert budget.take("second", route="teaching") is True
    assert budget.take("third", route="validation") is False
    snapshot = budget.snapshot()
    assert snapshot["used"] == 2
    assert snapshot["remaining"] == 0
    assert [c["granted"] for c in snapshot["calls"]] == [True, True, False]


def test_live_deep_research_uses_one_planner_then_one_final_render(settings, monkeypatch):
    app = create_app(settings)
    services = app.state.services
    model_type = type(services.models)
    monkeypatch.setattr(model_type, "tutor_available", property(lambda self: True))
    monkeypatch.setattr(model_type, "local_available", property(lambda self: False))
    calls = {"planning": 0, "teaching": 0, "summarization": 0}

    def fake_json(route, *, system, payload, **kwargs):
        assert route == "planning"
        calls["planning"] += 1
        return {"subqueries": ["Golgi sorting", "rough ER processing"]}

    class Reply:
        text = "The sources distinguish early ER processing from Golgi modification and sorting."

    def fake_chat(route, *, system, user, **kwargs):
        calls[route] = calls.get(route, 0) + 1
        return Reply()

    monkeypatch.setattr(services.models, "route_json", fake_json)
    monkeypatch.setattr(services.models, "route_chat", fake_chat)

    frame = services.decision.plan(
        user_id="deep-user",
        content_user_id="deep-user",
        subject_id="BIO",
        concept_id="bio_golgi",
        requested_mode="study",
        query="reconcile conflicting sources across documents about Golgi and rough ER",
        learner_intent="ask_question",
    )
    budget = services.semantic.budget_for(frame)
    enriched = services.semantic.enrich_research(
        frame=frame,
        budget=budget,
        user_id="deep-user",
        subject_id="BIO",
        course_id=None,
    )
    text = services.semantic.explain(
        frame=enriched,
        budget=budget,
        concept_name="Golgi Apparatus",
        subject_id="BIO",
        course_id=None,
        source_excerpt="trusted source excerpt",
    )
    assert text
    assert budget.used == 2
    assert calls["planning"] == 1
    assert calls["teaching"] == 1
    assert calls["summarization"] == 0


def test_clear_material_routing_skips_semantic_classifier(settings, monkeypatch):
    app = create_app(settings)
    services = app.state.services
    model_type = type(services.models)
    monkeypatch.setattr(model_type, "tutor_available", property(lambda self: True))

    def forbidden(*args, **kwargs):  # pragma: no cover - only runs on regression
        raise AssertionError("clear catalog classification should not call a model")

    monkeypatch.setattr(services.models, "route_json", forbidden)
    candidates = [
        {
            "subject_id": "DSA",
            "name": "Data Structures and Algorithms",
            "description": "Algorithms, graphs, searching and complexity",
            "concepts": "binary_search::Binary Search||dfs::Depth First Search||graphs::Graphs",
        },
        {
            "subject_id": "BIO",
            "name": "Biology",
            "description": "Cells and organelles",
            "concepts": "bio_cell::Cell Biology||bio_golgi::Golgi Apparatus",
        },
    ]
    result = services.documents._classify_material(
        filename="binary_search_algorithms_notes.txt",
        text="binary search algorithm complexity array sorted search algorithm graph",
        candidates=candidates,
    )
    assert result["existing_subject_id"] == "DSA"
    assert result["routing_method"] == "catalog_content_match"
