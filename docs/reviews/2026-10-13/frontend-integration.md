# OVAEL frontend integration review — 13 October 2026

## Decision

The supplied OVAEL v0.01 frontend is worth using as a visual and layout reference. Its warm-white editorial style, course library, materials view, and forensic case layout are clearer than the previous workbench. Its old teaching, authentication, voice, agent, and state contracts needed replacement to work with this backend. This change adapts those surfaces rather than importing the old backend.

Reference: [Intense-Hacker/OVAEL_v0.01](https://github.com/Intense-Hacker/OVAEL_v0.01), commit `d2fbb571ca82517aabc0c437fffc4c697d585617`. The correct reference ran separately on port 3002. The earlier OVAEL_intro preview was a different project and is excluded from the comparison below. No LICENSE file was found in the reference checkout; provenance is recorded here for attribution and future distribution review.

The friend competition ZIP is not a complete upgrade worth replacing this project with. Its frontend failed its production build with TS2741/TS2322 prop errors. Its PostgreSQL path was not verified against a live PostgreSQL service, and the separate AI-literacy router duplicated the existing assessment infrastructure. Only eight English AI-judgment questions were curated into the existing private subject/question pipeline. Their zero-based answer keys are verified through a real teaching transaction. The exercise content still needs teacher review before classroom use. PostgreSQL, the extra router, and the pilot script were not imported.

## What changed

- OVAEL branding throughout the product; a warm-white responsive workspace with courses, Learn/Chat, materials, graph, learning evidence, causal forensics, history/rewards, voice transcription, decision inspection, connections, and privacy settings.
- One shared teaching controller keeps the active lesson, choice, draft, and retry buffer alive during navigation. Submission and help requests use explicit backend intents. Typed numeric, boolean, MCQ, code, and reviewed image/audio inputs follow the existing assessment contract.
- Cookie authentication, CSRF protection, and a single refresh request for concurrent expired sessions. Retried mutations keep their original payload and idempotency key. Authentication errors and unavailable services remain visible.
- Mermaid renders real causal graphs and fenced teaching content. Internal diagram IDs are separate from backend identifiers; labels are escaped, configuration overrides are rejected, and returned SVG is sanitized. The render staging area participates in layout, fixing the zero-size graph bug found in the browser.
- Forensics uses the active owned local-first evidence when available and coordinates with personalization pause/deletion. Stored focus allocations are recomputed for the requested subject view; immutable diagnostic revisions remain intact. Cause support is labelled heuristic, and abstention remains visible.
- Actual case, target, session, and decision identifiers appear in inspection details. The agents page reflects DecisionKernel, MemoryCurator, IRIS, and the bounded semantic coprocessor.
- Topic creation requires ownership of the underlying custom subject. A course owner can no longer add global topics to the shared built-in catalog. The frontend explains how to create a custom subject instead.
- Memory storage mode comes from the backend. Account changes clear scoped UI data; local deltas and session references use per-user keys. A missing old lesson does not permanently lock the learner into recovery.
- Rewards are a transparent activity calculation over saved backend history, with empty/active/duplicate sessions excluded. They are engagement points, not mastery estimates or redeemable rewards.
- The synthetic demo uses a separate runtime database, five seeded courses, two indexed generated notes, four seeded completed teaching sessions, proof dimensions, and retained independent diagnostic observations. Failed seeds stay in staging; existing unrecognized databases are refused. Rerunning preserves recognized demo edits. The browser check added a sixth course named “Synthetic UI flow check” and a private “Source verification” topic.

## Verification and flow health

| Step | Evidence | Health |
| --- | --- | --- |
| Authenticated populated workspace | Correct reference styling, synthetic banner, scoped API data | Pass |
| Verified practice | Disclosure MCQ submitted and evaluated by the existing backend; saved turn count updated | Pass |
| Navigation continuity | Checked MCQ and text draft survived switching Learn to Chat | Pass |
| Completion and history | Completion acknowledged before clearing the lesson; activity loaded from backend history | Pass |
| Gap report and diagram | Supported recursive-base-case diagnosis, abstained cases, readable SVG, backend case/target IDs | Pass |
| Focused repair | Opened Data Structures & Algorithms / Recursive Base Cases | Pass |
| Material handoff | Binary-search notes opened their own course and focus concept | Pass |
| Teaching diagram | Explicit source-excerpt fallback rendered the note’s Mermaid flowchart; help remained separate from grading | Pass |
| Evidence | Acquisition/independent/transfer/retention indices loaded; absence of evidence shown explicitly | Pass |
| Custom course/topic | Created owned subject and topic through the UI; backend rejects shared-catalog mutation | Pass |
| Phone layout | 390 × 844 viewport; learning/evidence views had no document-level horizontal overflow | Pass |
| Phone keyboard navigation | Opening focused the close button, background became inert, Escape closed it and restored focus | Pass |
| Decision inspection | Controller contract and latest reason/tier/budget loaded; architecture SVG rendered | Pass |
| Live model generation | Previously configured provider returned HTTP 401; isolated demo runs offline | Needs provider configuration |
| OCR / speech | Unconfigured controls disabled; mocked transcription validates limits, sanitized errors, and review-only behavior | Adapter contract tested; live provider unverified |
| Teacher UI / external connections | Adapted contracts and async guards reviewed; backend coverage retained | Not manually exercised end to end in this browser run |

Automated validation: **198 backend tests passed**, **17 frontend contract tests passed**, TypeScript/Vite production build passed, and npm audit reported **0 vulnerabilities** after the Mermaid update. The backend emits an existing Starlette/AnyIO deprecation warning. Mermaid loads lazily, but the production build still warns about large optional diagram chunks; this remains a performance optimization opportunity.

Relevant new regressions cover local-first forensic ownership, pause coordination, actual memory mode, transcription without automatic grading, upload limits/provider-error sanitization, seed refusal/idempotence/real MCQ grading, shared catalog protection, scope-specific focus allocations without ledger mutation, immutable turn retries, cookie-refresh races, projection size limits, and safe diagram labels/configuration.

Current-run screenshots:

- [Integrated workspace](09-integrated-learning.png)
- [Materials](10-integrated-materials.png)
- [Verified practice](12-integrated-practice.png) — captured before the final feedback-label refinement to “Correct answer”.
- [Readable causal Mermaid graph and case identity](13-forensics-mermaid-verified.png)
- [Teaching answer with Mermaid and source citation](14-teaching-mermaid-source.png)
- [Phone learning view](15-mobile-learning.png)
- [Loaded phone evidence](17-mobile-evidence-loaded.png)
- [Saved activity and rewards](18-rewards-history.png)
- [Latest decision inspection](19-decision-inspection.png)
- [Final learner home](20-final-learning-workspace.png)

Earlier before/reference screenshots remain for context. Screenshot 11 captured the diagram sizing defect before its final repair; screenshot 16 shows the navigation drawer, not loaded evidence. Neither is used as proof of the final result.

## Running and readiness

Use `backend/.venv/Scripts/python.exe backend/scripts/run_frontend_demo.py` from the repository root, or the two-terminal instructions in the README. Run the frontend on port 5173. The synthetic credentials are `Bharat` / `OVAEL-demo-2026!`; the seeded account is restricted to this loopback demo database. Port 3002 is the old reference, not the integrated application.

The integrated frontend is usable for a truthful offline demonstration of verified practice, course/material handling, evidence, causal diagnostics, and Mermaid output. The demo deliberately disables model/speech providers unless `--live-models` is supplied. Configured does not mean provider access or output quality has been verified. Live generation, OCR, speech, deployment, and a complete teacher/classroom walkthrough require separate operational validation before claiming production or hackathon readiness. Synthetic examples do not demonstrate real learning efficacy, diagnostic calibration, or a probability of winning.

Changes are local in the existing ovael-x repository. No new GitHub repository, post, or issue was created.
