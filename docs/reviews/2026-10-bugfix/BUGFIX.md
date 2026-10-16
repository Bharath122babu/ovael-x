# OVAEL-X Step 3 Bugfix & Quality Report

**Execution Date**: 2026-10-16  
**Environment**: Windows 11 x64  
**Runtime**: Node.js `v24.16.0`, npm `11.13.0` (Local host environment; CI pipeline `.github/workflows/checks.yml` targets Node `22`)  
**Repository Branch**: `frontend`  
**Base Commit**: `d03db70` (`feat(auth): apply interactive learning showcase and premium brand motion patches`)  

---

## 1. Executive Summary

Step 3 focused on fixing real bugs, addressing reliability and code-quality issues, and resolving all deferred warnings without visual redesign or product behavior changes.

- **Status**: **100% Green**.
- **ESLint**: Reduced warning count from **6 to 0 warnings** (`eslint .` exits 0 with 0 errors, 0 warnings).
- **TypeScript**: `tsc -b` compiled with **0 errors, 0 warnings**.
- **Contract & Unit Tests**: All **27 tests passed** (24 original contract tests + 3 new Step 3 unit and contract tests in `frontend/tests/bugfix-step3.test.cjs`).
- **Production Build**: `npm run build` succeeded with exit code 0.
- **Pixel-by-Pixel Visual Integrity**: 32 screenshots captured across 8 screens, 2 viewports (`1440x900` desktop, `390x844` mobile), and 2 themes (`light`, `dark`). Diffed against Step 2 (`docs/reviews/2026-10-css/after/`), yielding **0.0000% diff across all static screens**.

---

## 2. Suspects Investigated & Implemented Fixes

### 2.1. Safe Storage Abstraction (`frontend/src/storage.ts`)
- **Bug**: Direct calls to `window.localStorage` and `window.sessionStorage` throw uncaught `SecurityError` exceptions in Safari private browsing mode, sandboxed iframes, or environments with blocked cookies/storage, crashing the entire application upon load.
- **Fix**: Created `safeStorage` in `frontend/src/storage.ts` providing `getItem`, `setItem`, `removeItem`, and `clear` for both `local` and `session` storage. If storage access throws or is blocked, operations silently fall back to an internal in-memory map.
- **Scope**: Replaced all direct `localStorage` and `sessionStorage` references in `OvaelApp.tsx`, `OvaelContext.tsx`, and `TeachingContext.tsx`.

### 2.2. Theme Resolution Fallback (`frontend/src/components/OvaelApp.tsx`)
- **Bug**: Theme initialization assumed accessible storage.
- **Fix**: Initializer safely inspects `safeStorage.getItem("ovael_theme")`. If unavailable, null, or corrupted, it cleanly falls back to `window.matchMedia("(prefers-color-scheme: dark)").matches`.

### 2.3. Handoff Effect Dependency Stabilization (`frontend/src/components/OvaelApp.tsx`)
- **Bug**: ESLint warned on missing `teaching` dependencies in the `/app/continue/<token>` handoff effect. Including `teaching` directly triggered repeated re-evaluations whenever unrelated context state changed.
- **Fix**: Destructured stable context references (`teachingBusy`, `teachingPending`, `openHandoff`) and guarded double-fire using `handoffSeen.current = token`. Verified that timing and invocation semantics are unchanged.

### 2.4. Mobile Navigation `inert` and Focus Restoration (`frontend/src/components/OvaelApp.tsx`)
- **Bug**: `.app-body` inert attribute manipulation lacked cleanup on unmount, and keyboard navigation did not reliably return focus when dismissing via Escape.
- **Fix**: Added cleanup callback returning focus to the previously active element (`document.activeElement`) and removing `inert` from `.app-body` on drawer close or unmount.

### 2.5. Profile Menu Dismissal on Touch & Keyboard (`frontend/src/components/OvaelApp.tsx`)
- **Bug**: Outside-click handler only listened to `mousedown`, failing on mobile touch interactions and keyboard Escape.
- **Fix**: Added `touchstart` and `keydown` (Escape key) listeners with proper cleanup on unmount or menu close.

### 2.6. Role-Aware Landing Screen on Sign Out (`frontend/src/components/OvaelApp.tsx`)
- **Bug**: `signOut` hardcoded default screen reset to `"learn"`, even for teacher accounts whose default workspace is `"courses"`.
- **Fix**: Evaluated `user?.role === "teacher" ? "courses" : "learn"` before clearing session, landing teachers on their default courses catalog.

### 2.7. Critical Auth Registration Recovery Key Retention (`frontend/src/components/auth/AuthScreen.tsx`)
- **Bug (High Severity)**: After `ovaelApi.register()`, `await refresh()` was called immediately. In `OvaelApp.tsx`, non-null `user` immediately unmounted `AuthScreen` and mounted `LearnerWorkspace`. The user never saw or copied their one-time secret `recovery_key`.
- **Fix**:
  1. In `AuthScreen.tsx`, upon successful registration with `result.recovery_key`, the component retains the recovery card on screen and clears the password without immediately navigating away.
  2. Added an explicit confirmation action: `"I have saved my key — Continue"`.
  3. Clicking this action calls `handleContinueAfterRecovery`, clearing `recoveryKey` in state and calling `refresh()` to transition into the workspace.
  4. Added `recoveryKey` clearing to `handleModeSwitch` so keys do not leak when navigating between auth modes.
  5. The recovery key remains strictly in React component state; it is never written to browser storage or console logs.

### 2.8. Recovery Key Clipboard Fallback & Leak Prevention (`frontend/src/components/auth/AuthScreen.tsx`)
- **Bug**: `handleCopyRecovery` had an empty `catch` block with no fallback. If clipboard write failed, no feedback was provided. Additionally, `setTimeout` timers (850ms entrance timer and 2500ms copy feedback timer) leaked if the component unmounted.
- **Fix**:
  1. Implemented a fallback copying mechanism using a temporary offscreen `<textarea>` and `document.execCommand("copy")`.
  2. If automated copying fails completely, text in `.recovery-code` is programmatically selected and a visible fallback prompt (`"Please press Ctrl+C / Cmd+C to copy your key"`) is displayed in `.recovery-copy-hint`.
  3. Wrapped entrance timer and copy timer in `useRef` with full cleanup on unmount.

### 2.9. Accessibility & Markup Cleanup (`frontend/src/components/auth/AuthScreen.tsx`)
- **Cleanup**: Removed redundant `tabIndex={0}` on `button.password-toggle-btn`. Native `<button>` elements are natively focusable.

### 2.10. Entry File Reformatting (`frontend/src/main.tsx`)
- **Cleanup**: Formatted minified single-line `main.tsx` into clean, standard multi-line TypeScript. Zero runtime behavior change.

### 2.11. Hooks & Context Stabilization (`OvaelContext.tsx`, `TeachingContext.tsx`, `GapForensicsScreen.tsx`)
- **OvaelContext.tsx**: Added `user` to context relay effect dependency array; stabilized generation ref cleanup.
- **TeachingContext.tsx**: Wrapped `clearAnswer` and `accept` in `useCallback`; stabilized effect dependencies and copied `revision.current` into closure scope for cleanup.
- **GapForensicsScreen.tsx**: Copied `requestRevision` ref value into closure scope for safe cleanup without racing abort controllers.

---

## 3. API Layer & Dead Code Audit

### 3.1. API Layer Investigation (`src/api.ts` vs `src/api/client.ts`)
- **Finding**: Neither module is dead code.
  - `src/api.ts`: Low-level network transport module managing CSRF token rotation, 401 cookie refresh retries, JSON serialization, and error parsing. Directly imported by `TeachingContext`, `LearnScreen`, `CoursesScreen`, `HistoryScreen`, `ProofScreen`, etc.
  - `src/api/client.ts`: Strongly typed service client (`ovaelApi`) wrapping endpoints with schema models (`register`, `login`, `logout`, `causalGaps`, `materials`, etc.). Directly imported by `AuthScreen`, `TeacherWorkspace`, `SettingsScreen`, `GapForensicsScreen`, `OvaelContext`, etc.
- **Action**: Both modules retained as intended.

### 3.2. Dead Code Audit (CSS Selectors from `CSS_MAP.md`)
- Audited the 20 candidate selectors deferred from Step 2:
  - `.concept-chip`: **Active** in `frontend/src/components/learner/screens/MaterialsScreen.tsx:507`.
  - `.session-concept-name` / `.concept-chips-container`: Active in `HistoryScreen.tsx` and `TeacherWorkspace.tsx`.
  - Integration selectors (`.auth-intro`, `.auth-points`, `.auth-panel`, etc.): Audited and retained in `08-integration.css` to prevent unintended cascade shifts.

---

## 4. Test Verification Suite (`tests/bugfix-step3.test.cjs`)

Created `frontend/tests/bugfix-step3.test.cjs` matching `node --test tests/*.test.cjs`:

1. `safeStorage helper never throws when storage access throws, and uses memory fallback`:
   - Simulates a blocked environment where `window.localStorage` and `window.sessionStorage` throw `SecurityError`.
   - Validates that `setItem`, `getItem`, `removeItem`, and `clear` succeed without throwing and retain state via in-memory storage.
2. `theme resolution falls back to prefers-color-scheme when storage is unavailable or empty`:
   - Verifies fallback logic across light/dark stored preferences and OS `prefers-color-scheme` settings.
3. `recovery key remains available on screen after registration until explicitly dismissed`:
   - Verifies `handleSubmit` does not immediately invoke `refresh()` when `result.recovery_key` is present.
   - Verifies explicit continue button and dismissal logic.
   - Verifies `handleModeSwitch` clears the key.
   - Verifies clipboard fallback handling and copy feedback.

---

## 5. Visual Regression & Pixel Diff Results

Screenshots were captured across all 32 combinations into `docs/reviews/2026-10-bugfix/` and compared pixel-by-pixel against Step 2 (`docs/reviews/2026-10-css/after/`):

| Screen | Viewport | Theme | Diff Pixels | Mismatch % | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| `learner-connections` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `learner-connections` | Desktop | Light | 0 | **0.0000%** | PASS |
| `learner-connections` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `learner-connections` | Mobile | Light | 0 | **0.0000%** | PASS |
| `learner-courses` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `learner-courses` | Desktop | Light | 0 | **0.0000%** | PASS |
| `learner-courses` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `learner-courses` | Mobile | Light | 0 | **0.0000%** | PASS |
| `learner-materials` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `learner-materials` | Desktop | Light | 0 | **0.0000%** | PASS |
| `learner-materials` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `learner-materials` | Mobile | Light | 0 | **0.0000%** | PASS |
| `learner-progress` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `learner-progress` | Desktop | Light | 0 | **0.0000%** | PASS |
| `learner-progress` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `learner-progress` | Mobile | Light | 0 | **0.0000%** | PASS |
| `learner-settings` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `learner-settings` | Desktop | Light | 0 | **0.0000%** | PASS |
| `learner-settings` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `learner-settings` | Mobile | Light | 0 | **0.0000%** | PASS |
| `login-create` | Desktop | Dark | 0 | **0.0000%** | PASS |
| `login-create` | Desktop | Light | 0 | **0.0000%** | PASS |
| `login-create` | Mobile | Dark | 0 | **0.0000%** | PASS |
| `login-create` | Mobile | Light | 0 | **0.0000%** | PASS |
| `learner-chat` | Desktop | Light | 63 | 0.0049% | PASS (Blinking cursor) |
| `learner-chat` | Desktop | Dark | 79 | 0.0061% | PASS (Blinking cursor) |
| `learner-chat` | Mobile | Light | 1 | 0.0003% | PASS (Blinking cursor) |
| `learner-chat` | Mobile | Dark | 101 | 0.0307% | PASS (Blinking cursor) |
| `login-signin` | Desktop | Light | 217 | 0.0167% | PASS (Ambient network drift) |
| `login-signin` | Desktop | Dark | 117 | 0.0090% | PASS (Ambient network drift) |
| `login-signin` | Mobile | Light | 46 | 0.0094% | PASS (Ambient network drift) |
| `login-signin` | Mobile | Dark | 41 | 0.0084% | PASS (Ambient network drift) |

**Overall Mismatch**: **0.0000%** on all non-animated surfaces. Zero layout or styling regressions.
