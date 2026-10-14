"""Run an isolated, clearly synthetic frontend demo. Existing databases are never reset."""
from __future__ import annotations
from contextlib import closing
import argparse
import json
import os
import secrets
import sqlite3
import sys
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from adaptive_backend.app import create_app
from adaptive_backend.config import Settings
from adaptive_backend.schemas import EvidenceEvent, SubjectPackIn
from adaptive_backend.sdg import seed_bharat_demo
from adaptive_backend.teaching import LearningSessionStart, LearningTurnInput

PASSWORD="OVAEL-demo-2026!"
ROOT=Path(__file__).resolve().parents[1]

def _build_demo(path:Path):
    path=path.resolve()
    if path.exists():
        with closing(sqlite3.connect(f"file:{path.as_posix()}?mode=ro",uri=True)) as conn:
            try:
                row=conn.execute("SELECT preferences_json,synthetic FROM learner_profiles p JOIN users u ON p.user_id=u.user_id WHERE u.username='Bharat'").fetchone()
            except sqlite3.DatabaseError as exc:
                raise ValueError("Existing database is not this frontend demo; refusing to modify it.") from exc
            if not row or not row[1] or json.loads(row[0]).get("frontend_demo_version")!=1:
                raise ValueError("Existing database is not this frontend demo; refusing to modify it.")
        return
    settings=replace(Settings.from_env(),db_path=path,storage_dir=path.parent/"frontend-demo-uploads",auth_required=True,auth_secret=secrets.token_urlsafe(48),memory_mode="server",tutor_url=None,local_model_url=None,supervisor_url=None,mimo_base_url=None,mimo_api_key=None)
    app=create_app(settings)
    services=app.state.services
    demo=seed_bharat_demo(services,password=PASSWORD,reset=False)
    uid=demo["user_id"]
    # Course/document setup uses the same authenticated API as the browser.
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        response=client.post('/v1/auth/login',json={'username':'Bharat','password':PASSWORD});response.raise_for_status()
        headers={'X-CSRF-Token':client.cookies.get('ovael_csrf','')}
        def post(url,**kwargs):
            r=client.post(url,headers=headers,**kwargs);r.raise_for_status();return r.json()
        courses={}
        for sid,name in [('DSA','Data Structures & Algorithms'),('BIO','Cell Biology'),('PROG','Programming Foundations'),('MATH','Mathematical Thinking')]:
            courses[sid]=post('/v1/courses',json={'name':name,'subject_id':sid,'course_kind':'personal','description':'Synthetic demonstration course'})
        ai=post('/v1/courses',json={'name':'AI Judgment','subject_name':'AI Judgment','course_kind':'personal','description':'Practice verification, privacy, fairness, and disclosure.'})
        items=json.loads((ROOT/'demo'/'ai_judgment_questions.json').read_text(encoding='utf-8'))['items']
        sid=ai['subject_id'];ids={d:f"{sid}:{d}" for d in ['verification','privacy','fairness','disclosure']}
        services.subjects.upsert_pack(SubjectPackIn.model_validate({'subject_id':sid,'name':'AI Judgment','concepts':[{'concept_id':cid,'name':domain.capitalize()} for domain,cid in ids.items()],'questions':[{'question_id':f"{sid}:{item['id']}",'primary_concept_id':ids[item['domain']],'stem':item['question'],'answer_type':'mcq','answer_key':item['answer'],'difficulty':0.35,'metadata':{'options':item['options'],'explanation':item['explain'],'curriculum_source':'competition-package-reviewed-selection'}} for item in items]}))
        notes=[('DSA','binary-search-notes.md',"""# Binary search
Maintain an interval containing the target. Discarding mid must strictly shrink the interval: update low to mid + 1 or high to mid - 1. Arrays are sorted.

```mermaid
flowchart LR
S[Sorted array] --> M[Check midpoint]
M --> L[Discard lower half]
M --> R[Discard upper half]
```
"""),('BIO','cell-biology-notes.md',"""# Cell Biology
The Golgi apparatus modifies and packages proteins. Lysosomes digest cellular waste. Peroxisomes break down fatty acids and detoxify hydrogen peroxide. These synthetic notes are for demonstration.
""")]
        for sid,filename,text in notes:
            post(f"/v1/documents/upload?course_id={courses[sid]['course_id']}",files={'file':(filename,text.encode(),'text/markdown')})
    now=datetime.now(timezone.utc)
    for index,(cid,sid) in enumerate([('binary_search_boundary','DSA'),('binary_search_loop_invariant','DSA'),('bio_peroxisome','BIO'),('recursion_base_case','DSA')]):
        # Use normal teaching transactions; the profile marks every sample as synthetic.
        result=services.teaching.start(user_id=uid,request=LearningSessionStart(subject_id=sid,concept_id=cid,course_id=courses[sid]['course_id'],mode='practice',goal='Synthetic practice history',source_client='web'))
        session_id=result['teaching_session_id']
        for turn in range(2):
            services.teaching.turn(user_id=uid,session_id=session_id,turn=LearningTurnInput(response='The interval must strictly shrink by discarding the midpoint.',learner_intent='answer',input_mode='text'),idempotency_key=f'demo-{index}-{turn}')
        services.teaching.complete(user_id=uid,session_id=session_id)
        stamp=(now-timedelta(days=index+1)).isoformat()
        services.db.execute('UPDATE teaching_sessions SET created_at=?,updated_at=?,ended_at=? WHERE teaching_session_id=?',(stamp,stamp,stamp,session_id))
        services.db.execute('UPDATE teaching_turns SET created_at=? WHERE teaching_session_id=?',(stamp,session_id))
    for cid,sid in [('dsa_arrays','DSA'),('binary_search','DSA'),('bio_peroxisome','BIO')]:
        for dimension,score in [('acquisition',0.85),('independent',0.65),('transfer',0.5),('retention',0.6)]:
            event=EvidenceEvent(session_id='synthetic-proof',user_id=uid,subject_id=sid,concept_ids=[cid],primary_concept_id=cid,activity_type='synthetic_demo',correct=score>=0.7,score=score,evidence_strength=0.8,timestamp=now-timedelta(days=5),metadata={'synthetic':True,'behavior':{'hint_count':0,'attempt_count':1}})
            services.proof_learning.record(event=event,requested_dimension=dimension,assistance_level=1)
    for cid,sid in [('bio_peroxisome','BIO'),('recursion_base_case','DSA')]:
        sample=services.memory.start_session(user_id=uid,subject_id=sid,goal='Synthetic retained diagnostic observations',source='system')
        services.db.execute('UPDATE sessions SET started_at=? WHERE session_id=?',((now-timedelta(hours=9)).isoformat(),sample.session_id))
        for index,correct in enumerate([False,False,True]):
            event=EvidenceEvent(session_id=sample.session_id,user_id=uid,subject_id=sid,concept_ids=[cid],primary_concept_id=cid,activity_type='synthetic_demo',correct=correct,score=float(correct),evidence_strength=0.85,timestamp=now-timedelta(hours=8-index),mistake_type=None if correct else 'synthetic_concept_confusion',metadata={'synthetic':True,'behavior':{'hint_count':0,'attempt_count':1}})
            services.learner.process_event(event)
        services.memory.complete_session(sample.session_id)
    services.decision.forensics(user_id=uid,persist=True)
    row=services.db.fetchone('SELECT preferences_json FROM learner_profiles WHERE user_id=?',(uid,))
    preferences=services.db.loads(row['preferences_json'],{});preferences['frontend_demo_version']=1
    services.db.execute('UPDATE learner_profiles SET preferences_json=? WHERE user_id=?',(services.db.dumps(preferences),uid))

def _upgrade_demo_evidence(path:Path):
    settings=replace(Settings.from_env(),db_path=path,storage_dir=path.parent/'frontend-demo-uploads',memory_mode='server',tutor_url=None,local_model_url=None,supervisor_url=None,mimo_base_url=None,mimo_api_key=None)
    services=create_app(settings).state.services
    row=services.db.fetchone("SELECT p.* FROM learner_profiles p JOIN users u ON p.user_id=u.user_id WHERE u.username='Bharat'")
    if not row or not row['synthetic']:raise ValueError('Expected synthetic demo profile')
    preferences=services.db.loads(row['preferences_json'],{})
    if preferences.get('retained_evidence_version')==1:return
    uid=row['user_id'];now=datetime.now(timezone.utc)
    for cid,sid in [('bio_peroxisome','BIO'),('recursion_base_case','DSA')]:
        existing=services.db.fetchone("SELECT 1 FROM learning_events WHERE user_id=? AND primary_concept_id=? AND activity_type='synthetic_demo'",(uid,cid))
        if existing:continue
        sample=services.memory.start_session(user_id=uid,subject_id=sid,goal='Synthetic retained diagnostic observations',source='system')
        services.db.execute('UPDATE sessions SET started_at=? WHERE session_id=?',((now-timedelta(hours=9)).isoformat(),sample.session_id))
        for index,correct in enumerate([False,False,True]):
            event=EvidenceEvent(session_id=sample.session_id,user_id=uid,subject_id=sid,concept_ids=[cid],primary_concept_id=cid,activity_type='synthetic_demo',correct=correct,score=float(correct),evidence_strength=0.85,timestamp=now-timedelta(hours=8-index),mistake_type=None if correct else 'synthetic_concept_confusion',metadata={'synthetic':True,'behavior':{'hint_count':0,'attempt_count':1}})
            services.learner.process_event(event)
        services.memory.complete_session(sample.session_id)
    services.decision.forensics(user_id=uid,persist=True)
    preferences['retained_evidence_version']=1
    services.db.execute('UPDATE learner_profiles SET preferences_json=? WHERE user_id=?',(services.db.dumps(preferences),uid))


def _upgrade_demo_questions(path:Path):
    # Restrict the repair to the recognized synthetic account and curated pack.
    items=json.loads((ROOT/'demo'/'ai_judgment_questions.json').read_text(encoding='utf-8'))['items']
    with closing(sqlite3.connect(path)) as conn:
        row=conn.execute("SELECT c.subject_id FROM courses c JOIN users u ON u.user_id=c.owner_user_id WHERE u.username='Bharat' AND c.name='AI Judgment'").fetchone()
        if not row:return
        with conn:
            for item in items:
                conn.execute('UPDATE questions SET answer_key_json=? WHERE question_id=?',(json.dumps(item['answer']),f"{row[0]}:{item['id']}"))

def seed_demo(path:Path):
    path=path.resolve()
    if path.exists():
        _build_demo(path)  # Validate the synthetic marker before upgrading this demo.
        _upgrade_demo_questions(path)
        _upgrade_demo_evidence(path)
        return
    from uuid import uuid4
    path.parent.mkdir(parents=True,exist_ok=True)
    staging=path.with_name(path.stem+'.seed-'+uuid4().hex+'.db')
    _build_demo(staging)
    _upgrade_demo_evidence(staging)
    with closing(sqlite3.connect(staging)) as conn:
        conn.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    # Publish a completed seed only; failed staging databases remain available for diagnosis.
    if path.exists():
        raise ValueError('Demo destination appeared during seeding; refusing to replace it.')
    staging.rename(path)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--db',type=Path,default=ROOT/'runtime'/'frontend-integration-demo.db');parser.add_argument('--seed-only',action='store_true');parser.add_argument('--live-models',action='store_true',help='Use configured model services; default demo is offline');args=parser.parse_args()
    seed_demo(args.db)
    print('Synthetic frontend demo: Bharat / '+PASSWORD)
    if args.seed_only:return
    os.environ['ADAPTIVE_DB_PATH']=str(args.db.resolve());os.environ['OVAEL_STORAGE_DIR']=str(args.db.resolve().parent/'frontend-demo-uploads');os.environ['OVAEL_AUTH_REQUIRED']='true';os.environ.setdefault('OVAEL_AUTH_SECRET',secrets.token_urlsafe(48));os.environ['OVAEL_MEMORY_MODE']='server'
    os.environ.setdefault('OVAEL_PUBLIC_BASE_URL', 'http://127.0.0.1:5173')
    if not args.live_models:
        for name in ['ADAPTIVE_TUTOR_URL','ADAPTIVE_LOCAL_MODEL_URL','ADAPTIVE_SUPERVISOR_URL','OVAEL_MIMO_BASE_URL','OVAEL_MIMO_API_KEY','ADAPTIVE_STT_URL','ADAPTIVE_TTS_URL','ADAPTIVE_WHISPER_CPP_BIN','ADAPTIVE_WHISPER_CPP_MODEL']:
            os.environ[name]=''
        for name in ['OPENROUTER_API_KEY','ADAPTIVE_VISION_URL','OPENROUTER_VISION_MODEL']:
            os.environ[name]=''
    import uvicorn
    uvicorn.run('adaptive_backend.app:create_app',factory=True,host='127.0.0.1',port=8000)
if __name__=='__main__':main()
