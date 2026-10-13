import React, { useId } from 'react';

export interface ProgressionMotionVisualProps {
  /** Visual presentation variant */
  variant?: 'editorial' | 'compact';
  /** Optional custom CSS class */
  className?: string;
  /** Accessible description for conceptual illustration */
  ariaLabel?: string;
}

/**
 * OVAEL-X Signature Curved Learning-Path Illustration (PROGRESSION).
 *
 * Preserves the editorial curved pathway composition, charcoal outlines, warm
 * Recycled Cotton supporting track, and three geometric nodes at (40, 205),
 * (215, 75), and (330, 100).
 *
 * Coordinated Entrance Sequence (~1.06s total, runs once and settles):
 * 1. Base charcoal and Recycled Cotton track layers establish the calm pathway structure.
 * 2. Primary Electric Tangerine path (.auth-editorial-motif__trajectory) draws progressively
 *    from the origin node to the destination node via normalized stroke-dashoffset.
 * 3. A compact Electric Tangerine accent (.auth-editorial-motif__tracer) travels once along
 *    the exact cubic Bézier curve and docks coaxially at the destination node (330, 100).
 * 4. The three nodes (.auth-editorial-motif__anchor--origin, --inflection, --destination)
 *    activate sequentially in natural order as the path reaches each station.
 */
export const ProgressionMotionVisual: React.FC<ProgressionMotionVisualProps> = ({
  variant = 'editorial',
  className = '',
  ariaLabel = 'Geometric curved learning-path motif representing structured progression',
}) => {
  const uid = useId().replace(/:/g, '');
  const curvePath = 'M 40 205 C 110 205, 140 75, 215 75 C 275 75, 300 135, 330 100';

  return (
    <div
      className={`ovael-progression ovael-progression--${variant} ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 360 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="auth-editorial-motif-svg ovael-progression__svg"
        aria-hidden="true"
      >
        <defs>
          {/* Warm Recycled Cotton (#F5E7C6) Channel Bed */}
          <linearGradient id={`progBed-${uid}`} x1="40" y1="215" x2="330" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="55%" stopColor="#EFE0BC" />
            <stop offset="100%" stopColor="#F5E7C6" />
          </linearGradient>

          {/* Subtle Lower Depth Rim */}
          <linearGradient id={`progWall-${uid}`} x1="40" y1="220" x2="330" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#222222" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#FF6D1F" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF6D1F" stopOpacity="0.7" />
          </linearGradient>

          {/* Primary Progressive Orange Trajectory Gradient */}
          <linearGradient id={`editorialGrad-${uid}`} x1="40" y1="205" x2="330" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#222222" />
            <stop offset="28%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#FF6D1F" />
          </linearGradient>

          {/* Studio-Lit Travelling Accent Sphere */}
          <radialGradient id={`progSphere-${uid}`} cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="48%" stopColor="#FAF3E1" />
            <stop offset="100%" stopColor="#E5D5B2" />
          </radialGradient>

          {/* Destination Plinth Cap */}
          <radialGradient id={`progTangerineCap-${uid}`} cx="36%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FF8542" />
            <stop offset="55%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </radialGradient>
        </defs>

        {/* 1. Delicate Architectural Registration Crosshairs & Baselines */}
        <g opacity="0.35" stroke="rgba(34, 34, 34, 0.25)" strokeWidth="1" className="auth-editorial-motif__grid ovael-progression__grid">
          <path d="M 36 40 H 44 M 40 36 V 44" />
          <path d="M 316 240 H 324 M 320 236 V 244" />
          <line x1="40" y1="250" x2="320" y2="250" strokeDasharray="3 6" stroke="rgba(34, 34, 34, 0.14)" />
          <line x1="40" y1="216" x2="40" y2="250" strokeDasharray="2 3" stroke="rgba(34, 34, 34, 0.16)" />
          <line x1="215" y1="90" x2="215" y2="250" strokeDasharray="2 4" stroke="rgba(34, 34, 34, 0.12)" />
          <line x1="330" y1="116" x2="330" y2="250" strokeDasharray="2 3" stroke="rgba(34, 34, 34, 0.16)" />
        </g>

        {/* 2. Secondary Supporting Echo Contour (Recycled Cotton & Charcoal hairline) */}
        <path
          className="auth-editorial-motif__echo"
          d="M 45 225 C 115 225, 145 115, 215 115 C 265 115, 295 155, 325 140"
          stroke="rgba(34, 34, 34, 0.16)"
          strokeWidth="1.25"
          strokeDasharray="4 6"
        />

        {/* 3. Static Supporting Track Layers (Charcoal Outline + Warm Recycled Cotton Bed) */}
        {/* Soft contact shadow beneath the track */}
        <path
          d="M 40 212 C 110 212, 140 82, 215 82 C 275 82, 300 142, 330 107"
          stroke="rgba(34, 34, 34, 0.06)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Lower bevel accent */}
        <path
          d="M 40 208 C 110 208, 140 78, 215 78 C 275 78, 300 138, 330 103"
          stroke={`url(#progWall-${uid})`}
          strokeWidth="13.5"
          strokeLinecap="round"
          className="ovael-progression__wall"
        />
        {/* Charcoal structural track outline (#222222) */}
        <path
          d={curvePath}
          stroke="#222222"
          strokeWidth="14"
          strokeLinecap="round"
          strokeOpacity="0.86"
        />
        {/* Warm Recycled Cotton (#F5E7C6) inner track bed */}
        <path
          d={curvePath}
          stroke={`url(#progBed-${uid})`}
          strokeWidth="11.5"
          strokeLinecap="round"
          className="ovael-progression__bed"
        />
        {/* Subtle static guide groove */}
        <path
          d={curvePath}
          stroke="rgba(34, 34, 34, 0.18)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />

        {/* 4. Primary Animated Orange Path (Draws progressively from origin node to final node) */}
        <path
          id={`learningPathCurve-${uid}`}
          className="auth-editorial-motif__trajectory ovael-progression__rail"
          d={curvePath}
          stroke={`url(#editorialGrad-${uid})`}
          strokeWidth="3.25"
          strokeLinecap="round"
          pathLength="100"
        />

        {/* 5. Node 1: Origin Station (40, 205) — Activates first as path begins */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--origin">
          <ellipse cx="40" cy="208" rx="11.5" ry="8" fill="rgba(34, 34, 34, 0.12)" />
          <circle cx="40" cy="205" r="10" fill="#F5E7C6" stroke="#222222" strokeWidth="1.4" />
          <circle cx="40" cy="205" r="5.5" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
          <circle cx="40" cy="205" r="2.2" fill="#222222" className="ovael-progression__node-core ovael-progression__node-core--origin" />
        </g>

        {/* 6. Node 2: Inflection Diamond Node (215, 75) — Activates second as orange path reaches curve apex */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--inflection" transform="translate(215, 75)">
          <ellipse cx="0" cy="2.5" rx="10.5" ry="7" fill="rgba(34, 34, 34, 0.12)" />
          <rect
            x="-7.5"
            y="-7.5"
            width="15"
            height="15"
            rx="3"
            fill="#FAF3E1"
            stroke="#222222"
            strokeWidth="1.4"
            transform="rotate(45)"
          />
          <rect
            x="-3.8"
            y="-3.8"
            width="7.6"
            height="7.6"
            rx="1.2"
            fill="#FF6D1F"
            stroke="#222222"
            strokeWidth="1"
            transform="rotate(45)"
            className="ovael-progression__node-core ovael-progression__node-core--inflection"
          />
          <circle cx="0" cy="0" r="1.5" fill="#FAF3E1" />
        </g>

        {/* 7. Node 3: Destination Focal Node (330, 100) — Activates third as path and orange accent arrive */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--destination" transform="translate(330, 100)">
          <circle
            r="16"
            fill="none"
            stroke="#FF6D1F"
            strokeWidth="1.1"
            strokeDasharray="2.5 3.5"
            opacity="0.5"
            className="ovael-progression__dest-ring"
          />
          <ellipse cx="0" cy="3" rx="13" ry="9" fill="rgba(34, 34, 34, 0.15)" />
          <circle cx="0" cy="0" r="11.5" fill={`url(#progTangerineCap-${uid})`} stroke="#222222" strokeWidth="1.4" />
          <circle cx="0" cy="0" r="6.8" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
          <circle cx="0" cy="0" r="2.8" fill="#FF6D1F" className="ovael-progression__node-core ovael-progression__node-core--destination" />
        </g>

        {/* 8. Travelling Electric Tangerine Accent (Follows exact curve once and settles coaxially at 330, 100) */}
        <g className="auth-editorial-motif__tracer ovael-progression__sphere-rig" aria-hidden="true">
          {/* Subtle contact shadow on track */}
          <ellipse
            cx="1"
            cy="2.8"
            rx="6"
            ry="3.6"
            fill="rgba(34, 34, 34, 0.18)"
            className="ovael-progression__sphere-shadow"
          />
          {/* Crisp Linen Collar */}
          <circle
            cx="0"
            cy="0"
            r="5.6"
            fill={`url(#progSphere-${uid})`}
            stroke="#222222"
            strokeWidth="1.25"
          />
          {/* Rotating Inner Seam & Electric Tangerine Core */}
          <g className="ovael-progression__sphere-roll">
            <circle cx="0" cy="0" r="2.8" fill="#FF6D1F" />
            <circle cx="-1.4" cy="-1.4" r="1" fill="#FAF3E1" fillOpacity="0.9" />
          </g>
        </g>
      </svg>
    </div>
  );
};
