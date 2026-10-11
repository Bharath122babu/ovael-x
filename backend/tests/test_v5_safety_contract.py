"""Adversarial v5 contract tests: unsafe auto-credit is more harmful than abstention."""
from fastapi.testclient import TestClient
from adaptive_backend.app import create_app
from adaptive_backend.assessment_evidence import AssessmentEvidenceEngine, AnswerSubmission, EvidencePart
from adaptive_backend.inference import SemanticBudget


class UnavailableSemantic:
    def grade_ambiguous_free_text(self, **kwargs):
        return None


def evaluate(item, *parts):
    return AssessmentEvidenceEngine(UnavailableSemantic()).evaluate(item, AnswerSubmission(parts=list(parts)))


def test_negated_expected_keywords_never_get_full_credit():
    item={"answer_type":"free_text", "answer_key":{
        "grading_method":"literal_criteria", "required_groups":[["ATP"],["NADH"]]}}
    result=evaluate(item,EvidencePart(modality="text",text="No ATP or NADH is produced in this pathway."))
    assert result.score is None and result.correct is None
    assert result.status=="needs_review"


def test_keyword_mention_plus_opposite_claim_abstains():
    item={"answer_type":"free_text", "answer_key":{
        "grading_method":"literal_criteria", "required_groups":[["ATP"],["NADH"]]}}
    for answer in ("ATP is consumed and NADH depleted", "ATP is not made and NADH is not formed"):
        assert evaluate(item,EvidencePart(modality="text",text=answer)).score is None


def test_mixed_requires_all_mandatory_parts():
    item={"answer_type":"mixed", "answer_key":{
        "required_modalities":["text","numeric"],
        "modality_criteria":{
            "text":{"answer_type":"free_text","answer_key":"glucose"},
            "numeric":{"answer_type":"numeric","answer_key":2},
        }}}
    missing=evaluate(item,EvidencePart(modality="text",text="glucose"))
    assert missing.score is None and "numeric" in missing.needs_review_reason
    full=evaluate(item,EvidencePart(modality="text",text="glucose"),EvidencePart(modality="numeric",numeric_value=2))
    assert full.status=="graded" and full.score==1 and full.correct
    partial=evaluate(item,EvidencePart(modality="text",text="glucose"),EvidencePart(modality="numeric",numeric_value=3))
    assert partial.score == 0.5 and not partial.correct


def test_diagram_ocr_labels_cannot_prove_visual_topology():
    item={"answer_type":"diagram", "answer_key":{"required_relations":[["A","flows_to","B"]]}}
    result=evaluate(item,EvidencePart(modality="diagram",labels=["A","B"],relations=[("A","flows_to","B")]))
    assert result.score is None and result.status=="needs_review"


def test_oral_and_handwriting_form_cannot_be_verified_from_text_alone():
    for kind, modality in (("oral", "audio"), ("handwritten", "handwriting")):
        result=evaluate({"answer_type":kind,"answer_key":"correct words"},
                        EvidencePart(modality=modality,text="correct words"))
        assert result.score is None and result.status=="needs_review"


def test_mixed_diagram_cannot_be_bypassed_by_perfect_text():
    item={"answer_type":"mixed", "answer_key":{
        "required_modalities":["text","diagram"],
        "modality_criteria":{
            "text":{"answer_type":"free_text","answer_key":"ATP"},
            "diagram":{"answer_type":"diagram","answer_key":{"required_relations":[["A","to","B"]]}},
        }}}
    result=evaluate(item,EvidencePart(modality="text",text="ATP"),EvidencePart(modality="diagram",text="A B"))
    assert result.score is None
    assert result.criterion_results["text"] == 1


def test_shared_budget_fences_subsystems_and_has_one_root_ledger():
    root=SemanticBudget(2,decision_id="test-5")
    grading=root.child(1)
    teaching=root.child(2)
    assert grading.take("grading",route="model")
    assert not grading.take("repeat_grade",route="model")
    assert teaching.take("teaching",route="model")
    assert not teaching.take("research",route="model")
    snapshot=root.snapshot()
    assert snapshot["used"]==2 and snapshot["remaining"]==0
    assert [call["label"] for call in snapshot["calls"] if call["granted"]] == ["grading","teaching"]


def test_unvalidated_course_question_does_not_create_learning_evidence(settings):
    app=create_app(settings)
    with TestClient(app) as client:
        reg=client.post('/v1/auth/register',json={'username':'safetyv5','password':'correct-horse-battery','role':'learner'})
        assert reg.status_code==200,reg.text
        token=reg.json()['access_token'];headers={'Authorization':'Bearer '+token}
        course=client.post('/v1/courses',headers=headers,json={'name':'Unstudied materials','subject_name':'Unstudied materials'}).json()
        concept=client.post(f"/v1/courses/{course['course_id']}/concepts",headers=headers,json={'name':'Novel unknown mechanism'}).json()
        start=client.post('/v1/learning/sessions',headers=headers,json={
            'course_id':course['course_id'],'subject_id':course['subject_id'], 'concept_id':concept['concept_id'],'mode':'study'})
        assert start.status_code==200,start.text
        sid=start.json()['teaching_session_id']
        move=start.json()['move']
        assert move['content_status'] in {'unavailable','source_excerpt','generated','assessment'}
        turn=client.post(f'/v1/learning/sessions/{sid}/turns',headers={**headers,'Idempotency-Key':'attempt1'},json={
            'response':'my answer', 'submission':{'parts':[{'modality':'text','text':'my answer'}]}})
        assert turn.status_code==200,turn.text
        evidence=turn.json()['evidence']
        assert evidence['score'] is None and evidence['correct'] is None
        assert evidence['inference']['max_calls']==3
        state_row=app.state.services.db.fetchone('SELECT state_json FROM teaching_sessions WHERE teaching_session_id=?',(sid,))
        learner_id=app.state.services.db.loads(state_row['state_json'],{})['engine_user_id']
        rows=app.state.services.db.fetchall('SELECT event_id FROM learning_events WHERE user_id=?',(learner_id,))
        assert not rows
        replay=client.post(f'/v1/learning/sessions/{sid}/turns',headers={**headers,'Idempotency-Key':'attempt1'},json={'response':'my answer'})
        assert replay.status_code==200 and replay.json()['idempotent_replay']


def test_requesting_explanation_is_not_assessment_failure(settings):
    app=create_app(settings)
    with TestClient(app) as client:
        reg=client.post('/v1/auth/register',json={'username':'hintv5','password':'correct-horse-battery','role':'learner'})
        token=reg.json()['access_token'];h={'Authorization':'Bearer '+token}
        start=client.post('/v1/learning/sessions',headers=h,json={'subject_id':'BIO','concept_id':'bio_golgi'})
        sid=start.json()['teaching_session_id']
        turn=client.post(f'/v1/learning/sessions/{sid}/turns',headers={**h,'Idempotency-Key':'help1'},json={'learner_intent':'need_explanation'})
        assert turn.status_code==200,turn.text
        assert turn.json()['evidence']['non_assessment_turn'] is True
        assert turn.json()['evidence']['score'] is None
