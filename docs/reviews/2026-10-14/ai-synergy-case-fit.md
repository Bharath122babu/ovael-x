# OVAEL-X: AI Synergy Round 1 case review

Status: investigation and package planning, not a final submission. Case selection below is an AI recommendation awaiting the team's decision. No team identities, contribution claims, participant research, or learning-outcome results have been invented.

## Source and scope

Reviewed all 12 pages of the supplied AI Synergy Hackathon 2026 Round 1 case file, including rendered cover/back cover and the evidence tables. Pages 2-3 define the investigation and package. Page 4 is Case 01, AI for All: The Last-Mile AI Gap. Page 11 gives the final checklist and explains that case numbers are competition materials, not independently verified population statistics.

Source file supplied by the team: `6abc0300be656_ai_synergy_hackathon_2026_round_1_case_file_redesigned_copy.pdf`.

Team name supplied by the user: **Tapes**. Leader: **Pranav Nair**. Members: **Bharath B** and **Kushal**. Specific contribution details have not yet been supplied. Repository: https://github.com/Bharath122babu/ovael-x.

The case file does not state the submission deadline or exact page/file limits. It defers the limits to platform instructions. It does not establish eligibility of pre-existing work; declare the existing prototype and check platform rules before treating it as permitted for later rounds.

## Required package

| Requirement | Intended artifact | Missing information or constraint |
| --- | --- | --- |
| Case investigation / problem-solution brief | PDF brief, with editable source | Platform page/file limits |
| Solution presentation | Editable PPTX and PDF export if accepted | Platform slide/file limits |
| Genuine AI logs or accessible share links | Original conversation records plus decision index | Team must provide approved accessible records; do not reconstruct logs |
| Basic SRS / implementation plan | Users, inputs, outputs, workflow, functional requirements, AI/human responsibilities, constraints, errors, acceptance tests | Final case/problem choice |
| Technical proof if available | Existing GitHub prototype, architecture, selected screenshots, test evidence | Declare pre-existing components and simulated integrations |
| References, reused assets, team contributions | Source register and declarations | Actual member names/roles and source/licence checks |

The checklist requires at least two plausible problem framings, at least three acceptance tests, explicit exclusions, and a decision index pointing to consequential AI interactions. The investigation sequence also asks for a baseline, an outcome metric, and a harm/exclusion metric. A finished product is not mandatory for Round 1. Code volume or polished slides alone do not establish investigation quality.

## Recommended case and competing framings

Primary stakeholders for the recommended scope: undergraduate learners using optional AI help, with faculty reviewing task evidence. Faculty retain authority over institutional grading and acceptable-use rules.

| Framing | CASE EVIDENCE from page 4 | What a feasible intervention could address | Limitation |
| --- | --- | --- | --- |
| Access and language barriers | The case reports smartphone/laptop access differences and 42% preferring Hindi or mixed Hindi-English for complex explanations | Mobile, plain-language, multilingual task support | OVAEL-X has responsive presentation and preferences; Hindi outcome quality, real low-end-device performance, and offline operation have not been established |
| Ambiguous acceptable-use rules | Departments communicate different AI-use rules | Course-specific permitted-help guidance, disclosure, and teacher review | Rules need institutional agreement; a tutor cannot invent the policy |
| Assisted output conceals missing understanding | Faculty report that polished AI-assisted work does not consistently reflect understanding | Separate supported attempts from independent checks, identify specific missing evidence, and offer focused practice | This does not diagnose a student's overall ability or establish educational effectiveness without a pilot |

Recommended focus: the third framing. It is directly supported by a qualitative case signal and can be tested with a small workflow already represented in the prototype. The first two framings remain credible alternatives and should be compared honestly, not dismissed simply because existing code fits the third.

Draft problem statement: In AI-assisted coursework, polished submissions can leave learners and faculty without clear evidence of what the learner can do independently. How can an optional practice workflow distinguish supported performance from independent task evidence and recommend a specific next step without monitoring unrelated private chats or penalising students for using fewer AI tools?

ASSUMPTIONS: learners will opt into extra practice; faculty will accept a task-level receipt; the selected exercises represent the target course adequately. UNKNOWN: actual prevalence and causes of assisted/independent gaps, instructor review burden, language effects, device constraints, and real learning gains.

## Prototype evidence and honest limits

- Existing proof-of-learning tests distinguish assisted performance, independent performance, transfer, and retention. These are implemented evidence categories, not validated psychological diagnoses. See `backend/tests/test_proof_learning.py`.
- Assessment tests reject unsafe keyword credit and keep unverifiable responses in `needs_review`. Such abstention is preferable to invented mastery. See `backend/tests/test_v5_safety_contract.py`.
- The learner interface provides course setup, optional materials, task practice, gap guidance, a topic map, skills, and conversation receipts. These local browser flows have been exercised; receipts are conversation records, not proof that every page of a book was read.
- Eight curated AI-judgment exercises were selectively reused from the supplied friend package. Their provenance is recorded in `backend/demo/ai_judgment_questions.json`; they are not participant research or a validated literacy instrument. The frontend draws on the older OVAEL reference. Declare these and the pre-existing project explicitly.
- The latest full backend run passed 208 tests; 19 frontend tests and the frontend build pass. Those checks support software behavior, not learning-outcome claims.
- The active local demo reports teaching, OCR, media, STT and TTS providers unconfigured. Live AI-generated lessons, real scanned-book accuracy, and real voice/video processing must not be demonstrated as verified capabilities. Public image search also failed upstream in earlier checks. Distinguish implemented adapters from available integrations.
- BKT/IRT and causal gap hypotheses are implementation mechanisms. Do not claim calibrated proficiency, proven fairness, or certain causes of a learner's mistakes without relevant evaluation data.

## Proposed minimum working slice

Select one course and a small faculty-reviewed task set. Allow a learner to try a task with optional help, then offer a comparable independent check. Store actual assessed evidence, report missing evidence as unknown, suggest one focused practice action, and display a reviewable receipt. A later transfer or retention check tests whether progress persists. Text entry remains available when speech, OCR, or external AI is unavailable.

AI may explain approved content, propose practice, or assist with ambiguous language within a bounded call budget. Application code enforces access, evidence rules, and state updates. Faculty validate task/rubric suitability and make institutional grading decisions; learners decide whether to use optional support. No autonomous high-stakes capability ranking is part of Version 1.

### Acceptance-test candidates

1. An assisted correct answer followed by an independent incorrect answer does not produce a claim of independent mastery. The UI shows the need for independent practice.
2. Missing or unverifiable evidence is labelled unknown/needs review and does not increase mastery or lower the learner's score as an incorrect answer.
3. Asking for an explanation is not graded as failure. Ending an empty conversation does not imply topic completion.
4. A second learner cannot retrieve the first learner's private source material or session receipt.
5. Without AI/speech/OCR services, supported typed tasks and existing readable source material remain usable, and unsupported processing reports its failure rather than a fabricated result.
6. A course can be created without a file or an answer to the optional material question; provided plan preferences reach the stored course brief.

Baseline proposal: identical source material and task pool with a fixed explanation plus static quiz. Compare with the adaptive workflow using matched, independently scored post-tests and delayed checks; avoid comparing different assessment difficulty. Outcome metric: independently demonstrated performance on a held-out transfer task or delayed retention check. Harm metric: false independent-mastery rate, with abstentions reported separately. Exclusion check: completion/abstention differences by chosen language and device condition where appropriate consented data exists. These are proposed measurements; no experiment or participant results exist yet.

## Genuine Human-AI decision trail

Use original records, with accurate pointers and any necessary privacy review. This chat contains real decisions suitable for an index: rejecting a full friend-package import; removing learner-facing agent/debug clutter while preserving evidence engines; grouping materials; treating conversation completion separately from mastery; and correcting the upload question's placement after user feedback. The user supplied corrections and constraints. Do not retrospectively invent prompts, timestamps, member actions, or research sessions to make the investigation appear case-led.

The current project predates receipt of this case file. State that fact. The comparison above is a present investigation into whether it is suitable for this case, not evidence that this PDF originally caused the architecture decisions.

## Inputs needed for final authoring

Team name, member identities and actual contributions; confirmed case/problem selection; submission-platform page/file requirements; second project's identity and the challenge it is entering; approved genuine AI logs or share links; and any real interviews/evaluation evidence. Missing fields can be marked in a working draft, but must not become invented facts in a final submission.
