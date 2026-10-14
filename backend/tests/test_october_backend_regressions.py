"""Regression coverage for the October backend audit; isolated data and mocked providers."""
from dataclasses import replace
from types import SimpleNamespace
from threading import Event, Thread
from unittest.mock import patch
import asyncio
import io
import sqlite3
from threading import Barrier, get_ident

import httpx
import pytest
from fastapi.testclient import TestClient

from adaptive_backend.app import create_app, Services
from adaptive_backend.database import Database
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
    # A deterministic numeric item isolates persistence and concurrency tests.
    if not s.db.fetchone('SELECT 1 FROM users WHERE user_id=?', (user,)):
        s.db.execute("INSERT INTO users(user_id,username,password_hash,recovery_hash,role,created_at,updated_at) "
                     "VALUES(?,?,'unused-test-hash','unused-test-hash','learner','2026-10-12','2026-10-12')", (user, user))
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


def test_seeded_practice_accepts_optional_modalities(app):
    result = app.state.services.teaching.start(user_id='audit-user', request=LearningSessionStart(
        subject_id='DSA', concept_id='binary_search', mode='practice'))
    assert result['move']['required_modalities'] == []
    assert result['move']['generated_item_id']


def test_private_subject_cannot_be_grafted(app):
    with TestClient(app) as c:
        _, victim = register(c, 'victim01')
        _, attacker = register(c, 'attacker01')
        course = c.post('/v1/courses', headers=victim, json={'name': 'Private curriculum'}).json()
        cid, subject = course['course_id'], course['subject_id']
        c.post(f'/v1/courses/{cid}/concepts', headers=victim, json={'name': 'Confidential topic'})
        denied = c.post('/v1/courses', headers=attacker, json={'name': 'Copied', 'subject_id': subject})
        assert denied.status_code == 403
        assert c.get(f'/v1/courses/{cid}/concepts', headers=attacker).status_code == 404
        assert subject not in {r['subject_id'] for r in c.get('/v1/subjects', headers=attacker).json()}
        owned = c.post('/v1/courses', headers=victim, json={'name': 'Owned', 'subject_id': subject})
        assert owned.status_code == 200


def test_preexisting_private_subject_graft_does_not_grant_ownership(app):
    s = app.state.services
    with TestClient(app) as c:
        owner, victim = register(c, 'victim01')
        intruder, attacker = register(c, 'attacker01')
        course = c.post('/v1/courses', headers=victim, json={'name': 'Private curriculum'}).json()
        concept = c.post(f"/v1/courses/{course['course_id']}/concepts", headers=victim,
                         json={'name': 'Confidential topic'}).json()
        subject = course['subject_id']
        s.db.execute("INSERT INTO courses(course_id,owner_user_id,subject_id,name,created_at,updated_at) "
                     "VALUES('legacy-graft',?,?,'Copied','2099-01-01','2099-01-01')", (intruder, subject))
        # Simulate missing pre-fix ownership metadata, then run the migration.
        s.db.execute('UPDATE subjects SET owner_user_id=NULL WHERE subject_id=?', (subject,))
        s.db.initialize()
        assert s.db.fetchone('SELECT owner_user_id FROM subjects WHERE subject_id=?', (subject,))['owner_user_id'] == owner
        assert c.post('/v1/courses', headers=attacker, json={'name': 'Copy', 'subject_id': subject}).status_code == 403
        assert c.get('/v1/courses/legacy-graft/concepts', headers=attacker).status_code == 404
        assert c.post('/v1/courses/legacy-graft/concepts', headers=attacker, json={'name': 'Injection'}).status_code == 404
        assert not s.memory.visible_concept(intruder, concept['concept_id'])
        assert subject not in {r['subject_id'] for r in c.get('/v1/subjects', headers=attacker).json()}
        denied = c.post('/v1/learning/sessions', headers=attacker, json={
            'subject_id': subject, 'concept_id': concept['concept_id'], 'course_id': 'legacy-graft'})
        assert denied.status_code == 400


def test_mcp_map_checks_private_ownership_and_active_enrollment(app):
    s = app.state.services
    teacher = s.auth.register('mapteacher', 'audit-password-12345', role='teacher')
    teacher_headers = {'Authorization': 'Bearer '+teacher['access_token']}
    with TestClient(app) as c:
        learner, headers = register(c, 'maplearner')
        course = c.post('/v1/courses', headers=teacher_headers,
                        json={'name': 'Private class', 'subject_name': 'Private class', 'course_kind': 'class'}).json()
        concept = c.post(f"/v1/courses/{course['course_id']}/concepts", headers=teacher_headers,
                         json={'name': 'Private Class Concept'}).json()
        cid = concept['concept_id']
        relay = c.post('/v1/mcp/context-relay', headers=headers, json={'capsule': {'concept_states': [
            {'concept_id': cid}, {'concept_id': 'bio_golgi'}]}})
        assert relay.status_code == 200, relay.text
        connection = c.post('/v1/connections/mcp', headers=headers,
                            json={'client_name': 'Audit client', 'scopes': ['learning.map.read']}).json()
        mcp_headers = {'Authorization': 'Bearer '+connection['access_token']}
        def mapped():
            response = c.post('/mcp-legacy', headers=mcp_headers, json={'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                'params': {'name': 'get_learning_map', 'arguments': {}}})
            assert response.status_code == 200, response.text
            return response.json()['result']['structuredContent']
        first = mapped()
        assert {n['concept_id'] for n in first['nodes']} == {'bio_golgi'}
        assert 'Private Class Concept' not in str(first)
        assert c.post(f"/v1/courses/{course['course_id']}/enroll", headers=teacher_headers,
                      json={'learner_username': 'maplearner'}).status_code == 200
        assert cid in {n['concept_id'] for n in mapped()['nodes']}
        assert c.delete(f"/v1/courses/{course['course_id']}/enroll/{learner}", headers=teacher_headers).status_code == 200
        assert cid not in {n['concept_id'] for n in mapped()['nodes']}


@pytest.mark.parametrize('failure_point', ['_next_move', '_save_state'])
def test_interrupted_delivery_resumes_without_duplicate_evidence(app, monkeypatch, failure_point):
    s = app.state.services
    sid, answer = practice(s)
    original = getattr(s.teaching, failure_point)
    def fail(*a, **kw):
        raise RuntimeError('injected outage')
    monkeypatch.setattr(s.teaching, failure_point, fail)
    with pytest.raises(RuntimeError, match='injected'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry')
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1
    pending = s.db.fetchone('SELECT * FROM teaching_turns')
    assert pending['status'] == 'evidence_committed'
    assert s.teaching.get(user_id='audit-user', session_id=sid)['turn_count'] == 0
    with pytest.raises(ValueError, match='pending'):
        s.teaching.complete(user_id='audit-user', session_id=sid)
    with pytest.raises(ValueError, match='pending'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='different')
    monkeypatch.setattr(s.teaching, failure_point, original)
    recovered = s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry')
    current = s.teaching.get(user_id='audit-user', session_id=sid)
    assert current['turn_count'] == 1
    assert current['move'] == recovered['move']
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1
    assert s.db.fetchone('SELECT max(attempt_count) n FROM generated_items')['n'] == 1
    replay = s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='retry')
    assert replay == {**recovered, 'idempotent_replay': True}
    with pytest.raises(ValueError, match='different answer'):
        s.teaching.turn(user_id='audit-user', session_id=sid,
                        turn=LearningTurnInput(numeric_value=43), idempotency_key='retry')


def test_evidence_failure_rolls_back_calibration_and_events(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    original = s.proof_learning.record
    def fail(**kw):
        raise RuntimeError('injected proof failure')
    monkeypatch.setattr(s.proof_learning, 'record', fail)
    with pytest.raises(RuntimeError, match='injected'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='rollback')
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 0
    assert s.db.fetchone('SELECT max(attempt_count) n FROM generated_items')['n'] == 0
    assert s.db.fetchone('SELECT count(*) n FROM teaching_turns')['n'] == 0
    monkeypatch.setattr(s.proof_learning, 'record', original)
    assert s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='rollback')['evidence']['score'] == 1


@pytest.mark.parametrize('memory_mode', ['local_first', 'server'])
def test_pause_mid_session_stops_learning_writes(app, memory_mode):
    s = app.state.services
    s.teaching.memory_mode = memory_mode
    with TestClient(app) as c:
        user, h = register(c, 'privacy01')
        sid, answer = practice(s, user)
        assert c.post('/v1/memory/personalization', headers=h, json={'enabled': False}).status_code == 200
        result = s.teaching.turn(user_id=user, session_id=sid, turn=answer, idempotency_key='paused')
        assert result['evidence']['score'] == 1
        for table in ['learning_events', 'proof_learning_events', 'pedagogy_events']:
            assert s.db.fetchone(f'SELECT count(*) n FROM {table}')['n'] == 0
        assert s.db.fetchone('SELECT max(attempt_count) n FROM generated_items')['n'] == 0
        state = s.db.loads(s.teaching._session(user, sid)['state_json'], {})
        assert state['persist_personalization'] is False
        stored = s.db.loads(s.db.fetchone("SELECT learner_response_json FROM teaching_turns WHERE idempotency_key='paused'")['learner_response_json'], {})
        assert stored.get('redacted') is True and 'numeric_value' not in stored
        assert c.post('/v1/memory/personalization', headers=h, json={'enabled': True}).status_code == 200
        s.teaching.turn(user_id=user, session_id=sid, turn=answer, idempotency_key='enabled')
        assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1


@pytest.mark.parametrize('accepted,confidence', [('false', .99), (1, .99), (False, .99), (True, float('nan')), (True, '0.99'), (True, 2.)])
def test_invalid_validator_verdict_cannot_approve(app, monkeypatch, accepted, confidence):
    s = app.state.services
    monkeypatch.setattr(s.semantic, 'validate_assessment', lambda **kw: {
        'accepted': accepted, 'confidence': confidence})
    with pytest.raises(ValueError):
        s.teaching._validate_generated_content(
            frame=DecisionFrame(target_concept_id='binary_search', target_difficulty=.5, action='practice', learner_reason='test'),
            budget=SemanticBudget(2), item={'answer_key': 'bad'}, subject_id='DSA', concept_name='Binary search', source_excerpt='')


@pytest.mark.parametrize('score,confidence', [('NaN', 'NaN'), (float('nan'), .9), (float('inf'), .9), (1.2, .9), (.9, True), (.9, '0.9')])
def test_invalid_semantic_grade_abstains(app, monkeypatch, score, confidence):
    s = app.state.services
    fake = SimpleNamespace(local_available=False, tutor_available=True,
                           route_json=lambda *a, **kw: {'score': score, 'confidence': confidence})
    monkeypatch.setattr(s.semantic, 'models', fake)
    result = s.teaching.evidence_engine.evaluate({'answer_type': 'free_text', 'answer_key': 'correct answer'},
        AnswerSubmission(parts=[EvidencePart(modality='text', text='wrong answer')]), budget=SemanticBudget(1))
    assert result.status == 'needs_review' and result.score is None


@pytest.mark.parametrize('status', [429, 500, 503])
def test_budget_slot_sends_one_provider_request(app, status):
    s = app.state.services
    s.models.settings = replace(s.settings, tutor_url='https://audit.invalid/v1', tutor_model='mock')
    requests = []
    class FakeClient:
        def __init__(self, **kw): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def post(self, url, **kw):
            requests.append(url)
            return httpx.Response(status, request=httpx.Request('POST', url))
    frame = DecisionFrame(target_concept_id='binary_search', target_difficulty=.5, action='explain', learner_reason='test')
    budget = SemanticBudget(1)
    with patch('adaptive_backend.models.httpx.Client', FakeClient):
        result = s.semantic.explain(frame=frame, budget=budget, concept_name='Binary search', subject_id='DSA', course_id=None, source_excerpt='')
    assert result is None
    assert budget.used == 1 and len(requests) == 1


def test_completion_waits_for_turn_and_keeps_shadow_scrubbed(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    entered, release, completed = Event(), Event(), Event()
    original = s.teaching._next_move
    results, errors = [], []
    def slow(**kw):
        entered.set()
        assert release.wait(10)
        return original(**kw)
    monkeypatch.setattr(s.teaching, '_next_move', slow)
    def turn():
        try:
            results.append(s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='race'))
        except BaseException as exc: errors.append(exc)
    def complete():
        try:
            s.teaching.complete(user_id='audit-user', session_id=sid)
            completed.set()
        except BaseException as exc: errors.append(exc)
    t, c = Thread(target=turn), Thread(target=complete)
    t.start()
    try:
        assert entered.wait(10)
        c.start()
        assert not completed.wait(.1)
    finally:
        release.set()
        t.join(15)
        if c.ident: c.join(15)
    assert not errors and completed.is_set() and len(results) == 1
    row = s.teaching._session('audit-user', sid)
    assert row['status'] == 'completed'
    assert 'engine_user_id' not in s.db.loads(row['state_json'], {})
    assert not s.db.fetchone("SELECT 1 FROM sessions WHERE user_id LIKE 'lf:%'")
    replay = s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='race')
    assert replay == {**results[0], 'idempotent_replay': True}


def test_unrelated_session_can_turn_while_provider_is_blocked(app, monkeypatch):
    s = app.state.services
    first, answer = practice(s, 'first-user')
    second, _ = practice(s, 'second-user')
    entered, release = Event(), Event()
    original = s.teaching._next_move
    errors = []
    def slow(**kw):
        if kw.get('teaching_session_id') == first:
            entered.set()
            assert release.wait(10)
        return original(**kw)
    monkeypatch.setattr(s.teaching, '_next_move', slow)
    def work():
        try: s.teaching.turn(user_id='first-user', session_id=first, turn=answer, idempotency_key='one')
        except BaseException as exc: errors.append(exc)
    t = Thread(target=work)
    t.start()
    try:
        assert entered.wait(10)
        assert s.teaching.turn(user_id='second-user', session_id=second, turn=answer, idempotency_key='two')['evidence']['score'] == 1
    finally:
        release.set()
        t.join(15)
    assert not errors


def test_closed_source_class_has_no_global_bank_fallback(app):
    s = app.state.services
    user = s.auth.register('teacher01', 'audit-password-12345', role='teacher')['user_id']
    token = s.auth.login('teacher01', 'audit-password-12345')['access_token']
    with TestClient(app) as c:
        course = c.post('/v1/courses', headers={'Authorization': 'Bearer '+token},
                        json={'name': 'Source governed DSA', 'subject_id': 'DSA', 'course_kind': 'class'}).json()
    cid = course['course_id']
    assert not s.course_intelligence.get_constitution(user_id=user, course_id=cid)['external_sources_allowed']
    frame = s.decision.plan(user_id=user, content_user_id=user, subject_id='DSA', concept_id='binary_search_boundary',
                            course_id=cid, requested_mode='practice', query='Boundary check')
    assert frame.source_hits == [] and frame.selected_question_id is None
    item = s.teaching._generate_assessment(subject_id='DSA', course_id=cid, plan=frame, budget=SemanticBudget(0), concept_name='Boundary')
    assert not item.get('source_question_id') and item['answer_key'] is None
    assert item['content_status'] == 'unavailable'
    started = s.teaching.start(user_id=user, request=LearningSessionStart(subject_id='DSA', concept_id='binary_search_boundary', course_id=cid, mode='practice'))
    assert started['move']['content_status'] == 'unavailable'


def test_stale_cleanup_does_not_require_owner_return(app):
    s = app.state.services
    first, _ = practice(s, 'absent-one')
    second, _ = practice(s, 'absent-two')
    recent, _ = practice(s, 'active-user')
    s.db.execute("UPDATE teaching_sessions SET updated_at='2020-01-01T00:00:00+00:00' WHERE teaching_session_id IN (?,?)", (first, second))
    assert s.teaching._expire_stale_local_first_shadows() == 2
    for user, sid in [('absent-one', first), ('absent-two', second)]:
        row = s.teaching._session(user, sid)
        assert row['status'] == 'expired' and 'engine_user_id' not in s.db.loads(row['state_json'], {})
    assert s.teaching.get(user_id='active-user', session_id=recent)['status'] == 'active'
    assert s.db.fetchone('SELECT count(*) n FROM sessions')['n'] == 1


def test_pending_turn_recovers_after_service_restart(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    def fail(**kw): raise RuntimeError('restart required')
    monkeypatch.setattr(s.teaching, '_next_move', fail)
    with pytest.raises(RuntimeError):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='restart')
    restarted = Services(s.settings)
    result = restarted.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='restart')
    assert result['evidence']['score'] == 1
    assert restarted.teaching.get(user_id='audit-user', session_id=sid)['turn_count'] == 1
    assert restarted.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1


def test_browser_reload_resumes_committed_turn_without_raw_answer(app, monkeypatch):
    s = app.state.services
    with TestClient(app) as c:
        user, headers = register(c, 'resume01')
        _, stranger = register(c, 'stranger01')
        sid, answer = practice(s, user)
        original = s.teaching._next_move
        def fail(**kw): raise RuntimeError('delivery unavailable')
        monkeypatch.setattr(s.teaching, '_next_move', fail)
        with pytest.raises(RuntimeError):
            s.teaching.turn(user_id=user, session_id=sid, turn=answer, idempotency_key='browser')
        monkeypatch.setattr(s.teaching, '_next_move', original)
        current = c.get(f'/v1/learning/sessions/{sid}', headers=headers).json()
        assert current['pending_turn'] and current['pending_turn_key'] == 'browser'
        assert c.post(f'/v1/learning/sessions/{sid}/resume', headers=stranger).status_code == 400
        recovered = c.post(f'/v1/learning/sessions/{sid}/resume', headers={**headers, 'Idempotency-Key': current['pending_turn_key']})
        assert recovered.status_code == 200, recovered.text
        assert recovered.json()['evidence']['score'] == 1
        assert not c.get(f'/v1/learning/sessions/{sid}', headers=headers).json()['pending_turn']
        assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1


def test_independent_service_instances_return_same_committed_response(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    other = Services(s.settings)
    barrier = Barrier(2)
    results, errors = [], []
    for service in [s, other]:
        original = service.teaching._next_move
        def blocked(_original=original, **kw):
            barrier.wait(timeout=10)
            return _original(**kw)
        monkeypatch.setattr(service.teaching, '_next_move', blocked)
    def work(service):
        try: results.append(service.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='workers'))
        except BaseException as exc: errors.append(exc)
    threads = [Thread(target=work, args=(service,)) for service in [s, other]]
    for t in threads: t.start()
    for t in threads: t.join(15)
    assert not errors and len(results) == 2
    assert {r['turn_id'] for r in results} == {results[0]['turn_id']}
    assert results[0]['move'] == results[1]['move']
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1
    assert s.teaching.get(user_id='audit-user', session_id=sid)['turn_count'] == 1


def test_privacy_change_during_generation_invalidates_delivery_snapshot(app, monkeypatch):
    s = app.state.services
    sid, answer = practice(s)
    original = s.teaching._next_move
    def pause(**kw):
        s.teaching.set_personalization('audit-user', False)
        return original(**kw)
    monkeypatch.setattr(s.teaching, '_next_move', pause)
    with pytest.raises(ValueError, match='Session changed'):
        s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='privacy-race')
    monkeypatch.setattr(s.teaching, '_next_move', original)
    result = s.teaching.turn(user_id='audit-user', session_id=sid, turn=answer, idempotency_key='privacy-race')
    assert result['evidence']['score'] == 1
    assert s.db.fetchone('SELECT count(*) n FROM learning_events')['n'] == 1
    assert not s.db.loads(s.teaching._session('audit-user', sid)['state_json'], {})['persist_personalization']


def _legacy_database(s):
    # Simulate the v7 shape without replacing the original seeded content.
    with sqlite3.connect(s.settings.db_path) as conn:
        for table, fields in [('teaching_sessions', ['version', 'pending_turn_id']),
                              ('teaching_turns', ['status', 'request_hash', 'response_json'])]:
            for field in fields: conn.execute(f'ALTER TABLE {table} DROP COLUMN {field}')
        conn.execute('PRAGMA user_version=7')


def test_v7_upgrade_preserves_rows_and_creates_backup(app):
    s = app.state.services
    sid, _ = practice(s)
    _legacy_database(s)
    upgraded = Database(s.settings.db_path)
    upgraded.initialize()
    assert upgraded.fetchone('PRAGMA user_version')[0] == 8
    row = upgraded.fetchone('SELECT * FROM teaching_sessions WHERE teaching_session_id=?', (sid,))
    assert row['version'] == 0 and row['pending_turn_id'] is None
    backups = list(s.settings.db_path.parent.glob(s.settings.db_path.name+'.pre-v8-*.bak'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute('PRAGMA user_version').fetchone()[0] == 7
        assert backup.execute('SELECT teaching_session_id FROM teaching_sessions').fetchone()[0] == sid
    upgraded.initialize()
    assert len(list(s.settings.db_path.parent.glob('*.bak'))) == 1


def test_failed_schema_upgrade_rolls_back_all_changes(app, monkeypatch):
    s = app.state.services
    _legacy_database(s)
    original = Database._execute_schema
    def fail(conn, script, **kw):
        if 'CREATE VIRTUAL TABLE' in script: raise RuntimeError('injected migration failure')
        return original(conn, script, **kw)
    monkeypatch.setattr(Database, '_execute_schema', staticmethod(fail))
    with pytest.raises(RuntimeError, match='injected'):
        Database(s.settings.db_path).initialize()
    with sqlite3.connect(s.settings.db_path) as conn:
        assert conn.execute('PRAGMA user_version').fetchone()[0] == 7
        assert 'version' not in {r[1] for r in conn.execute('PRAGMA table_info(teaching_sessions)')}


def test_document_extraction_runs_off_event_loop(app, monkeypatch):
    from fastapi import UploadFile
    s = app.state.services
    original = s.documents._native_extract
    caller = get_ident()
    extraction_threads = []
    def extract(*a, **kw):
        extraction_threads.append(get_ident())
        return original(*a, **kw)
    monkeypatch.setattr(s.documents, '_native_extract', extract)
    result = asyncio.run(s.documents.upload(user_id='audit-user', course_id=None,
        upload=UploadFile(filename='audit.txt', file=io.BytesIO(b'An isolated document extraction test.'))))
    assert extraction_threads and extraction_threads[0] != caller
    assert result['status'] != 'failed'


@pytest.mark.parametrize('value', [float('nan'), float('inf'), -float('inf')])
def test_nonfinite_learner_values_are_rejected(value):
    with pytest.raises(ValueError): LearningTurnInput(numeric_value=value)
    with pytest.raises(ValueError): EvidencePart(modality='numeric', numeric_value=value)


def test_nonfinite_numeric_tolerance_cannot_grant_credit(app):
    result = app.state.services.teaching.evidence_engine.evaluate(
        {'answer_type': 'numeric', 'answer_key': 42, 'absolute_tolerance': float('inf')},
        AnswerSubmission(parts=[EvidencePart(modality='numeric', numeric_value=-999)]))
    assert result.status == 'needs_review' and result.score is None


