# Backend audit remediation — 12 October 2026

The nine confirmed findings from the original audit are addressed in this working tree. The additional concurrency, event-loop blocking, temporary-state retention, and migration risks received concrete improvements. This establishes a better-tested prototype; it does not establish production security, model accuracy, or educational effectiveness.

## Findings and repairs

| Finding | Implemented repair |
| --- | --- |
| F01: private subject grafting | Private subjects have explicit ownership. Course creation requires that owner. Concept access/mutation and teaching reject copied namespaces. Upload routing and approved graphs set ownership. Legacy ownership is backfilled from the original course rather than a subsequent copy. |
| F02: nonfinite semantic grades | Strict finite, numeric 0–1 grade/confidence contracts reject malformed values and abstain. Learner numeric inputs and evaluator outputs also reject nonfinite values. Infinite numeric tolerances cannot grant credit. |
| F03: string model approval | Assessment validation requires a real boolean, finite numeric confidence, and the confidence threshold. Strings such as `"false"` and numeric booleans cannot approve content. |
| F04: optional modalities | Seeded, generated, and fallback moves normalize missing modality lists to `[]`. The unchanged seeded binary-search practice path succeeds. |
| F05: interrupted turns | Evidence, calibration, proof, policy, and a pending turn commit together. Generation runs outside write transactions. Delivery, its frozen replay response, and the session pointer commit together afterwards. An interrupted delivery resumes its committed evidence once; changed answers cannot reuse a key. |
| F06: active privacy changes | Privacy is reread at mutation boundaries. Pausing stops learning/proof/policy/calibration writes, updates active shadows, redacts new stored requests, clears cached capsules and relayed context, and invalidates in-flight delivery snapshots. Resuming personalization permits subsequent evidence again. |
| F07: uncounted provider retries | Each gateway invocation sends one HTTP request. There are no hidden transport retries. Any new invocation must reserve another semantic-budget slot. |
| F08: completion race | Completion and turns share a per-session lock. Completion and temporary-state cleanup are transactional. Durable pending markers and session versions also guard independent service instances. A late state save cannot update a completed session. |
| F09: shared bank in closed-source classes | Course policy governs both question selection and fallback assessment generation. Missing permitted content is explicitly unavailable and ungraded. |

## Additional improvements

- Per-session locks replace the global turn lock, allowing another learner to proceed while a provider call is blocked. Locks are weakly retained to avoid an ever-growing session-lock map.
- SQLite helpers join enclosing transactions through savepoints. Failed evidence writes roll back their calibration and events together. Undelivered candidate assessments are discarded after delivery rollback or a competing committed response.
- Document extraction, package decompression and IR compilation, image OCR, voice turns, and compatibility MCP tool calls run in worker threads when invoked from async routes. The installed official MCP SDK already offloads synchronous tool handlers.
- Local-first shadow cleanup runs at startup and every 60 seconds, across owners, after 24 hours of inactivity. Completion cleans immediately. Cleanup checks current state under locks and does not expire a recently updated session.
- Schema v8 adds durable pending/replay/version fields and private-subject ownership. Upgrades are transactional and take SQLite-consistent pre-v8 backups. Tests cover v7 data preservation and injected upgrade failure rollback. Newer schemas are rejected by an older backend.
- Browser reloads can resume an authenticated pending turn without keeping raw answers in browser storage. A retry preserves its original payload/key in memory; rejected uncommitted inputs can be corrected. Registration uses the backend's ten-character password minimum.

## Verification

- Full backend suite: **182 passed**, including **38 new regression cases**, plus the existing Starlette/AnyIO deprecation warning. XML: `regression-results.xml`.
- The 38-case regression suite also passed after the final privacy/redaction refinements.
- Frontend: **7 contract tests passed**; TypeScript and Vite production build passed.
- Python compilation and `git diff --check` passed.

Tests use temporary databases and synthetic accounts. Providers are mocked. Concurrency coverage uses threads and two independent service objects against one SQLite database; restart recovery recreates services against the persisted database. These are meaningful persistence tests, but are not OS process-kill tests or a production distributed-worker benchmark.

From the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -q -o addopts=''
.\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_october_backend_regressions.py -q -o addopts=''
```

The original `reproduce.py` and `probe-results.xml` remain historical evidence. They deliberately assert old defective behavior and are not the current regression suite. The original audit report is preserved with a remediation notice.

## Practical limits and hackathon assessment

This moves OVAEL-X from a promising prototype with demonstrated correctness/privacy defects to a more credible technical entry. Its useful differentiators remain adaptive decisions, conservative assessment evidence, curriculum source governance, and recovery across web/MCP learning flows.

Winning prospects still depend on the actual hackathon rubric and competing teams. A defensible win percentage cannot be calculated from this repository. The next competitive gains should come from a concise live demonstration of one learner journey, reliable configured model/source behavior, and measured learner outcomes. Backend breadth alone does not prove user value.

Remaining limits include SQLite write serialization, no distributed spend/token cap, unbenchmarked real-provider grading, no live browser end-to-end rehearsal in this repair pass, no production stress/penetration tests, and unproven educational efficacy. Pause prevents new personalized evidence; it does not erase earlier history. Historical unauthorized disclosure or tampering cannot be reconstructed or undone automatically by an ownership fix. The large service modules still warrant further separation as the product grows.

These repairs are prepared for integration into the existing GitHub repository. No deployment or production-data repair was performed.
