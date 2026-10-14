from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from adaptive_backend.app import create_app


def _client(settings, tmp_path: Path):
    cfg = replace(
        settings,
        storage_dir=tmp_path / "uploads-audit",
        auth_secret="a" * 48,
        memory_mode="local_first",
    )
    app = create_app(cfg)
    return app, TestClient(app)


def _register(client: TestClient, username: str):
    r = client.post(
        "/v1/auth/register",
        json={"username": username, "password": "correct horse battery staple"},
    )
    assert r.status_code == 200, r.text
    return r.json(), {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_logout_revokes_session_after_access_cookie_expired(settings, tmp_path):
    _app, client = _client(settings, tmp_path)
    with client:
        _register(client, "auditlogout1")
        csrf = client.cookies.get("ovael_csrf")
        # The browser drops the access cookie once its max-age elapses.
        client.cookies.delete("ovael_session")
        out = client.post("/v1/auth/logout", headers={"X-CSRF-Token": csrf})
        assert out.status_code == 200, out.text
        assert out.json() == {"logged_out": True}
        # The long-lived refresh session must be dead, not merely unused.
        again = client.post("/v1/auth/refresh", headers={"X-CSRF-Token": csrf}, json={})
        assert again.status_code == 401


def test_logout_without_any_credentials_is_still_rejected(settings, tmp_path):
    _app, client = _client(settings, tmp_path)
    with client:
        assert client.post("/v1/auth/logout").status_code == 401
