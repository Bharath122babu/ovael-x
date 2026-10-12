"""Audit probes asserting observed defects, not desired regression behavior.

Run from backend: .venv/Scripts/python.exe -m pytest audits/2026-10-12/reproduce.py -v -s
Uses temporary databases and mocked providers; never uses existing learner data.
"""
from dataclasses import replace
from types import SimpleNamespace
from threading import Event, Thread
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from adaptive_backend.app import create_app
from adaptive_backend.config import Settings
from adaptive_backend.teaching import LearningSessionStart, LearningTurnInput
from adaptive_backend.decision import DecisionFrame
from adaptive_backend.inference import SemanticBudget
from adaptive_backend.assessment_evidence import AnswerSubmission, EvidencePart


@pytest.fixture
def app(tmp_path):
    settings = Settings(
        db_path=tmp_path / 'audit.db', storage_dir=tmp_path / 'uploads',
        tutor_url=None, tutor_model=None, tutor_api_key=None,
        local_model_url=None, local_model_name='audit', local_model_api_key=None,
        supervisor_url=None, supervisor_model=None, supervisor_api_key=None,
        allow_local_code_execution=False, external_sandbox_url=None,
        whisper_cpp_bin=None, whisper_cpp_model=None, stt_url=None, stt_model=None,
        tts_url=None, tts_model=None, request_timeout_seconds=10,
        memory_compaction_session_threshold=10, adaptive_target_success=.65,
        adaptive_micro_stage_size=3, adaptive_max_difficulty_step=.18, debug=False,
    )
    return create_app(settings)


def register(client, username):
    result = client.post('/v1/auth/register', json={
        'username': username, 'password': 'audit-password-12345', 'role': 'learner',
    })
    assert result.status_code == 200, result.text
    body = result.json()
    return body['user_id'], {'Authorization': 'Bearer ' + body['access_token']}


def practice(s, user='audit-user'):
    # Isolate transaction/privacy tests from the independent seeded-rubric bug.
    # This fixture injects a valid deterministic assessment; source is unchanged.
    s.teaching._generate_assessment = lambda **kw: {
        'stem': 'What is six multiplied by seven?', 'answer_type': 'numeric',
        'answer_key': 42, 'required_modalities': ['numeric'], 'options': [],
        'difficulty': .5, 'validation_state': 'fallback_validated',
    }
    out = s.teaching.start(user_id=user, request=LearningSessionStart(
        subject_id='DSA', concept_id='binary_search_boundary', mode='practice',
    ))
    sid = out['teaching_session_id']
    return sid, LearningTurnInput(numeric_value=42)


def test_normal_seeded_practice_fails_missing_required_modalities(app):
    s = app.state.services
    with pytest.raises(ValueError, match='required_modalities'):
        s.teaching.start(user_id='audit-user', request=LearningSessionStart(
            subject_id='DSA', concept_id='binary_search', mode='practice'))
    assert s.db.fetchone('SELECT count(*) n FROM generated_items')['n'] == 1


def test_private_subject_can_be_attached_and_modified_by_other_account(app):
    with TestClient(app) as c:
        _, victim = register(c, 'victim01')
        _, attacker = register(c, 'attacker01')
        course = c.post('/v1/courses', headers=victim, json={'name': 'Private curriculum'}).json()
        vcid, subject = course['course_id'], course['subject_id']
        secret = c.post(f'/v1/courses/{vcid}/concepts', headers=victim,
                        json={'name': 'Confidential topic'}).json()
        assert subject not in {r['subject_id'] for r in c.get('/v1/subjects', headers=attacker).json()}
        graft = c.post('/v1/courses', headers=attacker,
                       json={'name': 'Copied namespace', 'subject_id': subject})
        assert graft.status_code == 200
        acid = graft.json()['course_id']
        leaked = c.get(f'/v1/courses/{acid}/concepts', headers=attacker).json()
        assert secret in leaked
        added = c.post(f'/v1/courses/{acid}/concepts', headers=attacker,
                       json={'name': 'Attacker injected topic'})
        assert added.status_code == 200
        assert added.json() in c.get(f'/v1/courses/{vcid}/concepts', headers=victim).json()


def test_failure_after_evidence_commit_poisoned_retry_and_double_calibration(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    original = s.teaching._next_move
    def fail(**kwargs):
        raise RuntimeError('injected next-move outage')
    monkeypatch.setattr(s.teaching, '_next_move', fail)
    with pytest.raises(RuntimeError, match='injected'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry-1')
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1
    assert s.db.fetchone('SELECT count(*) n FROM teaching_turns')['n'] == 0
    monkeypatch.setattr(s.teaching, '_next_move', original)
    with pytest.raises(ValueError, match='already being processed'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry-1')
    assert s.db.fetchone('SELECT max(attempt_count) n FROM generated_items')['n'] == 2


def test_failure_after_turn_insert_leaves_replay_and_session_inconsistent(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    original = s.teaching._save_state
    def fail(*args, **kwargs):
        raise RuntimeError('injected session-state outage')
    monkeypatch.setattr(s.teaching, '_save_state', fail)
    with pytest.raises(RuntimeError, match='injected'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry-2')
    monkeypatch.setattr(s.teaching, '_save_state', original)
    replay = s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry-2')
    current = s.teaching.get(user_id='audit-user', session_id=sid)
    assert replay['idempotent_replay']
    assert current['turn_count'] == 0
    assert current['move']['move_id'] != replay['move']['move_id']


@pytest.mark.parametrize('memory_mode', ['local_first', 'server'])
def test_pause_mid_session_still_persists_proof(app, memory_mode):
    s = app.state.services
    s.teaching.memory_mode = memory_mode
    with TestClient(app) as c:
        user, headers = register(c, 'privacy01')
        sid, answer = practice(s, user)
        paused = c.post('/v1/memory/personalization', headers=headers, json={'enabled': False})
        assert paused.status_code == 200
        s.teaching.turn(user_id=user, session_id=sid, turn=answer, idempotency_key='paused-turn')
        assert not s.memory.personalization_enabled(user)
        assert s.db.fetchone('SELECT count(*) n FROM proof_learning_events')['n'] > 0
        state = s.db.loads(s.db.fetchone('SELECT state_json FROM teaching_sessions WHERE teaching_session_id=?', (sid,))['state_json'], {})
        assert state['persist_personalization'] is True
        # The policy subsystem independently checks privacy and correctly pauses;
        # the defect is specifically proof state, and shadow evidence in local mode.
        assert s.db.fetchone('SELECT count(*) n FROM pedagogy_events WHERE user_id=?', (user,))['n'] == 0
        if memory_mode == 'local_first':
            assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1


def test_string_false_validator_verdict_is_accepted(app, monkeypatch):
    s = app.state.services
    monkeypatch.setattr(s.semantic, 'validate_assessment', lambda **kw: {
        'accepted': 'false', 'confidence': .99, 'reason': 'Reject this candidate',
    })
    frame = DecisionFrame(target_concept_id='binary_search', target_difficulty=.5,
                          action='practice', learner_reason='audit')
    result = s.teaching._validate_generated_content(
        frame=frame, budget=SemanticBudget(2), item={'answer_key': 'bad key'},
        subject_id='DSA', concept_name='Binary search', source_excerpt='',
    )
    assert result['validation_state'] == 'generated_validated'
    assert result['validation']['accepted'] is True


def test_nonfinite_semantic_grade_becomes_full_credit(app, monkeypatch):
    s = app.state.services
    fake = SimpleNamespace(local_available=False, tutor_available=True,
                           route_json=lambda *a, **kw: {'score': 'NaN', 'confidence': 'NaN'})
    monkeypatch.setattr(s.semantic, 'models', fake)
    result = s.teaching.evidence_engine.evaluate(
        {'answer_type': 'free_text', 'answer_key': 'correct answer'},
        AnswerSubmission(parts=[EvidencePart(modality='text', text='wrong answer')]),
        budget=SemanticBudget(1),
    )
    assert result.status == 'graded'
    assert result.score == 1.0 and result.confidence == 1.0


def test_one_budget_slot_can_send_three_provider_requests(app, monkeypatch):
    s = app.state.services
    s.models.settings = replace(s.settings, tutor_url='https://audit.invalid/v1', tutor_model='mock')
    requests = []
    class FakeClient:
        def __init__(self, **kw): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, url, **kw):
            requests.append(url)
            req = httpx.Request('POST', url)
            if len(requests) < 3:
                return httpx.Response(500, request=req)
            return httpx.Response(200, request=req, json={'choices': [{'message': {'content': 'Explanation'}}]})
    frame = DecisionFrame(target_concept_id='binary_search', target_difficulty=.5,
                          action='explain', learner_reason='audit')
    budget = SemanticBudget(1)
    with patch('adaptive_backend.models.httpx.Client', FakeClient), patch('adaptive_backend.models.time.sleep'):
        result = s.semantic.explain(frame=frame, budget=budget, concept_name='Binary search',
                                    subject_id='DSA', course_id=None, source_excerpt='')
    assert result == 'Explanation'
    assert budget.used == 1 and len(requests) == 3


def test_completion_can_race_inflight_turn_and_restore_scrubbed_state(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    entered, release = Event(), Event()
    original = s.teaching._next_move
    outcome = []
    def slow(**kw):
        entered.set()
        assert release.wait(10)
        return original(**kw)
    monkeypatch.setattr(s.teaching, '_next_move', slow)
    def work():
        try:
            outcome.append(s.teaching.turn(user_id='audit-user', session_id=sid,
                                          turn=answer, idempotency_key='race-turn'))
        except BaseException as exc:
            outcome.append(exc)
    thread = Thread(target=work)
    thread.start()
    try:
        assert entered.wait(10)
        s.teaching.complete(user_id='audit-user', session_id=sid)
    finally:
        release.set()
        thread.join(15)
    assert len(outcome) == 1 and isinstance(outcome[0], dict), outcome
    row = s.db.fetchone('SELECT status,state_json FROM teaching_sessions WHERE teaching_session_id=?', (sid,))
    state = s.db.loads(row['state_json'], {})
    assert row['status'] == 'completed' and state['engine_user_id'].startswith('lf:')


def test_class_source_policy_does_not_restrict_builtin_assessment_bank(app):
    s = app.state.services
    user = s.auth.register('teacher01', 'audit-password-12345', role='teacher')['user_id']
    with TestClient(app) as c:
        token = s.auth.login('teacher01', 'audit-password-12345')['access_token']
        h = {'Authorization': 'Bearer ' + token}
        course = c.post('/v1/courses', headers=h, json={
            'name': 'Source governed DSA', 'subject_id': 'DSA', 'course_kind': 'class',
        }).json()
        cid = course['course_id']
        assert not s.course_intelligence.get_constitution(user_id=user, course_id=cid)['external_sources_allowed']
        frame = s.decision.plan(user_id=user, content_user_id=user, subject_id='DSA',
                                concept_id='binary_search_boundary', course_id=cid,
                                requested_mode='practice', query='Boundary check')
        assert frame.source_hits == [] and frame.selected_question_id
        item = s.teaching._generate_assessment(subject_id='DSA', course_id=cid,
                                              plan=frame, budget=SemanticBudget(0),
                                              concept_name='Binary search boundary')
        assert item.get('source_question_id')
        assert item['validation_state'] == 'fallback_validated'
