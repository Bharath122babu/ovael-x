# ovael-x v5 release audit — updated 2026-10-11

## Scope

This is a corrective full-stack release from v4. It preserves the original curriculum, adaptive, retrieval, proof-learning and auth subsystems while repairing demonstrable grading and UI contract problems. It is *not* evidence of market fit, learning gains, enterprise readiness, or comprehensive multimodal grading.

## Fixed and tested

1. **Negation/contradiction false-positive guard.** An explicit literal-criteria rubric cannot score the negated example “No ATP or NADH is produced” as 1/1. Ambiguous statements abstain. This lexical guard is conservative, not a comprehensive semantic contradiction detector.
2. **Mandatory mixed-evidence contract.** A mixed task requires `required_modalities` and `modality_criteria`; no combined grade when a required part is absent or unverifiable. Per-modality criteria receive independent results.
3. **No unsupported visual/oral claims.** Diagram topology, oral pronunciation and handwriting form cannot be inferred solely from OCR/ASR transcripts; these tasks abstain absent an appropriately scoped verifier.
4. **No unverified mastery update.** `score=None` skips MemoryCurator and proof/adaptive state commits. Help requests do not generate incorrect-attempt events.
5. **Shared learner-turn semantic budget.** A root three-call budget is shared between grading and the next move, with the DecisionFrame's own cap applied as a child budget. OCR upload has a separate one-call scope. No distributed token accounting is claimed.
6. **Truthful no-model teaching.** When model content is unavailable, the response contains labelled source excerpts or says a lesson is unavailable rather than substituting generic procedural prompts.
7. **UI/backend alignment.** Submissions normalize into typed evidence parts, including numeric validation, MCQ index, boolean input, code mode, and distinct handwriting transcripts. OCR transcript confirmation is required. Required modalities and grading/unvalidated statuses surface in the UI.
8. **Failure recovery.** Same-origin API errors are presented; a lost-response retry of the same turn keeps its idempotency key. Session resumption stores an opaque session pointer, not raw learner text.

## Verification performed

- Existing v4 baseline before changes: 135 tests passing.
- v5 backend: **144/144 passing** (including new adversarial and API scenarios).
- Frontend pure submission contract: **7/7 passing** using TypeScript transpilation and Node test runner.
- Python source `compileall` and v5 wheel build: checked.
- GitHub publication follow-up: frontend nullable-state guards and string-set typing were corrected; the full TypeScript typecheck and Vite production build now pass, along with all seven frontend contract tests. Real-browser end-to-end tests remain unverified.
- Publication includes source and dependency metadata only. Databases, uploads, generated training data, secrets, build outputs, and local review backups are excluded. The optional demo launcher generates synthetic data locally and creates a random local auth secret.

## Remaining risks / blockers

1. No true vision topology verification, multimodal audio grading or robust long-answer benchmark set. OCR transcription is not diagram understanding.
2. Free-text grading remains partly dependent on model configuration and rubric quality; naive phrase checks are still unsuitable for high-stakes outcomes.
3. No outcome/cost benchmark against LLM-first tutors; model token counts and prices are not captured by the per-call ledger.
4. The large TeachingService and API modules still need deeper decomposition. The deployment is a modular monolith, not microservices.
5. Browser E2E, accessibility review, concurrent users, migrations, distributed request budget and institutional standards remain open.
6. Security/privacy claims require deployment-specific inspection; browser speech providers may process audio externally.

**Ship decision:** Suitable for a supervised engineering/demo pilot with the frontend build verified; not approved for unsupervised high-stakes grading or enterprise-scale production.
