# Learner interface correction — 14 October 2026

## Findings and changes

The supplied screenshots showed a learner interface dominated by implementation details. Twelve destinations, a repeated demo banner, decision explanations, backend state labels, and separate voice/OCR pages obscured the actual tasks. This review supersedes the earlier interface assessment in the [13 October integration review](../2026-10-13/frontend-integration.md); the earlier source provenance remains valid.

| Reported problem | Current implementation |
| --- | --- |
| Chat was a lesson form with a debug sidebar | One conversation, message history, composer, attachments, and explicit Ask/Answer mode. Actual typed assessment, reviewed transcripts, pending-turn recovery, and idempotency are preserved. |
| Too many destinations and technical explanations | Five primary destinations: Chat, Courses, Materials, Progress, Settings. Removed connected/refresh chrome, memory slogan, agent/decision rail destinations, and decision aside. Synthetic provenance remains a small Demo account label. |
| Material, OCR, and voice were fragmented | Materials accepts PDF, DOCX, PPTX, EPUB, text/Markdown, supported images, audio, and video. Chat attachments also accept image/drawing and recorded audio answers for review. |
| Failed extraction had no recovery | Owner-authorized retry reprocesses the original document and records a new job, preserving file and document identity. Failure remains an actionable setup/error state. |
| Selected material did not replace the active Calculus topic | A material/topic launch waits for scoped course concepts, completes the acknowledged prior session, and starts a real session in the selected course. Pending answers block switching. |
| Gaps, graph, evidence, and rewards over-explained architecture | Progress groups overview, practice suggestions, topic map, and skills. Gap details and Mermaid maps use optional disclosures. Internal budgets, IDs, and agent architecture are absent from normal learning. |
| MCP configuration did not reach the official transport | Standard `/mcp/` is proxied by Vite, `/mcp` redirects, and compatibility RPC lives at `/mcp-legacy`. Deployment host/origin configuration also configures SDK transport security. |
| OVAEL could only issue its own connection token | Settings → Integrations now discovers another Streamable HTTP server's tools and explicitly runs tools declared read-only through the official SDK. Text results can be imported as material. |
| External sessions could not continue in the frontend | `/app/continue/{token}` now redeems an authenticated handoff, restores the session, and resumes an acknowledged pending turn. |
| A replacement model provider could not be selected simply | OpenRouter teaching and vision environment aliases are supported. Explicit generic provider settings remain available. The demo stays offline unless started with `--live-models`. |

No full import of the friend's ZIP was performed. The existing deterministic assessment, memory, authentication, course ownership, and causal-gap contracts remain in use.

## Primary references

- [Official MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture): OVAEL acts as a host/client when connecting to an external server, and separately exposes its own server to other hosts.
- [Official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk): used for both actual Streamable HTTP server and client negotiation, discovery, and calls; local installed SDK APIs were inspected and exercised.
- [LibreChat input implementation](https://github.com/LibreChat-AI/LibreChat/blob/main/client/src/components/Chat/Input/ChatForm.tsx): reference for a consolidated composer and attachments. OVAEL retains its own assessed-answer contract rather than copying a generic chat backend.
- [Open WebUI](https://github.com/open-webui/open-webui) and [LobeHub](https://github.com/lobehub/lobehub): reference repositories inspected for conversational navigation and integration patterns.
- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart): OpenAI-compatible endpoint and bearer authentication. No provider key was supplied or tested live for this change.

## Verification

- Production frontend build and TypeScript compilation pass. Main script: about 452 kB / 140 kB gzip. Optional Mermaid/ELK chunks still produce Vite size warnings; they load on diagram demand.
- Seventeen frontend contract tests pass, including answer completeness, account boundaries, pending-turn retry/idempotency, diagram safety, rewards, and retained projections.
- Full backend run: 201 passed, one failure caused by an old compatibility test targeting the now-canonical MCP URL. The test was updated to the explicit legacy endpoint. All 55 tests across the affected release/regression/redesign files then passed. The four redesign tests passed again after adding the real HTTP bridge check. A single fresh full-suite green run has not been claimed.
- New regression coverage uses a real local HTTP SDK server: protocol initialization, tools discovery/call, revocation, denial of undeclared/non-read-only tools, the authenticated outgoing bridge, host validation, document failure/retry/ownership, and a mocked OpenRouter vision request.
- A fifth redesign regression covers optional bearer credentials on protected speech adapters and sanitized provider failures. The final targeted run across redesign, frontend integration, and product system tests passed all 34 cases after that change.
- After restarting the demo, runtime checks through frontend port 5173 passed: HTTP 200, cookie sign-in, authenticated courses/materials/session reads, MCP canonical redirect and initialization, and denial of an unallowlisted external host. Existing Bharat activity was preserved.
- Browser inspection remains incomplete. The in-app tabs are stuck on internal connection-error pages; the browser access check rejects their data URL. The user was asked to reopen the normal preview. No security bypass or alternate browser automation was used. Earlier screenshots must not be treated as proof of this redesign.

## Runtime setup and limits

The running demo is deliberately offline. Current health reports teaching, OCR, speech-to-text, and media extraction unconfigured. There is no valid new model key. FFmpeg and Tesseract were not found on PATH during this review. Unified upload and retry are connected, but actual image/audio/video extraction requires the corresponding runtime or provider. Use Settings → Services and the backend README for configuration.

For OpenRouter, set `OPENROUTER_API_KEY` and an explicit `OPENROUTER_MODEL`; optionally select `OPENROUTER_VISION_MODEL`, then run the demo with `--live-models`. Keep credentials on the backend. For speech, configure `ADAPTIVE_STT_URL`/`ADAPTIVE_STT_MODEL` and, if required, `ADAPTIVE_STT_API_KEY`, or local whisper.cpp; put FFmpeg on PATH for material media. Generic synthesis likewise supports an optional `ADAPTIVE_TTS_API_KEY`. These keys are never returned to the frontend. A health configuration flag does not establish provider authentication success.

External MCP requires an actual server URL, its exact host enabled in `ADAPTIVE_MCP_ALLOWED_HOSTS`, and a credential if that server requires one. The first flow supports Streamable HTTP, bearer credentials, server-declared read-only tools, explicit user calls, and text results. Read-only hints are not a security guarantee. OAuth, stdio, persisted external credentials, and autonomous model calls are outside this implementation. No third-party MCP endpoint or credential was supplied, so interoperability was tested against OVAEL's real SDK server rather than a claimed live third-party connection.

The changes are local in the existing OVAEL-X repository. A build/test pass is not a usability review or a claim that every runtime service is configured.
