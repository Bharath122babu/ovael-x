# OVAEL-X Motion Graphics & Microinteraction System

## 1. Core Principles

The OVAEL-X motion system provides a refined, calm, and technologically sophisticated interaction layer designed specifically for an adaptive AI learning environment.

1. **Purpose before Decoration**: Animations communicate state changes, spatial hierarchy, and confirmation—never distracting from instructional content.
2. **Instant Feedback**: User interactions (clicks, taps, toggles) receive immediate `<150ms` tactile response.
3. **Restrained Fluidity**: Entrances glide subtly over `200ms–350ms` using decelerating cubic beziers. Overshoot and bounce are reserved exclusively for compact status tags (`--ease-spring`).
4. **Stable Layouts**: Animations utilize GPU-accelerated `opacity` and `transform` properties. Layout shifts (`height`, `width`, `margin`) are forbidden during active animation loops.
5. **Instructional Integrity**: Animations never manufacture or animate academic scores, test outcomes, or AI reasoning. Visual state strictly reflects confirmed backend evidence.

---

## 2. Motion Token Architecture

Centralized CSS variables in `frontend/src/style.css` and JavaScript exports in `frontend/src/components/content/MotionPrimitives.tsx`:

### Durations

| Token | Duration | Semantic Usage |
|---|---|---|
| `--duration-instant` | `100ms` | Checkbox toggles, radio clicks, `:active` button scale press |
| `--duration-fast` | `150ms` | Button hovers, dropdown items, tooltips, tab hover states |
| `--duration-base` | `200ms` | Active navigation pill transitions, form focus rings, toast messages |
| `--duration-moderate`| `250ms` | Collapsible accordions, drawer transitions, modal backdrops |
| `--duration-panel` | `300ms` | Mobile side-rail slide, full slide-out panels |
| `--duration-entrance`| `350ms` | Screen content reveals (`PageTransition`), header glides |
| `--duration-slow` | `450ms` | Radial gauge stroke fills, large data graph initial renders |

### Easing Curves

| Token | Curve | Context |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default balanced motion for controls |
| `--ease-out` | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` | Natural deceleration for appearing elements |
| `--ease-in` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Exiting elements leaving the viewport |
| `--ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.15)` | Subtle elastic snap for badges, counters, and chips |
| `--ease-linear` | `linear` | Continuous spinners and loading shimmers |

---

## 3. Shared Motion Primitives (`MotionPrimitives.tsx`)

| Component | Props | Purpose |
|---|---|---|
| `PageTransition` | `children, className` | Wraps learner and teacher screen components; non-blocking entrance. |
| `FadeIn` | `children, delay, duration` | Gentle opacity fade for secondary panels. |
| `SlideIn` | `children, direction, delay` | Directional translate (`up`, `down`, `left`, `right`) + fade. |
| `StaggerContainer` & `StaggerItem` | `children, index` | Sequential list reveal capped to max 6 items to prevent sluggishness. |
| `ScrollReveal` | `children, delay` | Viewport entry reveal via `IntersectionObserver`. |
| `ExpandableSection` | `isOpen, children` | Smooth CSS Grid `grid-template-rows: 0fr -> 1fr` accordion. |
| `AnimatedProgressBar` | `value, max, variant` | Smooth horizontal bar fill with brand colors (`navy`, `coral`, `yellow`, `soft-blue`). |
| `RadialGauge` | `value, max, size, variant` | SVG circular gauge animating `stroke-dashoffset`. |
| `PulseIndicator` | `variant, size` | Live telemetry indicator (`active`, `warning`, `error`, `syncing`). |
| `SkeletonLoader` | `width, height, borderRadius` | Content placeholder with shimmering linear-gradient. |
| `InteractiveCard` | `children, onClick, selected` | Surface with hover lift (`translateY(-2px)`), active press, and focus ring. |
| `StatusBadge` | `status, label` | Accessible indicator with colored dot and semantic label. |

---

## 4. Accessibility & Reduced Motion Standards

OVAEL-X enforces strict accessibility compliance under WCAG 2.2 Criterion 2.2.2 (Pause, Stop, Hide) and Criterion 2.3.3 (Animation from Interactions).

### Dual-Layer Synchronization

The `usePrefersReducedMotion()` hook listens reactively to:
1. **Operating System Settings**: `window.matchMedia("(prefers-reduced-motion: reduce)")`
2. **In-App Accessibility Toggle**: `.reduce-motion` root class toggled via Settings (`SettingsScreen.tsx`), monitored through a DOM `MutationObserver`.

### Reduced Motion Rules

When reduced motion is preferred:
- All transitions and animation durations drop to `0.001ms`.
- Positional transforms (`translateY`, `scale`) are disabled.
- Shimmers and infinite pulses are frozen to solid static indicators.
- Essential state indicators (color shifts, borders, text labels) remain immediately visible.
- Full keyboard navigation, focus indicators, and screen reader announcements remain 100% active.

---

## 5. Anti-Patterns (Forbidden)

- **Never** block page navigation or delay user actions while an exit animation plays out.
- **Never** animate fabricated scores or synthetic performance gains.
- **Never** animate layout properties (`top`, `left`, `width`, `height`, `margin`, `padding`) on repeated frames.
- **Never** add continuous floating, 3D tilt, or particle effects across reading surfaces.
