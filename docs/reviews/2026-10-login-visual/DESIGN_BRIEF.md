# OVAEL-X Sign-In & Create Account Visual Redesign Brief

**Design Step**: Step 5 of 10  
**Target Surface**: Authentication Shell (`AuthScreen.tsx`, `AuthVisualAccent.tsx`, `03a-auth-core.css`, `03b-auth-showcase.css`)  
**Design Role**: Senior Product Designer-Engineer  
**Scope**: Layout hierarchy, typography, form controls, accent column composition, brand palette integration, WCAG AAA/AA contrast parity, responsive ergonomics.

---

## 1. Problems Observed in the Baseline

From inspecting `docs/reviews/2026-10-baseline/` (`login-signin-*` and `login-create-*`) across viewports and themes:

1. **Unbalanced Visual Weight**:
   - In light mode, the stark dark navy (`#303C6C`) accent column dominates visual attention, pulling the user's eye away from the primary sign-in form.
   - The form column felt under-anchored, with floating inputs lacking crisp architectural boundaries.
2. **Segmented Mode Switcher Lacks Tactile Elevation**:
   - The tab selector (`Sign In` vs `Create Account`) resembled flat pill text rather than an authoritative, tactile segmented control with clear depth and active indicator state.
3. **Accent Artwork Needed Clearer Purpose**:
   - While visually neat, the vector graphic was generic isometric geometry rather than an explicit visual narrative of OVAEL-X's core value proposition: **Sources $\rightarrow$ Causal Gaps $\rightarrow$ Memory**.
   - The feature pills floated above the SVG without visual anchor lines tying them directly into the underlying knowledge graph structure.
4. **Dark Mode Cohesion & Contrast**:
   - In dark mode, `.auth-card-container` utilized an uncalibrated `#171b2e` container with heavy box-shadow that washed out against `#101522` page canvas.
   - Input borders and placeholder text had marginal contrast in dim ambient lighting conditions.
5. **Mobile Ergonomics**:
   - On mobile (`390x844` and `320x640`), the visual accent was abruptly hidden (`display: none`), losing brand identity on mobile devices.
   - Vertical padding pushed the primary submit button close to the bottom viewport fold.
6. **Developer Tools Prominence**:
   - The synthetic demo credentials button (`Fill synthetic demo credentials`) was visually competing with primary form actions. It needs to remain clearly secondary and unobtrusive.

---

## 2. Chosen Design Direction: "Calm, Evidence-Grounded Focus"

OVAEL-X is an evidence-led adaptive learning platform, not a gamified or high-pressure consumer app. The sign-in and account creation experience should instill:
- **Calm Authority**: Structured, intentional typography with spacious line heights and predictable landmarks.
- **Evidence-Led Precision**: Crisp mathematical borders, subtle metric badges, and clear isometric knowledge structures.
- **Trust & Integrity**: Direct, factual privacy disclosures (verified against the codebase: Argon2id hashing and local-first memory).

---

## 3. Layout Grid & Proportions

### Desktop (`>= 1024px`)
- **Container Max-Width**: `1020px` (comfortably contained within 1280x720 and 1440x900).
- **Two-Column Split**: `1.15fr : 0.85fr` (~57% Form Column, ~43% Accent Column).
- **Form Column Max-Width**: `480px` centered content width for ideal line length and form scanability.
- **Padding**: `clamp(32px, 3.5vw, 48px)` outer breathing room.

### Tablet (`768px – 1023px`)
- Stacked layout with a compact, elegant accent summary header (`padding: 28px 32px`).
- Form card centered at max-width `540px`.

### Mobile (`<= 520px` down to `320px`)
- `min-height: 100dvh` (with `100svh` and `100vh` fallbacks) preventing mobile browser URL-bar jumpiness.
- Accent column collapses into a high-density, branded top header strip with the mini-brand mark, keeping the entire Sign In form fully above the fold on `390x844` screens.
- Zero horizontal overflow (`document.documentElement.scrollWidth <= clientWidth`).

---

## 4. Typography Scale

The typographic hierarchy utilizes system fonts with deliberate weight, letter-spacing, and line-height calibration:

| Role | Size | Weight | Line Height | Tracking | Token / Color |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Brand Wordmark** | `15px` | 800 | 1.0 | `0.04em` | `--text-heading` |
| **Eyebrow** | `11px` | 700 | 1.2 | `0.08em` | `--brand-coral-strong` / `--brand-coral` |
| **Heading 1 (Title)** | `28px` | 800 | 1.2 | `-0.025em` | `--text-heading` |
| **Subtitle** | `14px` | 400 | 1.55 | `-0.005em` | `--text-secondary` |
| **Segmented Tabs** | `13px` | 600 | 1.0 | `0.01em` | `--text-primary` (active: `--brand-yellow`) |
| **Field Labels** | `13px` | 600 | 1.3 | `0.005em` | `--text-primary` |
| **Input Text** | `14px` | 500 | 1.4 | `0.0em` | `--text-primary` |
| **Placeholder** | `14px` | 400 | 1.4 | `0.0em` | `--input-placeholder` (calibrated $\ge$ 4.5:1) |
| **Button Text** | `14px` | 700 | 1.0 | `0.01em` | `--btn-primary-text` |
| **Security Note** | `12px` | 450 | 1.45 | `0.005em` | `--text-secondary` |

---

## 5. Color Roles & Theme Parity

Using OVAEL-X's calibrated 5-color palette:
- Navy: `#1E2544` / `#303C6C`
- Coral: `#F4976C` / `#C85A28`
- Warm Yellow: `#FBE8A6`
- Soft Blue: `#B4DFE5`
- Pale Cyan: `#D2FDFF`

### Light Theme
- **Page Canvas**: `--bg-page` (`#F6F9FB`) with soft radial ambient glow (`#D2FDFF` tint).
- **Card Surface**: `--bg-surface` (`#FFFFFF`), border `#CBD8E3`, layered shadow.
- **Accent Column**: Deep Navy (`#1E2544`) with glowing border and subtle frosted glass highlights.
- **Controls**: Inputs on white background with `--border-default` (`#CBD8E3`), focusing to `--brand-coral` with soft focus ring.

### Dark Theme
- **Page Canvas**: `--bg-page` (`#101522`) with deep ambient navy gradients.
- **Card Surface**: `--bg-surface` (`#171D2D`), border `rgba(180, 223, 229, 0.14)`.
- **Accent Column**: Cohesive deep indigo-navy (`#141928`) with soft cyan edge lighting.
- **Controls**: Elevated inputs (`#1A2234`), border `#334158`, crisp white/ice text (`#EEF2F8`).

---

## 6. The Accent Scene: "Knowledge Synthesis"

The static SVG artwork in `AuthVisualAccent.tsx` is structured around three core pillars:
1. **Sources (Left Node & Feed)**: Grounded learning materials (textbooks, slides, notes) entering the knowledge plane. Soft blue (`#B4DFE5`) and pale cyan (`#D2FDFF`) vectors.
2. **Gaps (Center & Coral Highlight)**: Forensic gap diagnostics pinpointing causal blockers and misconception paths. Warm coral (`#F4976C`) and yellow (`#FBE8A6`) core pulse.
3. **Memory (Right & Upper Retention Arc)**: Spaced retrieval and procedural memory consolidation under learner control. Concentric retention rings and cyan stabilization anchors.

The feature pills (`sources`, `gaps`, `memory`) seamlessly trigger `data-active-feature` in the SVG, spotlighting each subsystem without shifting layout.

---

## 7. Trust Cues & Verified Code Claims

- **Privacy Statement**: *"Your learning data is privacy-first, secured with Argon2id credentials, and stored in local-first memory."*
- **Backend Code Verification**:
  - `backend/src/adaptive_backend/auth.py`: `from argon2 import PasswordHasher`, Argon2id password and recovery key hashing.
  - `backend/src/adaptive_backend/teaching.py`: `memory_mode: str = "local_first"` with transcript withholding and `lf:{user_id}:{session_id}` scoped persistence.
- **No False Claims**: Zero vanity badges, fake testimonials, or unsubstantiated user metrics.
