# ovael-x v5 — Decision + AI / Adaptive Evidence Workbench

**Full-stack source release:** Python 3.11+ / FastAPI backend, React 18 + TypeScript + Vite frontend. This package is a research/development release, not a validated clinical, educational certification, or production enterprise platform.

## Start locally

From the unpacked folder, in separate terminals:

```bash
cd backend
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -c constraints-tested.txt -e '.[test]'
uvicorn adaptive_backend.app:create_app --factory --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The development proxy forwards `/v1` and `/health` to `127.0.0.1:8000`, preserving same-origin cookies and CSRF enforcement. Register, create a course/topic, attach source material, and start study or practice.

If the topic has no usable source and no model configured, OVAEL explicitly says **instruction unavailable**; it does not invent a lesson. For local OCR of handwritten photos, install Tesseract on your OS and `python -m pip install -e '.[ocr]'`. Vision-model/OCR service routes require explicit configuration. Speech recognition via the browser may use external vendor infrastructure.

## Architecture and guarantees

`Event → normalized AnswerSubmission → AssessmentEvidenceEngine → EvaluationResult → MemoryCurator (graded only) → DecisionKernel → TeachingMove → frontend`.

- Typed, MCQ, boolean, numeric, code, speech-transcribed, handwritten/OCR, visual-label and mixed-answer input interfaces are supported.
- The grading engine scores only when the answer and validated rubric can establish correctness. **Unverified, ambiguous, negated keyword claims, unvalidated diagrams, mixed answers missing required parts, and modalities with no reliable verifier abstain instead of inventing mastery.**
- Multi-part tasks can declare `required_modalities` and `answer_key.modality_criteria` for separate per-modality grading; it abstains when any mandatory part cannot be verified.
- Pure help/explanation requests are not incorrect assessment attempts. No learning/proof event is committed for answers with `score=None`.
- Per-learning-turn model calls share a root `SemanticBudget` with child limits for grading and generation. This is *per process/per request*, not a distributed cost or token ceiling. The image OCR endpoint also has its own one-call budget.
- A no-model explanation path returns a labelled source extract when available, or an explicit content-unavailable message. Neither is misrepresented as a generated lesson.
- Resumable frontend stores only the teaching session ID in sessionStorage, not authentication tokens or raw answers. Lost-response retries reuse the same idempotency key when the turn is unchanged.
- Evidence, calibration, proof and policy updates commit together with a pending turn. Next-move delivery and the session pointer commit together afterwards; failed delivery resumes without grading again. A key reused with a different answer is rejected. Browser reloads recover committed pending turns through the authenticated `/v1/learning/sessions/{id}/resume` endpoint; raw answers are not needed for recovery.
- Provider invocations send one HTTP request per reserved slot, without hidden retries. Budgets remain per request, including resumed requests; they are not a distributed spend cap.
- Personalization changes are checked at write boundaries. Paused answers still receive feedback, while learning/proof/policy/calibration updates stop and stored request payloads are redacted.
- Private runtime subjects have explicit owners. Closed-source courses cannot fall back to the shared question bank; unavailable permitted content is labelled.
- Temporary local-first shadows expire after 24 hours of inactivity. Startup and a 60-second background sweep handle absent owners; completion cleans immediately.

Database schema v8 upgrades run in one SQLite transaction. Existing pre-v8 teaching databases receive a `*.pre-v8-<id>.bak` snapshot using SQLite's backup API before upgrade; keep these backups private. To roll back, stop all application workers, preserve the current database and WAL/SHM files, restore the snapshot at the configured database path, and run the compatible prior backend. Restore tests cover the v7 upgrade snapshot and failed-upgrade rollback; production disaster recovery remains untested.

## Current capabilities versus limits

| Capability | Current state |
| --- | --- |
| Backend API/auth/courses/sessions | Implemented; regression tested |
| Decision kernel, mastery/proof state | Implemented; educational efficacy **unproven** |
| MCQ/boolean/numeric grading | Deterministic when a valid key is available |
| Code grading | Existing sandbox/test path; requires proper task spec |
| Free-text | Exact or limited explicit literal rubric; semantic model for ambiguous answers; conservative abstention |
| Mixed submissions | Mandatory parts enforced, individually evaluated when a valid per-modality rubric exists |
| Handwritten photos | OCR text extraction only, user-reviewed in frontend; no guaranteed handwriting-form recognition |
| Diagrams / charts / flowcharts | **No validated visual-topology scorer**; abstains |
| Spoken responses | Browser speech-to-text, not verified pronunciation or voice biometrics |
| New-course instruction | Model/source dependent; no fabricated generic teaching fallback |
| Institutional production | Not yet ready: SQLite, no LTI/SSO, no multi-worker budgets, no large-scale stress testing |

**Do not deploy for grading high-stakes examinations.** Not all semantic errors are detectable with the simple contradiction guard. A model-provided grade is not independently validated just because it returns high confidence. Teachers/reviewers must be able to override or independently verify important assessments.

## Tests

```bash
cd backend
pytest -q
python -m compileall -q src
```

```bash
cd frontend
npm install
npm run test:contracts
npm run build
```

The GitHub publication was checked on 11 October 2026 with **144 passing backend tests**, **7 passing frontend contract tests**, backend `compileall`, and a successful TypeScript + Vite production build. `backend/constraints-tested.txt` records the tested FastAPI/Starlette/MCP transport versions. Browser end-to-end tests and production deployment remain unverified.

## Engineering focus

My main focus in v5 was backend engineering: deterministic decisions, assessment evidence, learner-state updates, and bounded model calls. The React workbench makes those flows usable; frontend polish received less time.

## Source-only publication

This repository excludes databases, learner uploads, generated training data, secrets, installed dependencies, and local review backups. A normal startup creates its local data files. The optional `backend/scripts/run_backend_demo.py` generates a synthetic demo database locally instead of distributing a prebuilt account database. That demo is loopback-only, uses a known synthetic account for testing, and is separate from normal registration.

## Project layout

- `backend/src/adaptive_backend/assessment_evidence.py`: modality-aware, abstaining assessment engine
- `backend/src/adaptive_backend/decision.py`: deterministic learner routing
- `backend/src/adaptive_backend/semantic.py`: bounded model calls
- `backend/src/adaptive_backend/inference.py`: shared parent/child semantic usage ledger
- `backend/src/adaptive_backend/teaching.py`: session and evidence facade
- `backend/tests/test_v5_safety_contract.py`: adversarial grading and evidence tests
- `frontend/src/assessment.ts`: backend-compatible typed submission contract
- `frontend/src/api.ts`: CSRF-aware same-origin API client
- `frontend/src/App.tsx`: learner workbench, courses, study, answer forms, uploads, drawings, insights
- `frontend/tests/assessment.test.cjs`: seven frontend assessment contract tests
- `RELEASE_AUDIT.md`: verified release checks and known blockers

## Security and deployment note

Backend cookie auth uses HttpOnly session cookies and CSRF for writes. The browser should be accessed through the Vite proxy in development. Production requires a hardened HTTPS reverse proxy and a production secret/config review. Raw learner content is suppressed from persistent learning evidence in `local_first` mode; server-mode answer storage and third-party OCR/STT/model providers may handle sensitive data differently. Audit your configuration before uploading protected information.
