# OVAEL-X backend

The FastAPI backend for OVAEL-X (package `ovael-backend`, version 5.0.0). It contains the decision kernel, assessment engine, learner model, knowledge pipeline, authentication, and the MCP integration.

For the architecture, diagrams, and design principles, see the [project README](../README.md). For release verification and known limits, see [`RELEASE_AUDIT.md`](../RELEASE_AUDIT.md). For the decision-first design rationale, see [`ARCHITECTURE_DECISION_AI.md`](ARCHITECTURE_DECISION_AI.md).

## Install and run

Requires Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -c constraints-tested.txt -e '.[test]'
uvicorn adaptive_backend.app:create_app --factory --host 127.0.0.1 --port 8000
```

Optional extras:

| Extra | Installs | Purpose |
| --- | --- | --- |
| `ocr` | `pytesseract` | Local OCR. The Tesseract program must also be installed on the system. |
| `local-model` | `torch`, `transformers` | Offline model training utilities (`training.py`) |
| `test` | `pytest` | Test suite |

Audio and video material also need `ffmpeg` and `ffprobe` on the `PATH`.

`constraints-tested.txt` pins the FastAPI, Starlette, MCP, and SSE versions used for the published checks.

## Test

```bash
pytest -q
python -m compileall -q src scripts
```

## Demo

`scripts/run_backend_demo.py` generates a synthetic demo database in `runtime/` and starts the backend on `127.0.0.1:8000`, using a random per-run signing secret. `scripts/ovael_demo.py --seed` creates the synthetic data, and `--benchmark` runs a scripted check of the main flows. Both are for local testing only.

## Configuration reference

All settings are read from environment variables by `Settings.from_env` in `src/adaptive_backend/config.py`. Invalid values are rejected at start-up. Boolean variables accept `1`, `true`, `yes`, or `on`.

### Storage and limits

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADAPTIVE_DB_PATH` | `./data/adaptive_learning.db` | SQLite database file |
| `OVAEL_STORAGE_DIR` | `./data/uploads` | Uploaded material |
| `OVAEL_MAX_UPLOAD_BYTES` | `104857600` (100 MiB) | Largest accepted upload; minimum 1 MiB |
| `OVAEL_MAX_DOCUMENT_PAGES` | `4000` | Page, slide, or section limit per document (1 to 20000) |
| `OVAEL_MAX_EXTRACTED_CHARS` | `20000000` | Extracted-text limit per document |
| `ADAPTIVE_MEMORY_COMPACTION_SESSION_THRESHOLD` | `40` | Completed sessions before history is compacted (minimum 10) |
| `ADAPTIVE_SEED_DEMO_DOMAINS` | `true` | Seed the built-in subjects at start-up |

### Privacy, authentication, and access

| Variable | Default | Purpose |
| --- | --- | --- |
| `OVAEL_MEMORY_MODE` | `local_first` | `local_first` (temporary per-session learner state) or `server` (persistent) |
| `OVAEL_AUTH_REQUIRED` | `false` | When `true`, start-up requires `OVAEL_AUTH_SECRET` of at least 32 characters |
| `OVAEL_AUTH_SECRET` | random per process | Token signing secret. If unset, sessions end when the process restarts. |
| `OVAEL_ACCESS_TOKEN_MINUTES` | `60` | Access-token lifetime (minimum 5) |
| `OVAEL_SESSION_DAYS` | `14` | Refresh-session lifetime |
| `OVAEL_COOKIE_SECURE` | `false` | Mark cookies `Secure`; set to `true` behind HTTPS |
| `OVAEL_TRUSTED_HOSTS` | `localhost,127.0.0.1,::1,testserver` | Accepted `Host` headers |
| `OVAEL_ALLOWED_ORIGINS` | none | CORS allow-list; not needed when the frontend is served from the same origin |
| `OVAEL_PUBLIC_BASE_URL` | `http://localhost:8000` | Base URL used in MCP connection and hand-off links |
| `OVAEL_MCP_CONTEXT_TTL_SECONDS` | `900` | Lifetime of the MCP context capsule (minimum 60) |
| `OVAEL_ALLOW_TEACHER_SELF_REGISTRATION` | `false` | Allow teacher accounts without an invite |
| `OVAEL_TEACHER_INVITE_CODE` | unset | Invite code for teacher registration (at least 16 characters) |
| `ADAPTIVE_API_KEY` | unset | Bearer key for the legacy (non-`/v1`) API (at least 16 characters) |
| `ADAPTIVE_ADMIN_API_KEY` | unset | Bearer key for legacy curriculum mutation (at least 16 characters) |
| `ADAPTIVE_ALLOW_REMOTE_WITHOUT_API_KEY` | `false` | Allow non-loopback legacy API access without a key |
| `ADAPTIVE_DEBUG` | `false` | Development only: disables the legacy access checks and allows teacher self-registration |

### Language models

| Variable | Default | Purpose |
| --- | --- | --- |
| `OVAEL_MIMO_BASE_URL` | `https://token-plan-sgp.xiaomimimo.com/v1` | Default OpenAI-compatible provider endpoint |
| `OVAEL_MIMO_MODEL` | `mimo-v2.5` | Default provider model |
| `OVAEL_MIMO_API_KEY` | unset | Provider key. The default provider stays inactive until this is set. |
| `ADAPTIVE_TUTOR_URL`, `ADAPTIVE_TUTOR_MODEL`, `ADAPTIVE_TUTOR_API_KEY` | unset | Alternative OpenAI-compatible endpoint |
| `ADAPTIVE_LOCAL_MODEL_URL`, `ADAPTIVE_LOCAL_MODEL_API_KEY` | unset | Local model endpoint; preferred for bounded calls when set |
| `ADAPTIVE_LOCAL_MODEL_NAME` | `Qwen3-1.7B` | Local model name |
| `ADAPTIVE_SUPERVISOR_URL`, `ADAPTIVE_SUPERVISOR_MODEL`, `ADAPTIVE_SUPERVISOR_API_KEY` | unset | Separate model for validation and planning calls |
| `ADAPTIVE_REQUEST_TIMEOUT_SECONDS` | `90` | Timeout for provider and adapter requests |

The learner demo is offline by default. To use OpenRouter, set `OPENROUTER_API_KEY` and an explicit `OPENROUTER_MODEL` on the backend, then start `scripts/run_frontend_demo.py --live-models`. `OPENROUTER_VISION_MODEL` optionally selects a vision-capable model for image text extraction. Explicit `ADAPTIVE_TUTOR_*` and `ADAPTIVE_VISION_*` values override the aliases; generic vision uses `ADAPTIVE_VISION_URL`, `ADAPTIVE_VISION_MODEL`, and `ADAPTIVE_VISION_API_KEY`. Provider credentials belong on the backend, never in a `VITE_*` variable or browser storage. A configured flag is not proof that a key or model is valid; verify a live request after setup.

### MCP server and client

The official SDK's Streamable HTTP endpoint is `/mcp/`; `/mcp` redirects to it. `/mcp-legacy` is the separate limited compatibility RPC endpoint. The frontend dev proxy forwards `/mcp`, including subpaths, to the backend. For the local learner demo, `OVAEL_PUBLIC_BASE_URL` defaults to `http://127.0.0.1:5173`, so generated connection URLs and conversation handoffs use the frontend origin. In production set it to the externally reachable origin, proxy `/mcp/` to the backend, and configure `OVAEL_TRUSTED_HOSTS` and `OVAEL_ALLOWED_ORIGINS` for that deployment.

The learner can discover and call another server through Settings → Integrations and `POST /v1/connections/servers/query`. Configure `ADAPTIVE_MCP_ALLOWED_HOSTS` as a comma-separated list of exact permitted hostnames. Remote servers require HTTPS; explicitly allowed loopback hosts may use HTTP. The client uses the official SDK, optional request-only bearer credentials, explicit calls to tools with `readOnlyHint: true`, and bounded text output. Server annotations are advisory. OAuth, stdio, persistent external credentials, and automatic model tool execution are not implemented by this UI.

### Deep research

| Variable | Default | Purpose |
| --- | --- | --- |
| `OVAEL_RLM_ENABLED` | `true` | Enable the bounded deep-research path |
| `OVAEL_RLM_MAX_DEPTH` | `1` | Planning depth (0 to 2) |
| `OVAEL_RLM_MAX_CALLS` | `4` | Call ceiling for stand-alone research outside a learner turn (1 to 12) |
| `OVAEL_RLM_CONTEXT_CHARS` | `14000` | Context size for research synthesis (2000 to 100000) |

### Adaptivity

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADAPTIVE_TARGET_SUCCESS` | `0.65` | Target probability of a correct answer (0.50 to 0.85) |
| `ADAPTIVE_MICRO_STAGE_SIZE` | `3` | Observations per difficulty micro-stage |
| `ADAPTIVE_MAX_DIFFICULTY_STEP` | `0.08` | Largest difficulty change per update (0.01 to 0.50) |

### Code execution

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADAPTIVE_EXTERNAL_SANDBOX_URL` | unset | External sandbox for running code answers; recommended for any shared deployment |
| `ADAPTIVE_ALLOW_LOCAL_CODE_EXECUTION` | `false` | Development only: run code in a resource-limited local process. This is not a complete security boundary. |

### Speech and media

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADAPTIVE_WHISPER_CPP_BIN`, `ADAPTIVE_WHISPER_CPP_MODEL` | unset | Local whisper.cpp speech-to-text |
| `ADAPTIVE_STT_URL`, `ADAPTIVE_STT_MODEL` | unset | OpenAI-compatible speech-to-text endpoint |
| `ADAPTIVE_STT_API_KEY` | unset | Optional bearer credential for the configured transcription endpoint |
| `ADAPTIVE_TTS_URL`, `ADAPTIVE_TTS_MODEL` | unset | Text-to-speech endpoint |
| `ADAPTIVE_TTS_API_KEY` | unset | Optional bearer credential for the configured synthesis endpoint |
| `OVAEL_VOICE_MAX_CALL_MINUTES` | `90` | Maximum voice-call duration (5 to 240) |

FFmpeg must be on PATH for audio/video material extraction. Image text extraction requires local Tesseract or a configured vision provider; recorded answers and media transcription require a configured speech adapter. These are runtime dependencies, not frontend capabilities that can be enabled by showing a button. Materials accepts documents, images, audio, and video in one upload flow, and failed extraction can be retried with `POST /v1/documents/{document_id}/retry` after setup is corrected. The retry preserves the original file and document ID and enforces ownership.

The learner UI accepts material up to 50 MB. Scanned PDFs render one bounded page at a time and attempt up to 30 new pages per pass. Successful page text is reused by subsequent retries; `ready_partial` documents expose a continuation control and available/total page counts. Speech answer clips retain their separate 25 MB service limit. PDF rendering uses pypdfium2 under a process-wide lock; OCR still requires a working text-recognition engine. The local adapter is not a background production worker queue.

`GET /v1/learning/sessions/{id}/review` returns an owner-scoped activity receipt; `POST` to that path optionally requests one bounded model summary. Neither operation creates learning evidence. `PATCH /v1/profile/study-preferences` stores format, pacing, and plain-language preferences for future explanations. Public illustration search and explicit vision explanation use `/v1/learning/illustrations` and `/v1/learning/illustrations/explain`; upstream availability is independent of endpoint implementation.
