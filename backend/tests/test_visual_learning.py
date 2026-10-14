from dataclasses import replace
from io import BytesIO
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter
import pytest
from adaptive_backend.app import create_app
from adaptive_backend.schemas import OCRResult
from adaptive_backend.ocr import OCRService

def register(client, name="visual-learner"):
    response=client.post("/v1/auth/register",json={"username":name,"password":"Visual-test-2026!"})
    assert response.status_code==200, response.text
    return {"Authorization":"Bearer "+response.json()["access_token"]}

def test_custom_course_preferences_and_owner_scoped_review(settings):
    app=create_app(settings)
    with TestClient(app) as client:
        headers=register(client)
        saved=client.patch("/v1/profile/study-preferences",headers=headers,json={"format":"visual","pace":"small_steps","plain_language":True})
        assert saved.status_code==200
        assert client.get("/v1/profile",headers=headers).json()["preferences"]["study"]["pace"]=="small_steps"
        course=client.post("/v1/courses",headers=headers,json={"name":"Game design from a book","subject_name":"Game design","description":"Learning goal: Build a platform game\nStarting level: beginner"}).json()
        topic=client.post(f"/v1/courses/{course['course_id']}/concepts",headers=headers,json={"name":"Game loops"}).json()
        start=client.post("/v1/learning/sessions",headers=headers,json={"subject_id":course["subject_id"],"course_id":course["course_id"],"concept_id":topic["concept_id"],"mode":"study","goal":"Understand game loops"})
        assert start.status_code==200, start.text
        sid=start.json()["teaching_session_id"]
        assert client.post(f"/v1/learning/sessions/{sid}/complete",headers=headers).status_code==200
        review=client.get(f"/v1/learning/sessions/{sid}/review",headers=headers).json()
        assert review["graded"]==0 and review["turns"]==[]
        assert "does not mean" in review["summary"]
        assert review["topics"]==["Game loops"]
        assert client.post(f"/v1/learning/sessions/{sid}/review",headers=headers).json()["summary_kind"]=="activity_receipt"
        other=register(client,"other-visual-learner")
        assert client.get(f"/v1/learning/sessions/{sid}/review",headers=other).status_code==404
        assert client.patch("/v1/profile/study-preferences",headers=headers,json={"format":"diagnose-health"}).status_code==422

def test_120_page_book_is_rendered_in_bounded_page_chunks(settings):
    app=create_app(settings)
    calls=[]
    def extract(data, **kwargs):
        with Image.open(BytesIO(data)) as image:
            assert image.width*image.height <= 6_100_000
        calls.append(1)
        return OCRResult(text="Game loops update state and render a frame.",engine="test-page-ocr")
    app.state.services.ocr.extract=extract
    writer=PdfWriter()
    for _ in range(120): writer.add_blank_page(width=300,height=400)
    output=BytesIO();writer.write(output)
    with TestClient(app) as client:
        headers=register(client)
        response=client.post("/v1/documents/upload",headers=headers,files={"file":("120-page-book.pdf",output.getvalue(),"application/pdf")})
        assert response.status_code==200, response.text
        document=response.json()
        assert document["status"]=="ready_partial"
        assert len(calls)==30
        for expected in (60,90,120):
            document=client.post(f"/v1/documents/{document['document_id']}/retry",headers=headers).json()
            assert len(calls)==expected
        assert document["status"]=="ready"
        assert len(calls)==120
        assert client.get(f"/v1/documents/{document['document_id']}/pages/120",headers=headers).json()["text"].startswith("Game loops")

def test_large_image_is_bounded_by_pixels_not_old_12mb_cap(settings,monkeypatch):
    configured=replace(settings,vision_url="https://vision.example/v1",vision_model="test-vision")
    monkeypatch.setattr(OCRService,"_mimo_extract",lambda *args,**kwargs:OCRResult(text="Large scan text",engine="test"))
    stream=BytesIO();Image.new("RGB",(100,100),"white").save(stream,format="PNG")
    data=stream.getvalue()+b"\0"*(13*1024*1024)
    assert OCRService(configured).extract(data).text=="Large scan text"

def test_illustration_urls_do_not_allow_arbitrary_network_proxy(settings):
    from adaptive_backend.illustrations import explain_illustration
    for url in ["http://127.0.0.1/secret","https://evil.example/image.png","https://upload.wikimedia.org@evil.example/image.png","https://upload.wikimedia.org/image.png?token=x"]:
        with pytest.raises(ValueError):explain_illustration(settings,url,"Cell biology")

def test_review_retains_choice_numeric_and_transcribed_answer_parts():
    from adaptive_backend.study_review import response_text
    assert response_text({"submission":{"parts":[{"modality":"choice","selected_option":0}]}})=="Option 1"
    assert response_text({"submission":{"parts":[{"modality":"numeric","numeric_value":0}]}})=="0"
    assert response_text({"submission":{"parts":[{"modality":"handwriting","text":"Reviewed text"}]}})=="Reviewed text"
