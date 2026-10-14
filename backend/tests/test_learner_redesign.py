import asyncio
from contextlib import contextmanager
from dataclasses import replace
from io import BytesIO
import socket
from threading import Thread
import time

from fastapi.testclient import TestClient
from PIL import Image
import pytest
import uvicorn

from adaptive_backend.app import create_app
from adaptive_backend.mcp_client import query_server, validate_endpoint
from adaptive_backend.schemas import OCRResult


@contextmanager
def live_app(app):
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="error"))
    thread = Thread(target=lambda: server.run(sockets=[sock]), daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    try:
        while not server.started:
            assert thread.is_alive() and time.monotonic() < deadline
            time.sleep(.01)
        yield f"http://127.0.0.1:{port}"
    finally:
        server.should_exit = True
        thread.join(10)
        sock.close()


def auth(client, name="redesign-user"):
    response = client.post("/v1/auth/register", json={"username": name, "password": "redesign-password-2026"})
    assert response.status_code == 200, response.text
    body = response.json()
    return body["user_id"], {"Authorization": "Bearer " + body["access_token"]}


def test_real_http_mcp_discovery_call_and_revocation(settings):
    from mcp import Client
    from mcp.client.streamable_http import streamable_http_client
    import httpx2
    app = create_app(replace(settings, debug=False, auth_required=True, auth_secret="s" * 48, mcp_allowed_hosts=("127.0.0.1",)))
    import httpx
    with live_app(app) as base, httpx.Client(base_url=base) as web:
        uid, headers = auth(web)
        issued = web.post("/v1/connections/mcp", json={"client_name": "Wire integration test"}, headers=headers).json()
        token = issued["access_token"]
        web.post("/v1/mcp/context-relay", json={"capsule": {"concept_states": [{"concept_id": "binary_search", "status": "developing"}]}}, headers=headers)
        async def exercise():
            # Legacy mode explicitly exercises initialize + initialized;
            # auto mode exercises current SDK negotiation.
            async with httpx2.AsyncClient(headers={"Authorization": "Bearer " + token}) as http:
                async with Client(streamable_http_client(base + "/mcp/", http_client=http), mode="legacy") as client:
                    listed = await client.list_tools()
                    assert "get_learning_map" in {tool.name for tool in listed.tools}
                    result = await client.call_tool("get_learning_map", {})
                    assert result.is_error is False
            found = await query_server(base + "/mcp/", token, ("127.0.0.1",))
            assert any(tool["name"] == "get_learning_map" for tool in found["tools"])
            result = await query_server(base + "/mcp/", token, ("127.0.0.1",), tool="get_learning_map")
            assert result["is_error"] is False
            with pytest.raises(ValueError, match="read-only"):
                await query_server(base + "/mcp/", token, ("127.0.0.1",), tool="begin_teaching_session")
            web.delete("/v1/connections/mcp/" + issued["connection_id"], headers=headers)
            denied = await query_server(base + "/mcp/", token, ("127.0.0.1",), tool="get_learning_map")
            assert denied["is_error"] is True
        reachable = web.post("/v1/connections/servers/query", headers=headers, json={"url": base + "/mcp/", "token": token})
        assert reachable.status_code == 200, reachable.text
        assert any(tool["name"] == "get_learning_map" for tool in reachable.json()["tools"])
        redirected = web.post("/mcp", follow_redirects=False, json={})
        assert redirected.status_code == 307
        assert redirected.headers["location"] == "/mcp/"
        asyncio.run(exercise())

def test_outbound_server_validation_and_authentication(settings):
    for url in ["https://unknown.example/mcp", "http://example.com/mcp", "https://user:secret@example.com/mcp", "https://example.com/mcp?key=secret"]:
        with pytest.raises(ValueError):
            validate_endpoint(url, ("example.com",))
    assert validate_endpoint("https://example.com/mcp/", ("example.com",))
    app = create_app(replace(settings, debug=False, auth_required=True, auth_secret="s" * 48))
    with TestClient(app) as client:
        assert client.post("/v1/connections/servers/query", json={"url": "https://example.com/mcp"}).status_code == 401
        _, headers = auth(client)
        rejected = client.post("/v1/connections/servers/query", json={"url": "https://example.com/mcp"}, headers=headers)
        assert rejected.status_code == 400


def test_failed_material_can_be_reprocessed_without_uploading_again(settings):
    app = create_app(settings)
    with TestClient(app) as client:
        uid, headers = auth(client)
        data = BytesIO()
        Image.new("RGB", (10, 10), "white").save(data, format="PNG")
        def unavailable(*args, **kwargs):
            raise RuntimeError("image service unavailable")
        app.state.services.ocr.extract = unavailable
        response = client.post("/v1/documents/upload?auto_route=true", files={"file": ("search-notes.png", data.getvalue(), "image/png")}, headers=headers)
        assert response.status_code == 200
        doc = response.json()
        assert doc["status"] == "failed_retryable"
        app.state.services.ocr.extract = lambda *args, **kwargs: OCRResult(text="Binary search repeatedly halves a sorted search space. Compare the midpoint with the target.", engine="test-ocr")
        retried = client.post(f"/v1/documents/{doc['document_id']}/retry", headers=headers)
        assert retried.status_code == 200, retried.text
        assert retried.json()["status"] == "ready"
        assert retried.json()["document_id"] == doc["document_id"]
        assert app.state.services.documents.page(uid, doc["document_id"], 1)["text"].startswith("Binary search")
        _, other = auth(client, "other-redesign-user")
        assert client.post(f"/v1/documents/{doc['document_id']}/retry", headers=other).status_code == 404


def test_openrouter_configuration_and_image_request(settings, monkeypatch):
    from adaptive_backend.config import Settings
    from adaptive_backend.ocr import OCRService
    import httpx
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-only-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "test/chat-model")
    monkeypatch.setenv("OPENROUTER_VISION_MODEL", "test/vision-model")
    for name in ["ADAPTIVE_TUTOR_URL", "ADAPTIVE_TUTOR_MODEL", "ADAPTIVE_TUTOR_API_KEY", "ADAPTIVE_VISION_URL", "ADAPTIVE_VISION_MODEL", "ADAPTIVE_VISION_API_KEY"]:
        monkeypatch.delenv(name, raising=False)
    configured = Settings.from_env()
    assert configured.tutor_url == "https://openrouter.ai/api/v1"
    assert configured.tutor_model == "test/chat-model"
    assert configured.vision_model == "test/vision-model"
    captured = {}
    def post(self, url, **kwargs):
        captured.update(url=url, **kwargs)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Visible text"}}]}, request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx.Client, "post", post)
    result = OCRService(configured)._mimo_extract(Image.new("RGB", (10, 10)))
    assert result.text == "Visible text"
    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-only-key"
    assert captured["json"]["model"] == "test/vision-model"
    assert "max_tokens" in captured["json"]


def test_protected_speech_adapters_send_backend_only_credentials(settings, monkeypatch):
    from dataclasses import replace
    from adaptive_backend.speech import SpeechService
    import httpx
    configured = replace(settings, stt_url="https://speech.example/transcriptions", stt_model="test-asr", stt_api_key="test-asr-key", tts_url="https://speech.example/speech", tts_api_key="test-tts-key", whisper_cpp_bin=None, whisper_cpp_model=None)
    calls = []
    def post(self, url, **kwargs):
        calls.append((url, kwargs))
        if url.endswith("transcriptions"):
            return httpx.Response(200, json={"text": "My reviewed answer", "language": "en"}, request=httpx.Request("POST", url))
        return httpx.Response(200, content=b"test-speech", request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx.Client, "post", post)
    service = SpeechService(configured)
    assert service.transcribe(b"test-audio", "answer.wav").text == "My reviewed answer"
    assert service.synthesize("Read this answer") == b"test-speech"
    assert calls[0][1]["headers"] == {"Authorization": "Bearer test-asr-key"}
    assert calls[0][1]["data"]["model"] == "test-asr"
    assert calls[1][1]["headers"] == {"Authorization": "Bearer test-tts-key"}
    def unavailable(self, url, **kwargs):
        raise httpx.ConnectError("provider detail test-asr-key", request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx.Client, "post", unavailable)
    with pytest.raises(RuntimeError) as error:
        service.transcribe(b"test-audio", "answer.wav")
    assert "test-asr-key" not in str(error.value)
