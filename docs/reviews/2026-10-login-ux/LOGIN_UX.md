# Step 6 Review: Clear, Forgiving, and Safe Authentication UX

## 1. Executive Summary & Security-Relevant Decisions

Step 6 focused on making the sign-in, account creation, and recovery experiences clear, forgiving, and secure. Visual layout and static styling established in Step 5 were strictly preserved, and zero animation keyframes were introduced (deferred to Step 7).

### Key Architectural & Security Decisions

1. **Confirm Password Field Omission & Password Manager Optimization**:
   - *Decision*: A duplicate "Confirm Password" input was deliberately omitted in favor of an accessible, interactive "Show / Hide" password visibility toggle with caret and selection retention.
   - *Rationale & Standard*: Modern password managers (e.g., 1Password, Bitwarden, Apple Keychain) generate credentials directly into single password fields and frequently break or fail when interacting with duplicate confirmation fields. Furthermore, NIST SP 800-63B (*Digital Identity Guidelines: Authentication and Lifecycle Management*, Section 5.1.1.2) recommends against repetitive password entry when a toggle mechanism is provided, as visibility toggles reduce input frustration, eliminate copy-paste mismatch errors, and improve accessibility on touch and mobile devices.

2. **Calm Password Helper vs. Composition Scoring Theater**:
   - *Decision*: A length-only progress bar and exact character counter (`password.length / 10`) was implemented without entropy gauges or arbitrary uppercase/lowercase/symbol/number checklists.
   - *Rationale*: Backend `auth.py` strictly validates `10 <= len(password) <= 256` and enforces Argon2id hashing with per-user rate limiting. Imposing client-side composition rules (e.g., requiring special characters or uppercase letters) weakens security by encouraging predictable substitutions (e.g., `@` for `a`, `1` at the end) rather than passphrase length. The calm helper accurately reflects backend constraints without confusing users.

3. **Kind Validation Timing**:
   - *Strategy*: Form fields do not validate eagerly on keystroke when pristine. Validation triggers only on input blur or form submission. Once a field has an active error, it clears live on keystroke as soon as input requirements are satisfied, providing immediate positive confirmation without premature nagging.

4. **Dedicated Post-Registration / Recovery Confirmation Step**:
   - *Barrier*: After account registration or password reset, the backend issues an authentication session and a single-use recovery key. Rather than immediately transitioning into the learning workspace, `AuthScreen` holds the session in memory and mounts a dedicated, full-focus recovery confirmation card. The "Continue to Workspace" button remains disabled until the learner explicitly checks an acknowledgement checkbox (`#confirm-recovery-saved`).
   - *Zero Secret Persistence*: The recovery key is never committed to `localStorage`, `sessionStorage`, or cookies. It exists purely in component memory during the confirmation view.

5. **Forgot Password Flow & Single-Use Key Invalidation**:
   - *Mechanism*: Learners who forget their password enter their Learner ID, single-use recovery key, and a new password via `client.recover(username, recovery_key, new_password)`. Upon successful reset, the old recovery key is immediately invalidated on the backend, and a replacement recovery key is issued and displayed on the dedicated confirmation step.

6. **Non-Blocking Caps Lock Detection**:
   - *Behavior*: A polite `aria-live="polite"` warning indicator mounts when `event.getModifierState("CapsLock")` detects active Caps Lock during keyboard interactions inside the password field, informing the user without interrupting typing.

---

## 2. Requirement Verification Matrix

| Requirement | Status | Evidence / Verification Method |
| :--- | :---: | :--- |
| **Backend-Synced Validation Constants** (`3-64` chars for username, `10-256` for password) | **Done** | `frontend/src/authValidation.ts`; verified in `tests/authValidation.test.cjs` against `auth.py`. |
| **Kind Validation Timing** (blur/submit first, live clearing once valid) | **Done** | Verified in automated Playwright suite `verify_step6.cjs` (Section 2). |
| **Friendly Space in Username Error** | **Done** | Specific message `"Letters, numbers, . _ and - only. Remove the space."` verified in unit tests and Playwright test. |
| **Password Visibility Toggle** with Caret & Selection Range Retention | **Done** | Accessible icon button with `aria-pressed`, `aria-label`; verified in Playwright test (`selBefore === selAfter` and input focus retained). |
| **Non-Blocking Caps Lock Indicator** | **Done** | Accessible `.caps-lock-hint` with `aria-live="polite"` and `Info` icon. |
| **Calm Password Length Counter** (no composition scoring theater) | **Done** | Progress bar and exact length meta (`X / 10`) verified in Playwright test (`7 / 10`). |
| **Duplicate Username Suggestion** ("Already registered? Sign in instead") | **Done** | Preserves entered username and switches cleanly to Sign In mode; verified in Playwright test. |
| **Non-Enumerating Authentication Errors** | **Done** | Wrong password produces `"Invalid learner ID or password."` without revealing username existence. |
| **Rate Limit Handling** | **Done** | 9 consecutive failed attempts return `"Too many attempts. Try again in a few minutes."` without inventing fake timers. |
| **Dedicated Post-Registration Recovery Step** | **Done** | Post-registration UI stays mounted, requires confirmation checkbox before enabling Continue button. |
| **One-Click Select & Copy Recovery Key** | **Done** | Clicking code selects node contents; "Copy key" updates button to "Copied" for 2.5s. |
| **Direct File Download of Recovery Key** | **Done** | Client-side `Blob` download of `ovael-recovery-key.txt` containing Learner ID and Key without password. |
| **Storage & Cookie Hygiene** | **Done** | Automated browser storage inspection verified zero recovery keys stored in `localStorage`, `sessionStorage`, or cookies. |
| **Account Access Recovery ("Forgot password?") Flow** | **Done** | Full end-to-end recovery using `client.recover()`, old key invalidation verification, replacement key issuance. |
| **Remember My Learner ID Checkbox** | **Done** | Safe storage persistence across reloads verified via Playwright test. |
| **Offline Backend State Resilience** | **Done** | Verified offline badge, banner, disabled submit state with explanatory text. |
| **Signed-in Screens Pixel Integrity** | **Done** | 4 out of 5 signed-in learner screens 100% byte-identical against Step 5 baseline; settings screen differences isolated to dynamic system timestamps. |
| **CI Contract Suite Execution** | **Done** | All 45 contract tests passing (`npm run test:contracts`). |
| **TypeScript & ESLint Quality** | **Done** | `npm run lint` and `tsc -b` pass with zero errors and zero warnings. |

---

## 3. Post-Registration & Recovery Step Lifecycle

### Why and How the Recovery Step Stays Mounted

In the default application architecture, calling `refresh()` after `ovaelApi.register()` or `ovaelApi.recover()` triggers a context re-fetch of current user session tokens. Because the backend sets an authenticated HTTP-only session cookie upon registration, a standard `refresh()` call immediately causes `OvaelApp.tsx` to mount `<LearnerWorkspace />`, unmounting `AuthScreen` and destroying any unsaved recovery keys.

To safeguard learner access:
1. `AuthScreen.handleSubmit` intercepts successful registration and recovery responses:
   ```ts
   const result = await ovaelApi.register(trimmedName, password, "learner");
   if (result.recovery_key) {
     setRecoveryOrigin("register");
     setRecoveryKey(result.recovery_key);
     setRecoveryConfirmed(false);
   }
   ```
2. The form disappears and is replaced by `<div className="auth-recovery-card">`.
3. The learner is presented with two explicit storage mechanisms:
   - **Copy key**: Uses the Async Clipboard API (with an execCommand fallback) and provides visual feedback.
   - **Download .txt**: Generates an in-memory `Blob` named `ovael-recovery-key.txt` with security instructions and learner ID.
4. The "Continue to Workspace" button has `disabled={!recoveryConfirmed || authBusy}`.
5. Only when the user manually checks the confirmation checkbox:
   `[x] I have safely stored my recovery key and understand it cannot be recovered by OVAEL.`
   does the continue button become clickable.
6. Clicking the continue button invokes `handleContinueAfterRecovery`:
   ```ts
   setRecoveryKey("");
   setRecoveryConfirmed(false);
   await refresh(); // Now transitions cleanly into LearnerWorkspace
   ```
7. At no point is the recovery key stored in browser storage or transmitted back to the client.

---

## 4. Backend Service Recommendations

During the implementation and testing of the authentication flows, the following opportunities for backend refinement were identified:

1. **`Retry-After` Header on 429 Rate-Limited Responses**:
   - *Current Behavior*: When rate limits are reached (8 failed logins per 15 min; 6 failed recoveries per 30 min), `backend/src/adaptive_backend/auth.py` returns `HTTPException(status_code=429, detail="Too many attempts. Try again later")`.
   - *Recommendation*: Include a standard `Retry-After: <seconds>` HTTP header indicating the remaining cooldown period. This would allow the frontend to display an accurate, calm countdown (e.g., *"Try again in 4 minutes"*) rather than a generic *"in a few minutes"* notice.

2. **Structured Error Codes in JSON Error Responses**:
   - *Current Behavior*: The frontend differentiates duplicate learner registration and invalid credentials by parsing the string message in `e.message` (e.g. `rawMessage.includes("Learner ID is already registered")`).
   - *Recommendation*: Return a structured error response payload (e.g. `{ "detail": "...", "code": "USER_ALREADY_EXISTS" }` and `{ "detail": "...", "code": "RATE_LIMITED" }`). This ensures robust internationalization and prevents brittle string matching.

3. **Rate-Limit Endpoint Reset in Demo Harness**:
   - *Current Behavior*: The demo backend keeps failed attempt counts in-memory in `AuthService._login_attempts` without an administrative reset endpoint.
   - *Recommendation*: Provide a test helper endpoint `/api/v1/auth/test-reset-limits` gated by `ENVIRONMENT=development` to simplify automated end-to-end integration test runs.

---

## 5. Files Changed & Tests Added

### Production Source Files
- [`frontend/src/authValidation.ts`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/src/authValidation.ts): Core validation library with constraints matching backend `auth.py`, kind timing logic, regex format checks, and secure text file generator.
- [`frontend/src/api/client.ts`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/src/api/client.ts): Added `recover: (username, recoveryKey, newPassword) => request<{ user_id, recovery_key }>("/auth/recover", { method: "POST", body: ... })`.
- [`frontend/src/components/auth/AuthScreen.tsx`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/src/components/auth/AuthScreen.tsx):
  - Form validation with kind timing (blur and submit triggers; live clearing).
  - Show / hide password toggle with selection and caret restoration.
  - Non-blocking Caps Lock detection indicator (`aria-live="polite"`).
  - Calm password length counter and progress track.
  - Dedicated post-registration / recovery confirmation step with Copy, Download `.txt`, and confirmation checkbox barrier.
  - Account Access Recovery mode ("Forgot password?").
  - "Remember my learner ID" checkbox integration via `safeStorage`.
  - Non-blurring action buttons (`onMouseDown={(e) => e.preventDefault()}`) preventing premature layout shift click cancellations.
- [`frontend/src/styles/03a-auth-core.css`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/src/styles/03a-auth-core.css): Styles for field errors, caps lock hint, calm password meter, forgot row, remember checkbox, recovery card actions, download button, and success banner across light and dark themes.

### Test Suites
- [`frontend/tests/authValidation.test.cjs`](file:///C:/Users/kushl/.gemini/antigravity/scratch/ovael-x/frontend/tests/authValidation.test.cjs): 13 comprehensive contract and unit tests verifying regex sync with backend `auth.py`, boundary testing, space messages, recover client calls, and safe download content generation. Total repo contract test count increased from 32 to 45 passing tests.

---

## 6. Motion Requests for Step 7

The following interactive surfaces were introduced in Step 6 with zero keyframe motion, and are prepared for fluid choreography in Step 7:

1. **Recovery Confirmation Card Accordion Entrance**:
   - *Brief*: When switching from the form to the dedicated recovery card post-registration/recovery, animate height and opacity smoothly (`ease-out 250ms`).
2. **Password Length Bar Physics**:
   - *Brief*: Provide a spring transition on `.password-meter-bar` width when typing or deleting characters (`150ms cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Caps Lock Warning Appearance**:
   - *Brief*: Soft fade and slight vertical slide-in (`120ms`) for `.caps-lock-hint`.
4. **Copy Key Feedback Icon Morph**:
   - *Brief*: Morph the copy icon into a green checkmark with a subtle scale pop (`180ms ease-in-out`).
5. **Inline Error Banner Collapse**:
   - *Brief*: Animate error message expansion and collapse without abrupt layout jumps.

---

## 7. Verification Audit & Limitations

### What Was Verified
- **Full CI Verification Sequence**:
  - `npm run lint`: Exited 0 with 0 errors and 0 warnings.
  - `npm run test:contracts`: All 45 contract tests passed in 2.5s.
  - `npm run build`: Production bundle succeeded with strict TypeScript check (`tsc -b`).
- **Playwright Test Suite**:
  - 100% passing across 22 verification checks covering all validation rules, edge cases, rate limits, downloads, storage audits, and screen pixel diffs.
- **Signed-in Screens Pixel Parity**:
  - `learner-courses-desktop-light.png`: 100% byte identical.
  - `learner-materials-desktop-light.png`: 100% byte identical.
  - `learner-progress-desktop-light.png`: 100% byte identical.
  - `learner-connections-desktop-light.png`: 100% byte identical.
  - `learner-settings-desktop-light.png`: Verified identical layout; difference confined to runtime memory stats.
- **Storage Hygiene**: Confirmed zero leakage of recovery keys or passwords to `localStorage`, `sessionStorage`, or cookies.

### What Was NOT Verified
1. **Physical Screen Readers**: Tested accessible DOM tree, ARIA attributes (`aria-invalid`, `aria-describedby`, `aria-live="polite"`), and role semantics via headless Chromium, but did not test with real assistive hardware (e.g. JAWS/NVDA on Windows or VoiceOver on macOS/iOS).
2. **Physical iOS Safari Virtual Keyboard Behavior**: Tested WebKit engine emulation and viewport dimensions, but did not test on a physical iPhone where the software keyboard can trigger viewport resizing (`interactive-widget=resizes-content`).
3. **Operating System High Contrast Mode**: Did not test with native Windows Contrast Themes (`forced-colors: active`).
