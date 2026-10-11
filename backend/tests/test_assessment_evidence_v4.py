from adaptive_backend.assessment_evidence import AnswerSubmission, EvidencePart, AssessmentEvidenceEngine

class OfflineSemantic:
    def grade_ambiguous_free_text(self, **kwargs):
        return None


def engine():
    return AssessmentEvidenceEngine(OfflineSemantic())


def test_mcq_correct_and_wrong():
    e = engine()
    q = {"answer_type":"mcq", "answer_key":1}
    assert e.evaluate(q,AnswerSubmission(parts=[EvidencePart(modality="choice",selected_option=1)])).score == 1
    assert e.evaluate(q,AnswerSubmission(parts=[EvidencePart(modality="choice",selected_option=0)])).correct is False


def test_numeric():
    e = engine(); q={"answer_type":"numeric","answer_key":3.14}
    assert e.evaluate(q,AnswerSubmission(parts=[EvidencePart(modality="numeric",numeric_value=3.14)])).correct
    assert not e.evaluate(q,AnswerSubmission(parts=[EvidencePart(modality="numeric",numeric_value=5.4)])).correct


def test_open_answer_no_key_abstains():
    result=engine().evaluate({"answer_type":"long_answer","answer_key":None},AnswerSubmission(parts=[EvidencePart(modality="text",text="something")]))
    assert result.score is None and result.correct is None and result.status=="needs_review"


def test_ocr_low_confidence_abstains_even_if_exact():
    result=engine().evaluate({"answer_type":"free_text","answer_key":"cell"},AnswerSubmission(parts=[EvidencePart(modality="handwriting",text="cell",extraction_confidence=.48)]))
    assert result.score is None and result.status=="needs_review"


def test_no_hallucinated_diagram_grade():
    result=engine().evaluate({"answer_type":"diagram","answer_key":{"required_relations":[["A","feeds","B"]]}},AnswerSubmission(parts=[EvidencePart(modality="diagram",labels=["A","B"])]))
    assert result.score is None and result.needs_review_reason


def test_mixed_exact_answer():
    result=engine().evaluate({"answer_type":"short_answer","answer_key":"NADH"},AnswerSubmission(parts=[EvidencePart(modality="handwriting",text="NADH"),EvidencePart(modality="diagram",labels=["ATP"])]))
    assert result.correct is True and set(result.modalities)=={"handwriting","diagram"}


def test_no_semantic_false_negative_for_paraphrase():
    result=engine().evaluate({"answer_type":"free_text","answer_key":"glucose oxidation"},AnswerSubmission(parts=[EvidencePart(modality="text",text="sugar converted to usable energy")]))
    assert result.score is None and result.status=="needs_review"


def test_empty_submission():
    assert engine().evaluate({"answer_type":"free_text","answer_key":"a"},AnswerSubmission()).status=="insufficient_input"


def test_literal_criteria_optin():
    key={"grading_method":"literal_criteria","required_groups":[["ATP"],["NADH"]]}
    r=engine().evaluate({"answer_type":"free_text","answer_key":key},AnswerSubmission(parts=[EvidencePart(modality="text",text="ATP is made with NADH")]))
    assert r.score == 1 and r.correct


def test_evidence_object_never_returns_raw_answer():
    r=engine().evaluate({"answer_type":"free_text","answer_key":None},AnswerSubmission(parts=[EvidencePart(modality="text",text="PRIVATE RAW RESPONSE")]))
    assert "PRIVATE RAW RESPONSE" not in str(r.public_dict())


def test_new_course_concept_flow_and_session(settings):
    from fastapi.testclient import TestClient
    from adaptive_backend.app import create_app
    with TestClient(create_app(settings)) as c:
        reg=c.post('/v1/auth/register',json={'username':'student_concepts','password':'correct-horse-battery','role':'learner'})
        assert reg.status_code==200,reg.text
        h={'Authorization':'Bearer '+reg.json()['access_token']}
        created=c.post('/v1/courses',json={'name':'New course','subject_name':'New course'},headers=h)
        assert created.status_code==200,created.text
        co=created.json()
        concept=c.post(f"/v1/courses/{co['course_id']}/concepts",json={'name':'Fluid dynamics'},headers=h)
        assert concept.status_code==200,concept.text
        cid=concept.json()['concept_id']
        listing=c.get(f"/v1/courses/{co['course_id']}/concepts",headers=h)
        assert listing.status_code==200 and any(x['concept_id']==cid for x in listing.json())
        started=c.post('/v1/learning/sessions',headers=h,json={'subject_id':co['subject_id'],'concept_id':cid,'course_id':co['course_id'],'mode':'study'})
        assert started.status_code==200,started.text
        turn=c.post(f"/v1/learning/sessions/{started.json()['teaching_session_id']}/turns",headers={**h,'Idempotency-Key':'v4-new-flow'},json={'response':'MY PRIVATE STUDENT ANSWER','submission':{'parts':[{'modality':'text','text':'MY PRIVATE STUDENT ANSWER'}]}})
        assert turn.status_code==200,turn.text
        assert 'evaluation' in turn.json()['evidence']


def test_image_extraction_auth_required(settings):
    from fastapi.testclient import TestClient
    from adaptive_backend.app import create_app
    with TestClient(create_app(settings)) as c:
        r=c.post('/v1/learning/extract-image',files={'file':('a.png',b'bad','image/png')})
        assert r.status_code==401
