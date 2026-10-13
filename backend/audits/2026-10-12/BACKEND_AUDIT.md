# OVAEL-X backend audit — 12 October 2026

**Historical findings below describe the original audited checkout.** Remediation is documented in [REMEDIATION.md](REMEDIATION.md). The original reproduction script and probe XML are retained as evidence; normal regressions now assert safe behavior in `backend/tests/test_october_backend_regressions.py`.

Audited checkout: `4ff7874`. Scope: backend source, API authorization, learner-state persistence, assessment integrity, AI budgets, concurrent operations, source governance, document processing, and test coverage. Application source was not changed.

**Assessment: useful engineering foundations, but the confirmed tenant-isolation, grading, privacy, and transaction defects should be fixed before a multi-user pilot.** The existing 144-test backend suite passed during the preceding project inspection. Eleven additional audit probes reproduce nine distinct findings below. Passing audit probes means the defects were reproduced; it does not mean the backend is safe.

## Confirmed findings

P1 means high-priority correctness/security/privacy work. P2 means significant reliability, policy, or cost-control work. Ordering favors tenant isolation and assessment integrity.

| ID | Priority | Angle | Finding |
| --- | --- | --- | --- |
| F01 | P1 | Authorization | Another account can attach a private subject and mutate its concept catalog |
| F02 | P1 | Assessment integrity | Nonfinite model grades become full credit and full confidence |
| F03 | P1 | AI validation | A string `"false"` is accepted as model approval |
| F04 | P1 | Runtime correctness | Seeded practice can fail because required modalities become `None` |
| F05 | P1 | Persistence/recovery | A learning turn is not atomically committed with its evidence and resumable state |
| F06 | P1 | Privacy | Mid-session personalization pause does not stop proof persistence |
| F07 | P2 | AI cost boundaries | Provider retries bypass the stated invocation ceiling |
| F08 | P2 | Concurrency/privacy | Completion races a turn and restores scrubbed state |
| F09 | P2 | Curriculum governance | Closed-source classes still select the global assessment bank |

### F01 — Authorize access to private subjects before creating a course

[api_v1.py:463](../../src/adaptive_backend/api_v1.py#L463), [api_v1.py:604](../../src/adaptive_backend/api_v1.py#L604), [api_v1.py:615](../../src/adaptive_backend/api_v1.py#L615)

`create_course` accepts any existing `subject_id`, checking existence but not access. A second user who knows a private `USR:` subject ID can create their own course referencing it. The concept-list endpoint then returns that subject's catalog, and the concept-create endpoint lets them add topics to it because they own the newly created course.

Reproduced with two authenticated accounts: the subject was initially hidden from the second user's subject list; course creation exposed the confidential topic and allowed an injected topic visible in the original course. Knowledge-document content was not shown to leak in this probe. Knowledge of the private subject ID is required; a formerly enrolled learner could already possess it.

**Fix:** enforce subject access on course creation, prevent independently owned courses from sharing private namespaces without an explicit policy, and authorize catalog mutation against subject ownership rather than only course ownership.

### F02 — Reject nonfinite/out-of-range model grades before clamping

[semantic.py:272](../../src/adaptive_backend/semantic.py#L272)

`float("NaN")` is accepted and passed through `max(0.0, min(1.0, value))`. With this operand order, NaN becomes `1.0`. The same problem affects confidence. The assessment engine therefore returns `graded`, score `1.0`, confidence `1.0` for an incorrect answer when a mocked provider returns `{"score":"NaN","confidence":"NaN"}`. Infinity and values above the allowed range are also clamped instead of rejected.

This requires malformed provider output; the probe does not establish that a learner can directly force such output. The damage occurs at a trust boundary and can feed mastery updates through the ordinary graded-answer path.

**Fix:** validate a strict response schema, reject booleans/nonfinite numbers, require both fields in `[0,1]`, and abstain on violations.

### F03 — Parse assessment approval as a strict boolean

[teaching.py:1082](../../src/adaptive_backend/teaching.py#L1082)

`bool(verdict.get("accepted"))` treats every nonempty string as approval. The mocked rejection `{"accepted":"false","confidence":0.99,"reason":"Reject this candidate"}` becomes `generated_validated`. Confidence is also converted without an explicit finite/range check.

**Fix:** require a JSON boolean and a finite bounded numeric confidence using a typed validation result. Malformed responses must fail closed.

### F04 — Normalize the optional modality list on every path

[teaching.py:849](../../src/adaptive_backend/teaching.py#L849)

When `item.required_modalities` is empty and the dict answer key lacks that field, the fallback expression produces `None`. `TeachingMove` requires a list. Starting seeded DSA `binary_search` practice without a model raises a Pydantic validation error. The API catches this as a client error even though the request is valid. A generated-item row is already committed before the failure.

**Fix:** append a final empty-list default, validate item/modality contracts before persistence, and add a test of the unchanged seeded practice path. Do not convert internal contract failures into misleading request-validation errors.

### F05 — Commit evidence, calibration, turn response, and session state consistently

[teaching.py:1191](../../src/adaptive_backend/teaching.py#L1191), [teaching.py:1241](../../src/adaptive_backend/teaching.py#L1241), [teaching.py:483](../../src/adaptive_backend/teaching.py#L483), [teaching.py:513](../../src/adaptive_backend/teaching.py#L513)

The logical turn spans separate database commits. Two injected failures demonstrate distinct recovery defects:

1. Failure in `_next_move` after evidence commit leaves one learning event and no teaching-turn row. A same-key retry recalibrates the item again, then rejects the duplicate event with “already being processed.” It cannot finish the original turn.
2. Failure in `_save_state` after turn insertion leaves a completed response row but the old session state. Retry returns the stored new move, while session GET still returns the old move and turn count zero. The next answer can be graded against the wrong current item.

**Fix:** use a durable turn state machine keyed by session/key, bind the key to the submitted payload/current move, and commit all final learner mutations plus replay response and session state in one transaction. Perform provider work outside long database transactions, then commit with a version check. Recovery must resume rather than repeat calibration or evidence writes.

### F06 — Refresh privacy policy at mutation boundaries

[teaching.py:211](../../src/adaptive_backend/teaching.py#L211), [api_v1.py:1214](../../src/adaptive_backend/api_v1.py#L1214), [teaching.py:1246](../../src/adaptive_backend/teaching.py#L1246)

Session state caches `persist_personalization` at startup. The personalization API changes the account row but leaves that cached flag and local-first shadow settings untouched. After pausing an active session, a graded turn still writes proof-learning events/state in both memory modes. In local-first mode it also persists shadow learning evidence because the shadow privacy row remains enabled.

The pedagogy subsystem independently checks the account privacy setting and correctly suppresses its outcome writes; this finding is specifically about proof state and local-first shadow evidence, not every persistence subsystem.

**Fix:** read the current account policy for each mutation, propagate it to shadow identities, and apply one policy gate consistently across evidence/proof/case/state writers. Define and test active-session behavior for pause and resume.

### F07 — Reserve retry attempts or redefine the budget contract

[models.py:268](../../src/adaptive_backend/models.py#L268)

The semantic coprocessor reserves one budget slot, but `ModelGateway._chat` can issue three HTTP requests internally. A mock returning HTTP 500 twice and then success produced three provider requests while the budget recorded one used call. A three-slot learner turn can therefore attempt up to nine requests through this path. Actual billing depends on provider handling and was not measured.

**Fix:** reserve every provider attempt from the caller's budget, or explicitly distinguish logical operations from provider attempts and impose a separate attempt ceiling. The current ledger does not substantiate the documented “every provider invocation” guarantee.

### F08 — Serialize completion with active turns and check session versions

[teaching.py:304](../../src/adaptive_backend/teaching.py#L304), [teaching.py:659](../../src/adaptive_backend/teaching.py#L659), [teaching.py:1598](../../src/adaptive_backend/teaching.py#L1598)

`turn` acquires a lock; `complete` does not. A controlled threaded interleaving paused the turn during next-move generation, completed and scrubbed the local-first session, then resumed the turn. Its unconditional state save restored `engine_user_id` and other active-session fields into a session still marked `completed`, and the turn returned success after completion.

**Fix:** use the same per-session synchronization for turn/complete/delete/expire operations and a database status/version comparison on the final save. A late turn must not overwrite a completed or deleted session. Multi-process execution also needs database-level arbitration.

### F09 — Apply source policy to assessment selection as well as retrieval

[decision.py:309](../../src/adaptive_backend/decision.py#L309), [teaching.py:909](../../src/adaptive_backend/teaching.py#L909)

A class using the built-in DSA subject gets a constitution with `external_sources_allowed=false`. With no course material, retrieval correctly returns no source hits, but planning still selects a built-in global question and `_generate_assessment` returns it as `fallback_validated`. Source isolation applies to retrieval but not question-bank reuse. The probe exercises planning and item selection directly to avoid F04's unrelated rendering error.

**Fix:** scope reusable questions to course-approved evidence or explicitly approved banks; apply the same source-governance decision to explanation, generation, and deterministic reuse. Return content unavailable when no permitted assessment exists.

## Additional risks established by source inspection

These were not load-tested or reproduced against real infrastructure.

- **Global turn serialization:** [teaching.py:137](../../src/adaptive_backend/teaching.py#L137) creates one service-wide lock, held across grading, generation, and provider retries. A slow provider operation makes unrelated learners wait in the same process. Replace with per-session coordination plus database versioning; measure tail latency under concurrency.
- **Blocking upload processing in async routes:** [documents.py:126](../../src/adaptive_backend/documents.py#L126) calls synchronous parsing/OCR/model work directly from async upload handling. [api_v1.py:636](../../src/adaptive_backend/api_v1.py#L636) similarly calls synchronous OCR in an async route. Heavy work can block the event loop. Move it to a bounded worker/thread adapter or a durable queue; the job ledger alone does not create background execution.
- **Abandoned shadow retention is conditional:** [teaching.py:188](../../src/adaptive_backend/teaching.py#L188) invokes expiry only when that same owner starts another session. An owner who never returns can leave abandoned shadow state indefinitely. Add independent scheduled cleanup and an explicit retention policy. Completion scrubbing also spans separate commits.
- **Maintainability and coverage:** the large teaching/API/document modules couple policy, I/O, and persistence. Existing tests cover useful safety invariants, but miss unchanged seeded practice, malformed provider values, transaction interruption, active privacy changes, and completion races. Extract typed assessment/provider contracts and a transaction coordinator before pursuing broader features. Schema upgrades are currently inline startup alterations; production migration/rollback procedures remain unverified.

## Controls that are useful

The deterministic decision/model separation, root/child semantic budget structure, score-None abstention gate, scoped retrieval predicates, revocable persisted auth sessions, Argon2 password hashing, CSRF checks for cookie-authenticated writes, streaming upload limits, and default-disabled local code execution are sound foundations. Their existence does not override the specific paths identified above. The audit did not find an auth-signing-secret disclosure or SQL-injection exploit.

## Validation and recommended order

- Existing baseline: 144 backend tests passed in the preceding project inspection, with a Starlette/AnyIO deprecation warning.
- New audit: 11/11 probes passed in 8.37 seconds, confirming the defects. Providers were mocked; all databases and accounts were synthetic and temporary.
- Transaction/privacy/concurrency probes inject a valid numeric assessment to bypass F04 and isolate their target behavior. A separate probe reproduces F04 using unchanged seeded data.
- Artifacts: [reproduce.py](reproduce.py), [probe-results.xml](probe-results.xml).
- Not performed: production penetration testing, dependency vulnerability scanning, real-provider grading benchmarks, distributed-worker tests, stress tests, or educational-outcome validation.

Fix F01–F03 and F06 first; repair F04 and F05 before evaluating learner-flow reliability. Resolve F08 alongside the transaction design, then align F07/F09 with the documented contracts. Convert these audit observations into tests that assert the safe behavior after fixes. Follow with concurrent-user and worker-restart validation.

Re-run the audit probes from `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest audits/2026-10-12/reproduce.py -v -o addopts=''
```

These probes intentionally assert current defective behavior and should fail or be rewritten once fixes land. They are outside the normal `testpaths=["tests"]` suite.
