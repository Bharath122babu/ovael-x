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
 * Single source of truth for the learning-track node coordinates and cubic Bézier curve.
 * - Origin: (40, 205) — curve start point
 * - Inflection: (215, 75) — exact C1 junction between the first and second cubic Bézier segments
 * - Destination: (330, 100) — curve endpoint
 */
const TRACK_NODES = {
  origin: { x: 40, y: 205 },
  inflection: { x: 215, y: 75 },
  destination: { x: 330, y: 100 },
} as const;

const CURVE_PATH = `M ${TRACK_NODES.origin.x} ${TRACK_NODES.origin.y} C 110 205, 140 75, ${TRACK_NODES.inflection.x} ${TRACK_NODES.inflection.y} C 275 75, 300 135, ${TRACK_NODES.destination.x} ${TRACK_NODES.destination.y}`;

/**
 * OVAEL-X Signature Curved Learning-Path Illustration (PROGRESSION).
 *
 * Geometry & Alignment Architecture:
 * - Every track layer (shadow, lower bevel, charcoal outline, Recycled Cotton bed,
 *   centerline groove, and animated orange trajectory) references `CURVE_PATH`.
 * - Each of the three nodes uses a strict two-group hierarchy:
 *   1. Outer `<g transform="translate(x y)">` positions the node on the curve centerline
 *      and is never animated by CSS.
 *   2. Inner `<g className="auth-editorial-motif__anchor ...">` handles subtle opacity
 *      and scale activation around local `(0, 0)`.
 * - The traveling orange marker uses SVG-native `<animateMotion>` with `<mpath>`
 *   referencing the trajectory `<path id={curveId}>`, guaranteeing exact SVG
 *   coordinate-space alignment across all viewport sizes.
 */
export const ProgressionMotionVisual: React.FC<ProgressionMotionVisualProps> = ({
  variant = 'editorial',
  className = '',
  ariaLabel = 'Geometric curved learning-path motif representing structured progression',
}) => {
  const uid = useId().replace(/:/g, '');
  const curveId = `learningPathCurve-${uid}`;

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
          <linearGradient
            id={`progBed-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="55%" stopColor="#EFE0BC" />
            <stop offset="100%" stopColor="#F5E7C6" />
          </linearGradient>

          {/* Subtle Lower Depth Rim */}
          <linearGradient
            id={`progWall-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#222222" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#FF6D1F" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF6D1F" stopOpacity="0.68" />
          </linearGradient>

          {/* Primary Progressive Orange Trajectory Gradient */}
          <linearGradient
            id={`editorialGrad-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF6D1F" />
            <stop offset="50%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#E55B10" />
          </linearGradient>

          {/* Studio-Lit Travelling Accent Collar */}
          <radialGradient id={`progSphere-${uid}`} cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#FAF3E1" />
            <stop offset="100%" stopColor="#E5D5B2" />
          </radialGradient>

          {/* Destination Node Outer Ring Fill */}
          <radialGradient id={`progTangerineCap-${uid}`} cx="36%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FF8542" />
            <stop offset="55%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </radialGradient>
        </defs>

        {/* 1. Delicate Architectural Registration Crosshairs & Station Datum Lines */}
        <g
          opacity="0.35"
          stroke="rgba(34, 34, 34, 0.25)"
          strokeWidth="1"
          className="auth-editorial-motif__grid ovael-progression__grid"
        >
          <path d="M 36 40 H 44 M 40 36 V 44" />
          <path d="M 326 240 H 334 M 330 236 V 244" />
          <line
            x1={TRACK_NODES.origin.x}
            y1="250"
            x2={TRACK_NODES.destination.x}
            y2="250"
            strokeDasharray="3 6"
            stroke="rgba(34, 34, 34, 0.14)"
          />
          <line
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y + 13}
            x2={TRACK_NODES.origin.x}
            y2="250"
            strokeDasharray="2 3"
            stroke="rgba(34, 34, 34, 0.16)"
          />
          <line
            x1={TRACK_NODES.inflection.x}
            y1={TRACK_NODES.inflection.y + 13}
            x2={TRACK_NODES.inflection.x}
            y2="250"
            strokeDasharray="2 4"
            stroke="rgba(34, 34, 34, 0.12)"
          />
          <line
            x1={TRACK_NODES.destination.x}
            y1={TRACK_NODES.destination.y + 15}
            x2={TRACK_NODES.destination.x}
            y2="250"
            strokeDasharray="2 3"
            stroke="rgba(34, 34, 34, 0.16)"
          />
        </g>

        {/* 2. Secondary Supporting Echo Contour (parallel reference offset from CURVE_PATH) */}
        <path
          className="auth-editorial-motif__echo"
          d={CURVE_PATH}
          transform="translate(0 16)"
          stroke="rgba(34, 34, 34, 0.15)"
          strokeWidth="1.25"
          strokeDasharray="4 6"
        />

        {/* 3. Static Supporting Track Layers (All sharing CURVE_PATH as single geometric reference) */}
        {/* Soft contact shadow beneath the track */}
        <path
          d={CURVE_PATH}
          transform="translate(0 5)"
          stroke="rgba(34, 34, 34, 0.07)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Lower 2.5D bevel accent */}
        <path
          d={CURVE_PATH}
          transform="translate(0 2)"
          stroke={`url(#progWall-${uid})`}
          strokeWidth="14"
          strokeLinecap="round"
          className="ovael-progression__wall"
        />
        {/* Charcoal structural track outline (#222222) */}
        <path
          d={CURVE_PATH}
          stroke="#222222"
          strokeWidth="14"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        {/* Warm Recycled Cotton (#F5E7C6) inner track bed */}
        <path
          d={CURVE_PATH}
          stroke={`url(#progBed-${uid})`}
          strokeWidth="11.5"
          strokeLinecap="round"
          className="ovael-progression__bed"
        />
        {/* Subtle static centerline guide groove */}
        <path
          d={CURVE_PATH}
          stroke="rgba(34, 34, 34, 0.16)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />

        {/* 4. Primary Animated Orange Trajectory (Draws progressively from origin to destination) */}
        <path
          id={curveId}
          className="auth-editorial-motif__trajectory ovael-progression__rail"
          d={CURVE_PATH}
          stroke={`url(#editorialGrad-${uid})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength="100"
        />

        {/* 5. Node 1: Origin Node at (40, 205) — Outer positioning group + Inner animation group */}
        <g
          className="ovael-progression__node-pos ovael-progression__node-pos--origin"
          transform={`translate(${TRACK_NODES.origin.x} ${TRACK_NODES.origin.y})`}
        >
          <circle cx="0" cy="2" r="10.5" fill="rgba(34, 34, 34, 0.14)" />
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--origin">
            <circle cx="0" cy="0" r="10" fill="#F5E7C6" stroke="#222222" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="5.6" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--origin"
            />
          </g>
        </g>

        {/* 6. Node 2: Intermediate Node at (215, 75) — Outer positioning group + Inner animation group */}
        <g
          className="ovael-progression__node-pos ovael-progression__node-pos--inflection"
          transform={`translate(${TRACK_NODES.inflection.x} ${TRACK_NODES.inflection.y})`}
        >
          <circle cx="0" cy="2" r="10.5" fill="rgba(34, 34, 34, 0.14)" />
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--inflection">
            <circle cx="0" cy="0" r="9.5" fill="#F5E7C6" stroke="#222222" strokeWidth="1.5" />
            <path
              d="M 0 -6.6 L 6.6 0 L 0 6.6 L -6.6 0 Z"
              fill="#FAF3E1"
              stroke="#222222"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--inflection"
            />
          </g>
        </g>

        {/* 7. Node 3: Destination Node at (330, 100) — Outer positioning group + Inner animation group */}
        <g
          className="ovael-progression__node-pos ovael-progression__node-pos--destination"
          transform={`translate(${TRACK_NODES.destination.x} ${TRACK_NODES.destination.y})`}
        >
          <circle cx="0" cy="2.2" r="11.5" fill="rgba(34, 34, 34, 0.16)" />
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--destination">
            <circle
              cx="0"
              cy="0"
              r="15"
              fill="none"
              stroke="#FF6D1F"
              strokeWidth="1.1"
              strokeDasharray="2.5 3.5"
              opacity="0.48"
              className="ovael-progression__dest-ring"
            />
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={`url(#progTangerineCap-${uid})`}
              stroke="#222222"
              strokeWidth="1.5"
            />
            <circle cx="0" cy="0" r="6.2" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--destination"
            />
          </g>
        </g>

        {/* 8. Traveling Orange Accent — Follows #learningPathCurve via native SVG animateMotion + mpath */}
        <g className="auth-editorial-motif__tracer ovael-progression__sphere-rig" aria-hidden="true">
          <animateMotion
            dur="0.86s"
            begin="0s"
            fill="freeze"
            calcMode="spline"
            keyPoints="0;1"
            keyTimes="0;1"
            keySplines="0.22 1 0.36 1"
          >
            <mpath href={`#${curveId}`} />
          </animateMotion>
          <circle
            cx="0"
            cy="0"
            r="6.2"
            fill={`url(#progSphere-${uid})`}
            stroke="#222222"
            strokeWidth="1.25"
          />
          <g className="ovael-progression__sphere-roll">
            <circle cx="0" cy="0" r="2.6" fill="#FF6D1F" />
          </g>
        </g>
      </svg>
    </div>
  );
};

