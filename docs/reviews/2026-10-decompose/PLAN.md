# OVAEL-X Component Decomposition Architecture & Plan

**Document Status**: Step 4 Plan (Approved for Implementation)  
**Execution Order**:
1. `SettingsScreen.tsx` (778 lines) -> `components/learner/screens/settings/`
2. `MaterialsScreen.tsx` (1,000 lines) -> `components/learner/screens/materials/`
3. `CoursesScreen.tsx` (1,039 lines) -> `components/learner/screens/courses/`
4. `LearnScreen.tsx` (1,091 lines) -> `components/learner/screens/learn/`
5. `TeacherWorkspace.tsx` (1,772 lines) -> `components/teacher/`

---

## 1. Test Dependencies Audit (Text Read Check)

We audited all test files in `frontend/tests/*.test.cjs` for text reads (`fs.readFileSync`):
- `assessment.test.cjs`: transpiles `src/assessment.ts`
- `auth-logo-motion.test.cjs`: reads `src/components/auth/AuthScreen.tsx` and `src/style.css` (via `readStyles`)
- `auth.test.cjs`: transpiles `src/auth.ts` and inspects `backend/src/adaptive_backend/auth.py`
- `bugfix-step3.test.cjs`: transpiles `src/storage.ts`, inspects `src/components/OvaelApp.tsx`, and `src/components/auth/AuthScreen.tsx`
- `integration-contracts.test.cjs`: transpiles `learningVisuals.ts`, `turnBuffer.ts`, `rewards.ts`, `diagrams.ts`, `localProjection.ts`, `api.ts`

**Finding**: **Zero tests read any of the 5 target screen files as text.**  
All 5 target components are imported only via standard ES import statements in React runtime files (`LearnerWorkspace.tsx` and `OvaelApp.tsx`).

---

## 2. Decomposition Plans

### 2.1. `SettingsScreen.tsx` (778 lines -> Target: <200 lines root)

#### Inventory
- **Tabs**: `personalization`, `profile`, `security`, `accessibility`, `data`, `integrations`, `services`.
- **Context**: Consumes `useOvael()` (`user`, `profile`, `health`, `map`, `sessions`, `courses`, `memory`, `localState`, `refresh`, `setError`, `clearLocalState`) and `useTeaching()`.
- **API Calls**: `api("/v1/profile/study-preferences")`, `ovaelApi.authSessions()`, `ovaelApi.setPersonalization()`, `ovaelApi.deleteMemory()`, `ovaelApi.changePassword()`, `ovaelApi.rotateRecoveryKey()`, `ovaelApi.revokeAuthSession()`, `ovaelApi.shareProgress()`.
- **Local State**: `tab`, `reduceMotion`, `busy`, `authSessions`, `currentPassword`, `newPassword`, `recoveryKey`, `notice`, `studyFormat`, `studyPace`, `plainLanguage`.

#### Target Structure (`frontend/src/components/learner/screens/settings/`)
1. `types.ts` (~30 lines): `SettingsTab`, `TAB_CONFIG`.
2. `SettingsSidebar.tsx` (~60 lines): Tab selection rail / pills (`personalization`, `profile`, etc.).
3. `PersonalizationTab.tsx` (~130 lines): Memory toggle, pedagogical explanation format/pace/plain-language preferences, and save action.
4. `ProfileTab.tsx` (~80 lines): User identity card, username, role, member since, learner ID badge.
5. `SecurityTab.tsx` (~170 lines): Password change form, recovery key generation card, active authentication sessions list with revoke buttons.
6. `AccessibilityTab.tsx` (~60 lines): Theme switcher (Light/Dark) and reduced motion toggle button.
7. `DataTab.tsx` (~140 lines): Export learning state button, memory wipe confirmation dialog, course progress sharing toggles.
8. `ServicesTab.tsx` (~70 lines): System health indicators, API latency, database connection indicators.
9. `SettingsScreen.tsx` (root, ~120 lines): Retains main container, tab switching state, banner notifications (`notice`, `error`), and delegates tab content to the corresponding subcomponents.

---

### 2.2. `MaterialsScreen.tsx` (1,000 lines -> Target: <250 lines root)

#### Inventory
- **Components & Sections**: Header stats, upload dropzone with course/subject routing, filters/search bar, document grid/list view, inspection modal drawer.
- **Context**: Consumes `useOvael()` (`documents`, `courses`, `subjects`, `refresh`, `setError`).
- **API Calls**: `ovaelApi.createCourse()`, `ovaelApi.uploadDocument()`, `ovaelApi.deleteDocument()`, `ovaelApi.documentInspection()`.
- **Helpers**: `bytes(value)`, `launchFor(document)`, `getFileCategory(contentType, filename)`.

#### Target Structure (`frontend/src/components/learner/screens/materials/`)
1. `materialsHelpers.ts` (~50 lines): `bytes`, `launchFor`, `getFileCategory`.
2. `MaterialUploadZone.tsx` (~160 lines): Drag-and-drop file upload target, file input ref, subject/course selector, upload progress indicator.
3. `MaterialFilterBar.tsx` (~100 lines): Search input, category filter pills (`all`, `doc`, `image`, `media`), course dropdown filter, view mode toggle (grid vs list).
4. `MaterialCard.tsx` (~170 lines): Single document card / row render with metadata, focus concept chip, OCR review banner, delete confirmation, and "Study Topic" action.
5. `MaterialList.tsx` (~120 lines): Responsive grid and list containers, empty state cards, and iteration over documents.
6. `MaterialInspectorModal.tsx` (~140 lines): Slide-over drawer / modal showing full extracted document text, citation index, and raw metadata.
7. `MaterialsScreen.tsx` (root, ~180 lines): Composition root managing active filters, upload handlers, inspection modal selection, and wiring child components.

---

### 2.3. `CoursesScreen.tsx` (1,039 lines -> Target: <250 lines root)

#### Inventory
- **Components & Sections**: Catalog header, course filter/sort bar, create course modal with study map JSON outline import, course grid cards, selected course concept drawer with topic addition and learning launches.
- **Context**: Consumes `useOvael()` (`courses`, `subjects`, `map`, `documents`, `refresh`, `setError`).
- **API Calls**: `api("/v1/courses/${id}/concepts")`, `api("/v1/courses", "POST")`, `api("/v1/courses/${id}/concepts", "POST")`, `ovaelApi.uploadDocument()`, `ovaelApi.deleteCourse()`.

#### Target Structure (`frontend/src/components/learner/screens/courses/`)
1. `CourseFilterBar.tsx` (~90 lines): Search box, kind filter pills (`all`, `personal`, `class`), sort selector, and "Create New Course" trigger.
2. `CourseCard.tsx` (~150 lines): Course preview card with subject badge, topic mastery progress bar, document count, and select/open trigger.
3. `CourseList.tsx` (~100 lines): Grid of course cards with empty state search prompts.
4. `CourseCreateModal.tsx` (~260 lines): Course creation dialog, title/subject selection, level radio options, outline textarea, JSON study map file importer.
5. `CourseDetailDrawer.tsx` (~220 lines): Right-side concept curriculum panel, topic search, custom concept creation input, and "Start Learning" launch button.
6. `CoursesScreen.tsx` (root, ~160 lines): Composition root holding selected course ID, modal visibility state, and top-level mutation coordinators.

---

### 2.4. `LearnScreen.tsx` (1,091 lines -> Target: <250 lines root)

#### Inventory
- **Components & Sections**: Chat session header (course/concept switcher, tool toggles), message list / turn conversation stream, dynamic answer input forms (MCQ buttons, boolean, code, numeric), composer footer (textarea, voice, drawing pad, attachments, illustration trigger).
- **Context**: Consumes `useOvael()` and `useTeaching()` (`t.session`, `t.entries`, `t.busy`, `t.answer`, `t.submitTurn`, etc.).
- **Sub-modal widgets**: `<DrawingPad>`, `<VoiceInput>`, `<IllustrationPanel>`, `<KnowledgeNetworkGraphic>`.

#### Target Structure (`frontend/src/components/learner/screens/learn/`)
1. `types.ts` (~20 lines): Shared `Concept` type and launch parameters.
2. `LearnHeader.tsx` (~130 lines): Course and concept dropdown selectors, topic launch trigger, and action buttons (Illustrations, Draw, Voice).
3. `TurnCard.tsx` (~180 lines): Individual turn bubble rendering user/assistant messages, socratic moves, citation evidence pills, math rich text, and copy-to-clipboard button.
4. `AnswerInputs.tsx` (~160 lines): Socratic move question controls: multiple choice options, boolean choice pills, numeric validation input, and code snippet prompt.
5. `Composer.tsx` (~220 lines): Auto-expanding textarea, paperclip attachment menu (audio, image, document), voice recording modal trigger, drawing pad trigger, and submit button.
6. `MessageList.tsx` (~140 lines): Container rendering the turn stream, empty state welcome screen, turn cards, and auto-scrolling tail anchor.
7. `LearnScreen.tsx` (root, ~180 lines): Composition root synchronizing launch parameters, concept loading, intent mode, and modal visibility.

---

### 2.5. `TeacherWorkspace.tsx` (1,772 lines -> Target: <300 lines root)

#### Inventory
- **Tabs**: `overview`, `roster`, `materials`, `graph`, `gaps`.
- **Modals**: Create Course modal, Edit Course modal, Unenroll confirmation, Graph Proposal modal.
- **Context**: Consumes `useOvael()` (`courses`, `documents`, `refresh`, `setError`).
- **API Calls**: `ovaelApi.teacherLearners()`, `ovaelApi.teacherGaps()`, `ovaelApi.teacherInterventions()`, `ovaelApi.graphProposals()`, `ovaelApi.activeCourseGraph()`, `ovaelApi.createCourse()`, `ovaelApi.updateCourse()`, `ovaelApi.deleteCourse()`, `ovaelApi.unenrollLearner()`, `ovaelApi.proposeGraphExtension()`, `ovaelApi.applyGraphProposal()`.

#### Target Structure (`frontend/src/components/teacher/`)
1. `types.ts` (~30 lines): `TeacherTab`, shared interfaces.
2. `TeacherHeader.tsx` (~140 lines): Course selector dropdown, tab navigation rail, course settings action buttons (Edit, Delete, New Course).
3. `OverviewTab.tsx` (~180 lines): Cohort KPI metric cards (learner count, average mastery gauge, pending interventions, active blockers) and recent activity stream.
4. `RosterTab.tsx` (~200 lines): Enrolled student table, search bar, progress indicators, and student unenroll action.
5. `TeacherMaterialsTab.tsx` (~180 lines): Course-scoped materials table, document upload dropzone, and material removal action.
6. `CurriculumGraphTab.tsx` (~260 lines): Active knowledge graph visualization via Mermaid, graph proposal submission form, and pending proposal review cards.
7. `ForensicGapsTab.tsx` (~220 lines): Class-wide causal gap forensics table, blocker concepts, and targeted intervention recommendations.
8. `modals/CreateCourseModal.tsx` (~100 lines): Create class cohort modal.
9. `modals/EditCourseModal.tsx` (~100 lines): Edit course name and description modal.
10. `modals/UnenrollModal.tsx` (~70 lines): Student removal confirmation dialog.
11. `modals/ProposeGraphModal.tsx` (~90 lines): Extension proposal creation dialog.
12. `TeacherWorkspace.tsx` (root, ~240 lines): Composition root loading cohort details, managing modal state, coordinating mutations, and rendering active tabs.

---

## 3. Dependency Graph & Cycle Verification

All child subcomponents import strictly downwards from:
- `types.ts` (local types)
- `../../../context/*` and `../../../api/*` (global contexts and API)
- `../../../types` (domain entities)
- Shared UI primitives (`MotionPrimitives`, `RichText`, `MermaidDiagram`)

**Zero horizontal or circular imports exist**:
- Subcomponents do not import the root screen.
- Subcomponents do not import peer subcomponents (shared logic or types live in `types.ts` or `helpers.ts`).
- Root screen imports subcomponents unidirectionally.

---

## 4. "Found While Moving" Log

This section tracks any non-blocking issues or potential improvements noticed during inspection:
1. `CoursesScreen.tsx:84`: Outline import uses magic byte threshold `200000` (200 KB) and max `60` nodes. Contract tests verify this exact behavior; kept strictly intact.
2. `TeacherWorkspace.tsx:100`: Success message uses a `4500` ms timeout. Retained without modification.
3. `LearnScreen.tsx:67`: Textarea height calculation bounds `Math.min(Math.max(el.scrollHeight, 44), 180)` ensures stable layout without scroll jitter. Preserved as-is.
