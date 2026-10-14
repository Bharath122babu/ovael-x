"""Outbound MCP tools. Connections are explicit and credentials are request-only."""
from __future__ import annotations

import asyncio
from urllib.parse import urlsplit
from typing import Any


def validate_endpoint(url: str, allowed_hosts: tuple[str, ...]) -> str:
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    if parsed.username or parsed.password or parsed.fragment or parsed.query:
        raise ValueError("Use a server URL without embedded credentials, query or fragment.")
    if host not in {item.lower() for item in allowed_hosts}:
        raise ValueError("This server is not enabled. Add its host to ADAPTIVE_MCP_ALLOWED_HOSTS on the backend.")
    if parsed.scheme != "https" and not (parsed.scheme == "http" and host in {"localhost", "127.0.0.1", "::1"}):
        raise ValueError("Remote servers must use HTTPS.")
    return url


async def query_server(url: str, token: str, allowed_hosts: tuple[str, ...], *, tool: str | None = None, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    """Discover via the official SDK; execute only explicitly read-only tools.

    Admin allowlisting prevents arbitrary URLs becoming a backend network proxy.
    No browser cookies, learner context or provider credentials are forwarded.
    """
    validate_endpoint(url, allowed_hosts)
    from mcp import Client
    from mcp.client.streamable_http import streamable_http_client
    import httpx2

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    denied = False
    oversized = False
    response: dict[str, Any] = {}
    async with asyncio.timeout(20):
        async with httpx2.AsyncClient(headers=headers, timeout=15, trust_env=False) as http:
            async with Client(streamable_http_client(url, http_client=http), read_timeout_seconds=15) as client:
                manifest = await client.list_tools()
                tools = manifest.tools[:100]
                if tool is None:
                    response = {"tools": [item.model_dump(by_alias=True, exclude_none=True) for item in tools]}
                else:
                    selected = next((item for item in tools if item.name == tool), None)
                    if not selected or not selected.annotations or selected.annotations.read_only_hint is not True:
                        denied = True
                    else:
                        result = await client.call_tool(tool, arguments or {})
                        text = "\n".join(item.text for item in result.content if item.type == "text")
                        oversized = len(text) > 100_000
                        response = {"text": text, "is_error": bool(result.is_error)}
    if denied:
        raise ValueError("Only tools marked read-only can be used here.")
    if oversized:
        raise ValueError("The tool returned too much text. Narrow your request.")
    return response
