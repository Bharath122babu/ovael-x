import React, { useId } from 'react';

export interface ProgressionMotionVisualProps {
  /** Visual presentation variant */
  variant?: 'editorial' | 'compact';
  /** Whether a real pending action is active (e.g. authenticating / starting session) */
  active?: boolean;
  /** Optional custom CSS class */
  className?: string;
  /** Accessible description for conceptual illustration */
  ariaLabel?: string;
}

/**
 * OVAEL-X Signature Motion Concept B — PROGRESSION
 *
 * An original 2.5D sphere-and-track mechanical composition inspired by minimalist
 * orange-and-ivory UI motion design. A studio-lit Sustainable Linen (#FAF3E1) sphere
 * rolls along a sculpted Recycled Cotton (#F5E7C6) and Electric Tangerine (#FF6D1F)
 * curved channel from Origin through an Inflection Gate to a Destination Plinth.
 *
 * Physical Choreography:
 * - Sphere translation uses controlled acceleration and deceleration along a cubic Bézier curve.
 * - Inner meridian band rotates proportionally (540 deg) to distance traveled.
 * - Grounded contact shadow travels synchronously beneath the sphere on the channel floor.
 * - Settles into a stable docked resting state without percentage labels or fake mastery metrics.
 */
export const ProgressionMotionVisual: React.FC<ProgressionMotionVisualProps> = ({
  variant = 'editorial',
  active = false,
  className = '',
  ariaLabel = 'Geometric 2.5D sphere and curved guideway representing structured learning progression',
}) => {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`ovael-progression ovael-progression--${variant} ${
        active ? 'ovael-progression--active' : ''
      } ${className}`.trim()}
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
          {/* Channel Bed Surface Gradient (Recycled Cotton #F5E7C6 to Sustainable Linen #FAF3E1) */}
          <linearGradient id={`progBed-${uid}`} x1="40" y1="215" x2="330" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="55%" stopColor="#EFE0BC" />
            <stop offset="100%" stopColor="#F5E7C6" />
          </linearGradient>

          {/* Extruded 2.5D Channel Wall Gradient (Electric Tangerine #FF6D1F) */}
          <linearGradient id={`progWall-${uid}`} x1="40" y1="220" x2="330" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E55B10" />
            <stop offset="50%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </linearGradient>

          {/* Centerline Guide Rail Gradient */}
          <linearGradient id={`editorialGrad-${uid}`} x1="40" y1="210" x2="330" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#222222" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#222222" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FF6D1F" stopOpacity="0.95" />
          </linearGradient>

          {/* Studio-Lit Rolling Sphere (Sustainable Linen #FAF3E1) */}
          <radialGradient id={`progSphere-${uid}`} cx="34%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="42%" stopColor="#FAF3E1" />
            <stop offset="82%" stopColor="#E5D5B2" />
            <stop offset="100%" stopColor="#C4B18A" />
          </radialGradient>

          {/* Electric Tangerine Plinth Surface */}
          <radialGradient id={`progTangerineCap-${uid}`} cx="36%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FF8F52" />
            <stop offset="50%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#CC4E0A" />
          </radialGradient>
        </defs>

        {/* 1. Delicate Architectural Registration Grid & Baselines */}
        <g opacity="0.35" stroke="rgba(34, 34, 34, 0.25)" strokeWidth="1" className="auth-editorial-motif__grid ovael-progression__grid">
          <path d="M 36 40 H 44 M 40 36 V 44" />
          <path d="M 316 240 H 324 M 320 236 V 244" />
          <line x1="40" y1="250" x2="320" y2="250" strokeDasharray="3 6" stroke="rgba(34, 34, 34, 0.14)" />
          {/* Vertical 2.5D elevation drop-lines from stations to baseline */}
          <line x1="40" y1="216" x2="40" y2="250" strokeDasharray="2 3" stroke="rgba(34, 34, 34, 0.18)" />
          <line x1="215" y1="90" x2="215" y2="250" strokeDasharray="2 4" stroke="rgba(34, 34, 34, 0.14)" />
          <line x1="330" y1="116" x2="330" y2="250" strokeDasharray="2 3" stroke="rgba(34, 34, 34, 0.18)" />
        </g>

        {/* 2. Grounded Ambient Shadow of the Curved Track */}
        <path
          d="M 40 215 C 110 215, 140 85, 215 85 C 275 85, 300 145, 330 110"
          stroke="rgba(34, 34, 34, 0.08)"
          strokeWidth="22"
          strokeLinecap="round"
        />

        {/* 3. 2.5D Extruded Lower Track Bevel (Electric Tangerine #FF6D1F) */}
        <path
          d="M 40 209.5 C 110 209.5, 140 79.5, 215 79.5 C 275 79.5, 300 139.5, 330 104.5"
          stroke={`url(#progWall-${uid})`}
          strokeWidth="16"
          strokeLinecap="round"
          className="ovael-progression__wall"
        />

        {/* 4. Milled Upper Channel Rim (Black Hole #222222 structural contrast) */}
        <path
          d="M 40 205 C 110 205, 140 75, 215 75 C 275 75, 300 135, 330 100"
          stroke="#222222"
          strokeWidth="16.5"
          strokeLinecap="round"
          strokeOpacity="0.88"
        />

        {/* 5. Recessed Channel Bed (Recycled Cotton #F5E7C6) */}
        <path
          className="auth-editorial-motif__echo ovael-progression__bed"
          d="M 40 205 C 110 205, 140 75, 215 75 C 275 75, 300 135, 330 100"
          stroke={`url(#progBed-${uid})`}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength="100"
        />

        {/* 6. Precision Centerline Guide Groove */}
        <path
          className="auth-editorial-motif__trajectory ovael-progression__rail"
          d="M 40 205 C 110 205, 140 75, 215 75 C 275 75, 300 135, 330 100"
          stroke={`url(#editorialGrad-${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
          pathLength="100"
        />

        {/* 7. Station 1: Origin Launch Plinth (40, 205) */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--origin">
          {/* 2.5D Plinth Base Shadow */}
          <ellipse cx="40" cy="208.5" rx="13" ry="9" fill="rgba(34, 34, 34, 0.15)" />
          {/* Extruded Charcoal Base */}
          <circle cx="40" cy="206.5" r="11" fill="#222222" />
          {/* Top Recessed Cotton Ring */}
          <circle cx="40" cy="205" r="11" fill="#F5E7C6" stroke="#222222" strokeWidth="1.4" />
          {/* Inner Origin Socket */}
          <circle cx="40" cy="205" r="5.5" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
          <circle cx="40" cy="205" r="2" fill="#222222" />
        </g>

        {/* 8. Station 2: Inflection Mechanical Collar (215, 75) */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--inflection" transform="translate(215, 75)">
          {/* Collar Shadow */}
          <ellipse cx="0" cy="3" rx="12" ry="8" fill="rgba(34, 34, 34, 0.14)" />
          {/* Rotated Mechanical Gate Frame */}
          <rect
            x="-8.5"
            y="-8.5"
            width="17"
            height="17"
            rx="3.5"
            fill="#FAF3E1"
            stroke="#222222"
            strokeWidth="1.4"
            transform="rotate(45)"
          />
          <rect
            x="-4.5"
            y="-4.5"
            width="9"
            height="9"
            rx="1.5"
            fill="#FF6D1F"
            stroke="#222222"
            strokeWidth="1.1"
            transform="rotate(45)"
          />
          <circle cx="0" cy="0" r="1.75" fill="#FAF3E1" />
        </g>

        {/* 9. Station 3: Destination Receiving Plinth (330, 100) */}
        <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--destination" transform="translate(330, 100)">
          {/* Precision Outer Indexing Ring */}
          <circle
            r="18"
            fill="none"
            stroke="#FF6D1F"
            strokeWidth="1.15"
            strokeDasharray="3 4"
            opacity="0.55"
            className="ovael-progression__dest-ring"
          />
          {/* Plinth Contact Shadow */}
          <ellipse cx="0" cy="4" rx="14.5" ry="10" fill="rgba(34, 34, 34, 0.18)" />
          {/* 2.5D Extruded Tangerine Side Wall */}
          <circle cx="0" cy="2" r="13" fill="#CC4E0A" stroke="#222222" strokeWidth="1.3" />
          {/* Top Tangerine Plinth Face */}
          <circle cx="0" cy="0" r="13" fill={`url(#progTangerineCap-${uid})`} stroke="#222222" strokeWidth="1.4" />
          {/* Recessed Socket Pocket */}
          <circle cx="0" cy="0" r="8" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
          <circle cx="0" cy="0" r="3" fill="#FF6D1F" />
        </g>

        {/* 10. Travelling 2.5D Rolling Sphere Assembly */}
        <g className="auth-editorial-motif__tracer ovael-progression__sphere-rig" aria-hidden="true">
          {/* Synchronized Contact Shadow on Track Floor */}
          <ellipse
            cx="1.8"
            cy="5.2"
            rx="9"
            ry="5.2"
            fill="rgba(34, 34, 34, 0.26)"
            className="ovael-progression__sphere-shadow"
          />

          {/* Main Studio-Lit Linen Sphere (Lighting stays oriented top-left via offset-rotate: 0deg) */}
          <circle
            cx="0"
            cy="0"
            r="8.5"
            fill={`url(#progSphere-${uid})`}
            stroke="#222222"
            strokeWidth="1.4"
          />

          {/* Rolling Inner Meridian Seam (Rotates proportionally to path travel) */}
          <g className="ovael-progression__sphere-roll">
            <ellipse
              cx="0"
              cy="0"
              rx="7.6"
              ry="3"
              fill="none"
              stroke="#FF6D1F"
              strokeWidth="1.35"
            />
            <circle cx="4.5" cy="0" r="1.5" fill="#222222" />
            <circle cx="-4.5" cy="0" r="1.2" fill="#FF6D1F" />
          </g>

          {/* Studio Specular Highlight (Top-Left Light Source) */}
          <circle cx="-2.8" cy="-2.8" r="2.2" fill="#FFFFFF" fillOpacity="0.92" />
        </g>
      </svg>
    </div>
  );
};
