# OVAEL-X CSS Architecture & Mapping Guide

**Document Status**: Step 2 Complete (Pure Refactor)  
**Manifest Path**: `frontend/src/style.css`  
**Partials Directory**: `frontend/src/styles/`  
**Total Slices**: 15 modular partials  

---

## 1. Section & Layer Mapping

The monolithic `frontend/src/style.css` (11,423 lines) has been decomposed into 15 cohesive partials while strictly preserving original cascade order and selector specificity.

| Partial File | Original Line Range | Lines | Key Content & Styled Surfaces | Target React / TSX Components |
|---|:---:|:---:|---|---|
| `00-tokens.css` | 1 – 259 | 259 | Exact 5-colour palette, shades/tints, surfaces, typography tokens, button tokens, motion tokens, `[data-theme="dark"]` tokens. | Global tokens; read across all UI components and HTML root. |
| `01-base.css` | 260 – 495 | 236 | Base reset, typography reset, standard buttons (`.btn`, `.primary-button`, `.secondary-button`, disabled states), forms, inputs, dialogs. | Standard native HTML elements, buttons, inputs across app. |
| `02-shell.css` | 496 – 705 | 210 | Application shell (`.app-frame`), skip link, top bar header, brand header, navigation rail (`.side-rail`), mobile drawer. | `OvaelApp.tsx`, `App.tsx` |
| `03a-auth-core.css` | 706 – 1762 | 1,053 | Sign-in & register layout (Step 4), login-only SVG cursor (`ovael-login-pointer.svg`), cinematic entrance keyframes, proximity knowledge network, error card. | `AuthScreen.tsx`, `AuthVisualAccent.tsx`, `KnowledgeNetworkGraphic.tsx` |
| `04-motion.css` | 1763 – 2190 | 428 | Step 9 centralized keyframes (`pageFadeIn`, `cardStaggerIn`, `shimmerSlide`), motion primitives, reduced-motion overrides. | `MotionPrimitives.tsx` (`FadeIn`, `SlideIn`, `StaggerGroup`, `SkeletonLoader`) |
| `05a-workspace-base.css` | 2191 – 3574 | 1,384 | Workspace cards, stat cards, metric pills, feedback banners, base learn grid, tables, progress indicators, responsive breakpoints. | Base learner components, shared card containers. |
| `06-teacher.css` | 3575 – 5177 | 1,603 | Step 8 teacher workspace, course management, student cohorts, grading surfaces, analytics panels, teacher section toolbars. | `TeacherWorkspace.tsx`, teacher panels & screens. |
| `07-diagnostics-iris.css` | 5178 – 5546 | 369 | Additive diagnostic fragment for IRIS forensic inspector, session trace views, evidence inspections. | Forensic inspection panels, diagnostic viewers. |
| `08-integration.css` | 5547 – 6583 | 1,037 | Backend integration surfaces (legacy split auth layout, rich-text resets, code block overrides, winning `@keyframes spin`). | API integration surfaces, markdown rich text containers. |
| `05b-learner-chat.css` | 6584 – 7803 | 1,220 | Step 5 AI chat & adaptive learning workspace, message bubbles, turn history, socratic controls, enhanced code blocks. | `LearnScreen.tsx`, `ChatInterface.tsx` |
| `05c-learner-courses.css` | 7804 – 8731 | 928 | Step 6 course catalog, course cards, filter bars, enrollment modal, curriculum browser. | `CoursesScreen.tsx` |
| `05d-learner-materials.css` | 8732 – 9435 | 704 | Step 6 materials upload dropzone, materials table, reader viewer, document metadata cards. | `MaterialsScreen.tsx` |
| `05e-learner-analytics.css` | 9436 – 10507 | 1,072 | Step 7 progress metrics, learning history timeline, mastery badges, topic map (`GraphScreen` / Cytoscape). | `ProgressScreen.tsx`, `HistoryScreen.tsx`, `GraphScreen.tsx` |
| `05f-learner-settings.css` | 10508 – 11184 | 677 | Step 7 settings screen, theme switcher, telemetry controls, storage quota, MCP connections workspace. | `SettingsScreen.tsx`, `ConnectionsScreen.tsx` |
| `03b-auth-showcase.css` | 11185 – 11423 | 239 | Interactive learning showcase feature pills, SVG highlight states, confidence halos, bridge linkages. | `AuthScreen.tsx`, `AuthVisualAccent.tsx` |

### Interleaved Layers Note
`03a-auth-core.css` and `03b-auth-showcase.css` both style authentication surfaces. They are deliberately kept in separate partials to respect source-order cascading:
- `03a-auth-core.css` establishes the base authentication layout and entrance choreography early in the cascade.
- `03b-auth-showcase.css` was authored as a targeted overlay at the end of `style.css` (lines 11,185–11,423) to override generic SVG node styling with interactive feature-state highlights.
Merging them into a single file would change cascade specificity and has been deferred.

---

## 2. Test Dependencies & Contract Assertions

All contract test suites in `tests/*.test.cjs` were audited for dependencies on stylesheet content.

### Test Audit Results
- Only one test suite reads stylesheet content: [`tests/auth-logo-motion.test.cjs`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/tests/auth-logo-motion.test.cjs).
- A non-invasive test helper [`tests/helpers/readStyles.cjs`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/tests/helpers/readStyles.cjs) was added to resolve the `@import` manifest chain in exact declared order and return the concatenated CSS string.
- In `auth-logo-motion.test.cjs`, only the read call was updated (`readFileSync` -> `readStyles()`). **Every assert line remains 100% byte-identical.**

### Assertion to Rule Mapping
1. `animation: authBrandStrokeReveal 400ms var(--ease-out) 20ms both`  
   -> Defined in `styles/03a-auth-core.css` (staged SVG reveal keyframe binding).
2. `animation: authBrandGlintReveal 280ms var(--ease-out) 420ms both`  
   -> Defined in `styles/03a-auth-core.css` (brand mark glint entrance).
3. `animation: authWordmarkReveal 340ms var(--ease-out) 80ms both`  
   -> Defined in `styles/03a-auth-core.css` (OVAEL-X wordmark reveal).
4. `@media (prefers-reduced-motion: reduce)`  
   -> Declared in `styles/03a-auth-core.css`, `styles/04-motion.css`, `styles/08-integration.css`, and `styles/03b-auth-showcase.css`.
5. `.reduce-motion .auth-brand-mark`  
   -> Defined in `styles/03a-auth-core.css` (in-app reduced motion setting override).
6. `.auth-brand-mini:hover .auth-brand-mark { transform: none !important; stroke-dashoffset: 0 !important`  
   -> Defined in `styles/03a-auth-core.css` (hover neutralization under reduced motion).
7. `.brand-mark { ... background: var(--brand-navy); ... color: var(--brand-yellow); }`  
   -> Defined in `styles/05a-workspace-base.css` (brand framing and tokens).
8. `.brand-name { ... color: var(--text-heading); }`  
   -> Defined in `styles/05a-workspace-base.css` (theme-aware brand wordmark).

---

## 3. Duplicate Keyframes Resolution

- **Found Duplicates**: `@keyframes spin` was defined twice:
  - Instance 1 (`style.css:1758-1761`):
    ```css
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    ```
  - Instance 2 (`style.css:5707-5711`):
    ```css
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    ```
- **Resolution**: In CSS, later rules override earlier ones. Instance 2 was the active winning definition. Per Task C.1 rules, the earlier copy (Instance 1) in `03a-auth-core.css` was safely removed, and Instance 2 in `08-integration.css` was retained.
- **Built CSS Reduction**: The deduplication reduced production CSS bundle size by 70 raw bytes and 20 gzipped bytes.

---

## 4. `!important` Usage Audit & Classification Table

Total measured occurrences: **62**.

| # | Partial File | Line in Partial | Selector | Property | Category | Action Taken | Rationale |
|---|---|:---:|---|---|:---:|:---:|---|
| 1 | `01-base.css` | 100 | `button:disabled, .btn:disabled, .btn-loading` | `background-color` | (d) Other | Kept | State override; ensures disabled styling beats all active/hover variant rules. |
| 2 | `01-base.css` | 101 | `button:disabled, .btn:disabled, .btn-loading` | `color` | (d) Other | Kept | State override for text contrast in disabled state. |
| 3 | `01-base.css` | 102 | `button:disabled, .btn:disabled, .btn-loading` | `border-color` | (d) Other | Kept | State override for border. |
| 4 | `01-base.css` | 104 | `button:disabled, .btn:disabled, .btn-loading` | `box-shadow` | (d) Other | Kept | Neutralizes elevation on disabled buttons. |
| 5 | `01-base.css` | 105 | `button:disabled, .btn:disabled, .btn-loading` | `transform` | (d) Other | Kept | Prevents click/hover translation when disabled. |
| 6-11 | `03a-auth-core.css` | 480-485 | `.auth-brand-mark, .auth-brand-mark-svg *, .auth-brand-wordmark` | `animation`, `transition`, `opacity`, `transform`, `stroke-dashoffset`, `will-change` | (a) Reduced Motion | Kept | Essential accessibility override; tested by contract tests. |
| 12-13 | `03a-auth-core.css` | 489-490 | `.auth-brand-mini:hover .auth-brand-mark` | `transform`, `box-shadow` | (a) Reduced Motion | Kept | Neutralizes hover microinteractions under reduced motion; tested by contract tests. |
| 14-16 | `03a-auth-core.css` | 513-515 | `.auth-page--login .auth-micro-drift-1, ...` | `animation`, `opacity`, `transform` | (a) Reduced Motion | Kept | Disables ambient background drift animations under reduced motion. |
| 17-22 | `03a-auth-core.css` | 522-527 | `.reduce-motion .auth-brand-mark, ...` | `animation`, `transition`, `opacity`, `transform`, `stroke-dashoffset`, `will-change` | (a) Reduced Motion | Kept | In-app user preference setting `.reduce-motion` override; tested by contract tests. |
| 23-24 | `03a-auth-core.css` | 531-532 | `.reduce-motion .auth-brand-mini:hover .auth-brand-mark` | `transform`, `box-shadow` | (a) Reduced Motion | Kept | In-app user preference hover neutralization; tested by contract tests. |
| 25-27 | `03a-auth-core.css` | 555-557 | `.reduce-motion .auth-page--login .auth-micro-drift-1, ...` | `animation`, `opacity`, `transform` | (a) Reduced Motion | Kept | In-app user preference ambient drift neutralization. |
| 28 | `03a-auth-core.css` | 571 | `.auth-page--register .auth-node-aura-b, ...` | `animation` | (a) Reduced Motion | Kept | Suppresses aura animations when in registration mode. |
| 29-30 | `04-motion.css` | 158-159 | `.pulse-indicator.reduced` | `animation`, `opacity` | (a) Reduced Motion | Kept | Freezes pulse indicator under reduced motion. |
| 31-32 | `04-motion.css` | 173-174 | `.skeleton-loader.reduced` | `animation`, `background` | (a) Reduced Motion | Kept | Freezes shimmer slide on skeleton loaders. |
| 33-36 | `04-motion.css` | 229-232 | `*, *::before, *::after` | `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior` | (a) Reduced Motion | Kept | Universal media query override for OS `prefers-reduced-motion`. |
| 37-40 | `04-motion.css` | 240-243 | `.reduce-motion *, ...` | `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior` | (a) Reduced Motion | Kept | Universal in-app class override for user reduced motion toggle. |
| 41-44 | `05a-workspace-base.css` | 421-424 | `*, *::before, *::after` | `animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior` | (a) Reduced Motion | Kept | Base workspace media query override. |
| 45 | `05a-workspace-base.css` | 484 | `.sr-only` | `position` | (d) Other | Kept | Standard screen-reader accessibility utility pattern. |
| 46 | `05a-workspace-base.css` | 582 | `.close-nav, .menu-button` | `display` | (d) Other | Kept | Desktop navigation toggle hiding responsive mobile buttons. |
| 47 | `06-teacher.css` | 1403 | `.close-nav, .menu-button` | `display` | (d) Other | Kept | Teacher workspace mobile breakpoint display override. |
| 48-51 | `07-diagnostics-iris.css` | 363-366 | `*, *::before, *::after` | `scroll-behavior`, `animation-duration`, `animation-iteration-count`, `transition-duration` | (a) Reduced Motion | Kept | Diagnostic surface accessibility override. |
| 52-53 | `08-integration.css` | 169-170 | `.reduce-motion *, ...` | `animation-duration`, `transition-duration` | (a) Reduced Motion | Kept | Integration layer user setting override. |
| 54-55 | `08-integration.css` | 446, 449 | `.rich-text > :first-child`, `.rich-text > :last-child` | `margin-top`, `margin-bottom` | (d) Other | Kept | Container padding protection against markdown child paragraph margins. |
| 56-58 | `08-integration.css` | 1017-1019 | `*, *::before, *::after` | `animation`, `transition`, `scroll-behavior` | (a) Reduced Motion | Kept | Integration layer reduced motion reset. |
| 59-60 | `03b-auth-showcase.css` | 222-223 | `.auth-visual-accent--reduced-motion ...` | `animation`, `transition` | (a) Reduced Motion | Kept | Auth knowledge network SVG reduced motion override. |
| 61-62 | `03b-auth-showcase.css` | 235-236 | `.auth-knowledge-svg .auth-feature-halo, ...` | `animation`, `transition` | (a) Reduced Motion | Kept | Auth knowledge network halo reduced motion override. |

---

## 5. Token Consolidation Candidates (Deferred to Step 8)

The following hardcoded hex values and raw durations duplicate existing design tokens defined in `00-tokens.css`. They are documented here for unification in Step 8 (Motion & Design System Cleanup):

| Location | Hardcoded Value | Matching Design Token | Context Selector |
|---|:---:|:---:|---|
| `styles/04-motion.css:154` | `#B4DFE5` | `var(--brand-teal)` | `.pulse-indicator { background-color: var(--brand-soft-blue, #B4DFE5); }` |
| `styles/06-teacher.css:87` | `#B4DFE5` | `var(--brand-teal)` | `.teacher-meta-tag { color: var(--brand-soft-blue, #B4DFE5); }` |
| `styles/06-teacher.css:224` | `#B4DFE5` | `var(--brand-teal)` | `.cohort-badge { color: var(--brand-soft-blue, #B4DFE5); }` |
| `styles/06-teacher.css:478` | `#B4DFE5` | `var(--brand-teal)` | `.teacher-pill { background-color: var(--brand-soft-blue, #B4DFE5); }` |
| `styles/05b-learner-chat.css:1051` | `#1E2544` | `var(--brand-navy)` | `.code-block-header { background: var(--brand-navy-dark, #1E2544); }` |
| `styles/05b-learner-chat.css:1077` | `#FBE8A6` | `var(--brand-yellow)` | `.code-language-tag { color: var(--brand-yellow, #FBE8A6); }` |
| `styles/05b-learner-chat.css:1084` | `#B4DFE5` | `var(--brand-teal)` | `.copy-code-btn { color: var(--brand-soft-blue, #B4DFE5); }` |
| `styles/03b-auth-showcase.css:60` | `#FBE8A6` | `var(--brand-yellow)` | `.feature-pill[data-feature="memory"] .pill-dot { background: #FBE8A6; }` |
| `styles/03b-auth-showcase.css:77` | `#FBE8A6` | `var(--brand-yellow)` | `.feature-pill[data-feature="memory"]:focus { background: #FBE8A6; }` |
| `styles/03b-auth-showcase.css:144` | `#FBE8A6` | `var(--brand-yellow)` | `.auth-feature-memory-link { stroke: #FBE8A6; }` |

---

## 6. Unused Selector Candidates (Deferred to Step 3)

The following class selectors from `styles/08-integration.css` were not found in current `.tsx` component templates. Because class names can be dynamically assembled, these candidates are deferred to Step 3 (Bugs & Dead Code Elimination) for safe AST auditing:

1. `.auth-intro`
2. `.auth-points`
3. `.auth-panel`
4. `.connection-create`
5. `.upload-controls`
6. `.demo-login`
7. `.auth-privacy`
8. `.inline-success`
9. `.materials-heading`
10. `.upload-buttons`
11. `.ocr-result`
12. `.ocr-badge`
13. `.material-toolbar`
14. `.material-list`
15. `.material-summary`
16. `.concept-chip`
17. `.concept-name`
18. `.concept-status`
19. `.evidence-item`
20. `.evidence-meta`
