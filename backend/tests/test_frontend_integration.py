from dataclasses import replace
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
from threading import Event, Thread
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from adaptive_backend.app import create_app


def register(client, name='frontendlearner'):
    response=client.post('/v1/auth/register',json={'username':name,'password':'frontend-password-2026'})
    assert response.status_code==200,response.text
    result=response.json()
    return result['user_id'],{'Authorization':'Bearer '+result['access_token']}


def active_shadow(app, uid, shadow):
    now=datetime.now(timezone.utc).isoformat()
    app.state.services.db.execute("INSERT INTO teaching_sessions(teaching_session_id,owner_user_id,subject_id,concept_id,mode,state_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",(str(uuid4()),uid,'DSA','binary_search','practice',app.state.services.db.dumps({'engine_user_id':shadow}),now,now))


def test_memory_settings_reports_real_storage_mode(settings):
    for mode in ['local_first','server']:
        app=create_app(replace(settings,db_path=settings.db_path.with_name(mode+'.db'),memory_mode=mode))
        with TestClient(app) as client:
            _,headers=register(client)
            body=client.get('/v1/memory/settings',headers=headers).json()
            assert body['memory_mode']==mode
            assert body['personalization_enabled'] is True


@pytest.mark.parametrize('foreign',[False,True])
def test_fresh_forensics_uses_owned_active_local_first_evidence(settings,foreign):
    app=create_app(replace(settings,memory_mode='local_first'))
    with TestClient(app) as client:
        uid,headers=register(client)
        shadow='lf:foreign:session' if foreign else f'lf:{uid}:session'
        active_shadow(app,uid,shadow)
        captured={}
        def analyze(**kwargs):captured.update(kwargs);return {'cases':[]}
        app.state.services.decision.forensics=analyze
        assert client.post('/v1/gaps/causal/analyze',headers=headers,json={}).status_code==200
        assert captured['user_id']==(uid if foreign else shadow)
        assert captured['case_owner_user_id']==uid


def test_fresh_forensics_coordinates_with_personalization_pause(settings):
    app=create_app(settings)
    with TestClient(app) as client:
        uid,headers=register(client)
        entered,release,paused=Event(),Event(),Event()
        def analyze(**kwargs):entered.set();assert release.wait(10);return {'cases':[]}
        app.state.services.decision.forensics=analyze
        analysis=Thread(target=lambda:client.post('/v1/gaps/causal/analyze',headers=headers,json={}))
        analysis.start();assert entered.wait(10)
        def pause():client.post('/v1/memory/personalization',headers=headers,json={'enabled':False});paused.set()
        pausing=Thread(target=pause);pausing.start()
        try:assert not paused.wait(.2)
        finally:release.set();analysis.join(10);pausing.join(10)
        assert paused.is_set()
        assert client.post('/v1/gaps/causal/analyze',headers=headers,json={}).status_code==409


def test_demo_seed_refuses_existing_unrecognized_database(tmp_path):
    source=Path(__file__).resolve().parents[1]/'scripts'/'run_frontend_demo.py'
    spec=importlib.util.spec_from_file_location('frontend_demo',source);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    import sqlite3
    path=tmp_path/'real.db'
    with sqlite3.connect(path) as conn:conn.execute('CREATE TABLE important(value TEXT)');conn.execute("INSERT INTO important VALUES('keep')")
    original=path.read_bytes()
    with pytest.raises(ValueError,match='refusing'):module.seed_demo(path)
    assert path.read_bytes()==original


def test_answer_audio_transcription_is_review_only_and_sanitizes_provider_errors(settings):
    from adaptive_backend.schemas import SpeechTranscript
    app=create_app(settings)
    with TestClient(app) as client:
        _,headers=register(client)
        seen=[]
        def transcribe(data,filename):
            seen.append((data,filename))
            return SpeechTranscript(text='review this answer',engine='stub')
        app.state.services.speech.transcribe=transcribe
        response=client.post('/v1/learning/transcribe-audio',headers=headers,files={'audio':('answer.wav',b'audio','audio/wav')})
        assert response.status_code==200
        assert response.json()=={'text':'review this answer','engine':'stub','language':None}
        assert seen==[(b'audio','answer.wav')]
        assert app.state.services.db.fetchone('SELECT COUNT(*) AS n FROM teaching_turns')['n']==0
        def unavailable(*args,**kwargs):raise RuntimeError('private-provider-key')
        app.state.services.speech.transcribe=unavailable
        response=client.post('/v1/learning/transcribe-audio',headers=headers,files={'audio':('answer.wav',b'audio','audio/wav')})
        assert response.status_code==503
        assert 'private-provider-key' not in response.text
        assert client.post('/v1/learning/transcribe-audio',headers=headers,files={'audio':('answer.wav',b'x'*(25*1024*1024+1),'audio/wav')}).status_code==413


def test_fresh_synthetic_seed_is_complete_and_rerun_preserves_work(tmp_path,settings):
    import sqlite3
    source=Path(__file__).resolve().parents[1]/'scripts'/'run_frontend_demo.py'
    spec=importlib.util.spec_from_file_location('frontend_demo_fresh',source)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    path=tmp_path/'demo.db'
    module.seed_demo(path)
    with sqlite3.connect(path) as conn:
        uid=conn.execute("SELECT user_id FROM users WHERE username='Bharat'").fetchone()[0]
        assert conn.execute('SELECT COUNT(*) FROM courses WHERE owner_user_id=?',(uid,)).fetchone()[0]==5
        assert conn.execute('SELECT COUNT(*) FROM teaching_sessions WHERE owner_user_id=?',(uid,)).fetchone()[0]==4
        assert conn.execute("SELECT COUNT(*) FROM learning_events WHERE activity_type='synthetic_demo'").fetchone()[0]==6
        conn.execute("UPDATE learner_profiles SET display_name='Preserve my demo edit' WHERE user_id=?",(uid,))
    module.seed_demo(path)
    with sqlite3.connect(path) as conn:
        assert conn.execute('SELECT display_name FROM learner_profiles WHERE user_id=?',(uid,)).fetchone()[0]=='Preserve my demo edit'
        assert conn.execute('SELECT COUNT(*) FROM courses WHERE owner_user_id=?',(uid,)).fetchone()[0]==5

    app=create_app(replace(settings,db_path=path,memory_mode='server'))
    with TestClient(app) as client:
        login=client.post('/v1/auth/login',json={'username':'Bharat','password':module.PASSWORD})
        assert login.status_code==200,login.text
        headers={'Authorization':'Bearer '+login.json()['access_token']}
        course=next(c for c in client.get('/v1/courses',headers=headers).json() if c['name']=='AI Judgment')
        start=client.post('/v1/learning/sessions',headers=headers,json={'subject_id':course['subject_id'],'course_id':course['course_id'],'concept_id':course['subject_id']+':disclosure','mode':'practice','goal':'Verify synthetic MCQ contract'})
        assert start.status_code==200,start.text
        state=start.json()
        assert state['move']['answer_type']=='mcq'
        result=client.post('/v1/learning/sessions/'+state['teaching_session_id']+'/turns',headers={**headers,'Idempotency-Key':'demo-grade-check'},json={'selected_option':1,'learner_intent':'answer'})
        assert result.status_code==200,result.text
        assert result.json()['evidence']['evaluation']['status']=='graded'
        assert result.json()['evidence']['evaluation']['correct'] is True


def test_course_owner_cannot_modify_shared_catalog_but_can_add_private_topics(settings):
    app=create_app(settings)
    with TestClient(app) as client:
        _,headers=register(client)
        shared=client.post('/v1/courses',headers=headers,json={'name':'Personal DSA','subject_id':'DSA','course_kind':'personal'}).json()
        before=app.state.services.db.fetchone("SELECT COUNT(*) AS n FROM concepts WHERE subject_id='DSA'")['n']
        assert client.post('/v1/courses/'+shared['course_id']+'/concepts',headers=headers,json={'name':'Global injection'}).status_code==404
        assert app.state.services.db.fetchone("SELECT COUNT(*) AS n FROM concepts WHERE subject_id='DSA'")['n']==before
        private=client.post('/v1/courses',headers=headers,json={'name':'My new subject','subject_name':'My new subject','course_kind':'personal'}).json()
        assert client.post('/v1/courses/'+private['course_id']+'/concepts',headers=headers,json={'name':'My private topic'}).status_code==200
