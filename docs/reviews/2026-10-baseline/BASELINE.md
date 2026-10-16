# OVAEL-X Step 1 Baseline Report

**Execution Date**: 2026-10-16  
**Environment**: Windows 11 x64  
**Runtime**: Node.js `v24.16.0`, npm `11.13.0` (Local host environment; CI pipeline `.github/workflows/checks.yml` targets Node `22`)  
**Repository Branch**: `frontend`  
**Base Commit**: `d03db70` (`feat(auth): apply interactive learning showcase and premium brand motion patches`)  

---

## 1. Executive Summary

This baseline establishes the verified status of the OVAEL-X application at the initiation of the 10-step improvement program.

- **Status**: **100% Green**. The full CI sequence (`npm ci`, `npm run lint`, `npm run test:contracts`, `npm run build`) passed with exit code 0.
- **Contract Tests**: All **24 / 24 tests passed** without modifications.
- **Zero Blocking Errors**: TypeScript compilation (`tsc -b`) emitted **0 errors**. ESLint emitted **0 errors** (6 deferred `react-hooks/exhaustive-deps` warnings preserved to protect runtime behavior).
- **Smoke Testing & Screenshots**: Captured **32 full-page screenshots** covering 8 distinct screens (2 login modes + 6 learner workspace screens) across 2 viewports (`1440x900` desktop, `390x844` mobile) and 2 themes (`light`, `dark`).
- **Dependencies**: Added single devDependency `playwright: "^1.64.1"` in `/frontend` to power automated headless smoke-testing and visual verification. Zero production dependencies upgraded or changed.

---

## 2. Command Execution Log & Pass/Fail Status

| Step | Command | Working Directory | Exit Code | Result Status | Notes |
|---|---|---|:---:|:---:|---|
| 1 | `node -v` | `frontend` | 0 | **PASS** | `v24.16.0` |
| 2 | `npm -v` | `frontend` | 0 | **PASS** | `11.13.0` |
| 3 | `npm ci` | `frontend` | 0 | **PASS** | 397 packages added, 398 audited in 52s. 4 low severity audit warnings noted. |
| 4 | `npm run lint` | `frontend` | 0 | **PASS** | 0 errors, 6 warnings (`react-hooks/exhaustive-deps`). |
| 5 | `npm run test:contracts` | `frontend` | 0 | **PASS** | 24 tests passed, 0 failed, 0 skipped (duration: ~926ms). |
| 6 | `npm run build` | `frontend` | 0 | **PASS** | `tsc -b && vite build` succeeded in 46.87s. |
| 7 | `npx playwright install chromium` | `frontend` | 0 | **PASS** | Installed Chromium headless browser revision 1248. |
| 8 | Headless Smoke Testing & Capture | `frontend` | 0 | **PASS** | All 32 full-page screenshots captured and validated. |

---

## 3. Lint, Type, Test, and Build Detailed Counts

### 3.1. TypeScript Compilation (`tsc -b`)
- **Total Errors**: `0`
- **Total Warnings**: `0`

### 3.2. ESLint (`eslint .`)
- **Total Errors**: `0`
- **Total Warnings**: `6`
- **Warning Details**:
  1. `frontend/src/components/OvaelApp.tsx:70:6` — `react-hooks/exhaustive-deps`: React Hook useEffect has missing dependencies: 'teaching' and 'user'.
  2. `frontend/src/components/learner/screens/GapForensicsScreen.tsx:67:23` — `react-hooks/exhaustive-deps`: The ref value 'requestRevision.current' will likely have changed by the time this effect cleanup function runs.
  3. `frontend/src/context/OvaelContext.tsx:106:6` — `react-hooks/exhaustive-deps`: React Hook useEffect has a missing dependency: 'user'.
  4. `frontend/src/context/OvaelContext.tsx:209:18` — `react-hooks/exhaustive-deps`: The ref value 'generation.current' will likely have changed by the time this effect cleanup function runs.
  5. `frontend/src/context/TeachingContext.tsx:151:16` — `react-hooks/exhaustive-deps`: The ref value 'revision.current' will likely have changed by the time this effect cleanup function runs.
  6. `frontend/src/context/TeachingContext.tsx:153:6` — `react-hooks/exhaustive-deps`: React Hook useEffect has missing dependencies: 'accept', 'memory', and 'setError'.

### 3.3. Contract Tests (`node --test tests/*.test.cjs`)
- **Suites**: `0`
- **Total Tests**: `24`
- **Passed**: `24`
- **Failed**: `0`
- **Skipped / Cancelled / Todo**: `0`
- **Execution Time**: `926.8ms`

### 3.4. Production Build Outputs
- **Total Assets**: 96 files (1 HTML, 2 CSS, 34 WOFF/WOFF2/TTF fonts, 60 JavaScript chunks)
- **Primary CSS Bundles**:
  - `dist/assets/index-C73iYLyb.css`: **196.21 kB** (gzip: 32.38 kB)
  - `dist/assets/MathRichText-DdZNUVNG.css`: **30.25 kB** (gzip: 8.09 kB)
- **Top JavaScript Chunks by Size**:

| Chunk File | Raw Size | Gzip Size | Notes / Recommendation |
|---|:---:|:---:|---|
| `dist/assets/elk-QONTBCTQ-BJcjvyoI.js` | **1,479.05 kB** | 454.28 kB | Exceeds 500 kB; ELK layout graph engine |
| `dist/assets/cynefin-EF2NZ3EQ-CJI_K8qR.js` | **657.62 kB** | 139.85 kB | Exceeds 500 kB; Cynefin diagram visualization |
| `dist/assets/mermaid.core-4MdqZkgF.js` | **654.69 kB** | 156.74 kB | Exceeds 500 kB; Mermaid core rendering |
| `dist/assets/index-CZ2tbTnm.js` | **600.49 kB** | 175.13 kB | Exceeds 500 kB; Main application bundle |
| `dist/assets/cytoscape.esm-Ix0LnXOy.js` | **443.83 kB** | 142.41 kB | Network graph visualization library |
| `dist/assets/MathRichText-CaZFwfcJ.js` | **276.26 kB** | 83.41 kB | Math / LaTeX rich text rendering |
| `dist/assets/katex-RYEII7GN.js` | **261.76 kB** | 77.90 kB | KaTeX mathematical typesetting |
| `dist/assets/usecaseDiagram-WPOLBNNX-DFR-PQAJ.js` | **190.62 kB** | 50.98 kB | Mermaid usecase diagram renderer |
| `dist/assets/architectureDiagram-ZHVYKT53-ClWJTxag.js` | **152.02 kB** | 43.23 kB | Architecture diagram plugin |
| `dist/assets/sequenceDiagram-BLEHNHQU-ToyU9qDe.js` | **119.42 kB** | 32.14 kB | Sequence diagram plugin |
| `dist/assets/swimlanes-B3ENRKFQ-CZA6AwdW.js` | **112.45 kB** | 40.95 kB | Swimlanes diagram plugin |

---

## 4. Console Errors & Warnings Table

The table below lists all console messages captured across all tested screens, themes, and viewports:

| Screen & Mode | Type | Message | Location | Likely Cause |
|---|:---:|---|---|---|
| `login-signin` (desktop-light) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/me` | Expected initial session restoration attempt in `OvaelContext.tsx` when unauthenticated. |
| `login-signin` (desktop-light) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/refresh` | Expected secondary cookie refresh attempt when `/v1/auth/me` returns 401. |
| `login-signin` (desktop-dark) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/me` | Expected initial session restoration attempt in `OvaelContext.tsx`. |
| `login-signin` (desktop-dark) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/refresh` | Expected secondary cookie refresh attempt. |
| `login-signin` (mobile-light) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/me` | Expected initial session restoration attempt in `OvaelContext.tsx`. |
| `login-signin` (mobile-light) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/refresh` | Expected secondary cookie refresh attempt. |
| `login-signin` (mobile-dark) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/me` | Expected initial session restoration attempt in `OvaelContext.tsx`. |
| `login-signin` (mobile-dark) | `ERROR` | `Failed to load resource: the server responded with a status of 401 (Unauthorized)` | `http://127.0.0.1:5173/v1/auth/refresh` | Expected secondary cookie refresh attempt. |
| `login-create` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-chat` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-courses` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-materials` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-progress` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-connections` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |
| `learner-settings` (all modes) | - | *None* | - | Clean render; 0 errors, 0 warnings. |

---

## 5. Measured Repository Metrics

| Metric | Measured Value | Notes |
|---|:---:|---|
| Total Lines in `style.css` | **11,423 lines** | Monolithic central stylesheet |
| Count of `!important` declarations | **62** | Specificity overrides across theme and layout rules |
| Duplicate `@keyframes` names | **1** | `@keyframes spin` defined 2 times in `style.css` |
| Largest `.tsx` File 1 | `TeacherWorkspace.tsx`: **1,772 lines** | Component monolithic architecture |
| Largest `.tsx` File 2 | `LearnScreen.tsx`: **1,091 lines** | Chat & interactive lesson workspace |
| Largest `.tsx` File 3 | `CoursesScreen.tsx`: **1,039 lines** | Course catalog and enrollment manager |
| Largest `.tsx` File 4 | `MaterialsScreen.tsx`: **1,000 lines** | Socratic learning material reader & parser |
| Largest `.tsx` File 5 | `SettingsScreen.tsx`: **778 lines** | User, theme, storage, and telemetry settings |

---

## 6. Known Issues Deferred

The table below lists all known deferred issues, their file:line location, and the designated step that will own each resolution:

| Issue Location | Issue Description | Owning Step | Rationale for Deferral |
|---|---|:---:|---|
| `frontend/src/style.css:1-11423` | 62 occurrences of `!important` declarations across theme, layout, and utility selectors | **Step 2 (CSS Architecture)** | Removing `!important` without systematic cascade refactoring risks visual regression. |
| `frontend/src/style.css:9173, 11069` | Duplicate `@keyframes spin` definition | **Step 2 (CSS Architecture)** | Benign duplicate that should be deduplicated during stylesheet tokenization and cleanup. |
| `frontend/src/components/OvaelApp.tsx:70:6` | `react-hooks/exhaustive-deps`: missing dependencies 'teaching' and 'user' | **Step 3 (Bugs)** | Adding `teaching` or `user` to effect dependency array causes repeated handoff executions on profile changes. |
| `frontend/src/components/learner/screens/GapForensicsScreen.tsx:67:23` | `react-hooks/exhaustive-deps`: ref value 'requestRevision.current' accessed in cleanup | **Step 3 (Bugs)** | Requires scoping ref value to an internal variable without altering abort controller behavior. |
| `frontend/src/context/OvaelContext.tsx:106:6` | `react-hooks/exhaustive-deps`: missing dependency 'user' | **Step 3 (Bugs)** | Adding `user` triggers redundant session refresh loops during auth state changes. |
| `frontend/src/context/OvaelContext.tsx:209:18` | `react-hooks/exhaustive-deps`: ref value 'generation.current' accessed in cleanup | **Step 3 (Bugs)** | Minor ref cleanup lifecycle safety fix. |
| `frontend/src/context/TeachingContext.tsx:151:16` | `react-hooks/exhaustive-deps`: ref value 'revision.current' accessed in cleanup | **Step 3 (Bugs)** | Minor ref cleanup lifecycle safety fix. |
| `frontend/src/context/TeachingContext.tsx:153:6` | `react-hooks/exhaustive-deps`: missing dependencies 'accept', 'memory', 'setError' | **Step 3 (Bugs)** | Context functions must be wrapped in `useCallback` or stabilized before inclusion in dependency array. |
| `frontend/src/components/teacher/TeacherWorkspace.tsx` | Monolithic component (1,772 lines) | **Step 4 (Decomposition)** | Component splitting into modular panels and screens. |
| `frontend/src/components/learner/screens/LearnScreen.tsx` | Monolithic component (1,091 lines) | **Step 4 (Decomposition)** | Extracting chat message list, composer, and evidence drawer into distinct components. |
| `frontend/src/components/learner/screens/CoursesScreen.tsx` | Monolithic component (1,039 lines) | **Step 4 (Decomposition)** | Separating course cards, enrollment modal, and curriculum browser. |
| `frontend/src/components/learner/screens/MaterialsScreen.tsx` | Monolithic component (1,000 lines) | **Step 4 (Decomposition)** | Decomposing material editor, markdown viewer, and source citations. |
| `dist/assets/*.js` | Chunks > 500 kB (`elk`, `cynefin`, `mermaid.core`, `index`) | **Step 4 (Decomposition)** | Implementing dynamic `React.lazy()` / `import()` and Rollup manual chunking. |
| Transitive dependency `katex` (via `rehype-katex`) | KaTeX prototype pollution advisory (GHSA-238p-pmpm-9mq7) | **Step 3 (Bugs)** | Updating requires evaluating `rehype-katex` v2+ breaking API changes against markdown rendering. |

---

## 7. Captured Screenshots Directory

All 32 baseline screenshots are persisted in `docs/reviews/2026-10-baseline/`:

1. `login-signin-desktop-light.png`
2. `login-signin-desktop-dark.png`
3. `login-signin-mobile-light.png`
4. `login-signin-mobile-dark.png`
5. `login-create-desktop-light.png`
6. `login-create-desktop-dark.png`
7. `login-create-mobile-light.png`
8. `login-create-mobile-dark.png`
9. `learner-chat-desktop-light.png`
10. `learner-chat-desktop-dark.png`
11. `learner-chat-mobile-light.png`
12. `learner-chat-mobile-dark.png`
13. `learner-courses-desktop-light.png`
14. `learner-courses-desktop-dark.png`
15. `learner-courses-mobile-light.png`
16. `learner-courses-mobile-dark.png`
17. `learner-materials-desktop-light.png`
18. `learner-materials-desktop-dark.png`
19. `learner-materials-mobile-light.png`
20. `learner-materials-mobile-dark.png`
21. `learner-progress-desktop-light.png`
22. `learner-progress-desktop-dark.png`
23. `learner-progress-mobile-light.png`
24. `learner-progress-mobile-dark.png`
25. `learner-connections-desktop-light.png`
26. `learner-connections-desktop-dark.png`
27. `learner-connections-mobile-light.png`
28. `learner-connections-mobile-dark.png`
29. `learner-settings-desktop-light.png`
30. `learner-settings-desktop-dark.png`
31. `learner-settings-mobile-light.png`
32. `learner-settings-mobile-dark.png`
