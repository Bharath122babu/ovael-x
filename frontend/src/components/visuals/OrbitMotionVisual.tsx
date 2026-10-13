import React, { useId } from 'react';

export interface OrbitMotionVisualProps {
  /** Display scale variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the orbital motion is currently active */
  active?: boolean;
  /** Whether to loop smoothly (for real pending operations) or run once and settle */
  loop?: boolean;
  /** Accessible status label when used as a functional loading indicator */
  label?: string;
  /** If true, hides the visual from screen readers (for supporting/adjacent decoration) */
  decorative?: boolean;
  /** Optional custom CSS class */
  className?: string;
}

/**
 * OVAEL-X Signature Motion Concept A — ORBIT
 *
 * A minimalist 2.5D orthographic composition inspired by tactile UI motion design.
 * A studio-lit Sustainable Linen (#FAF3E1) sphere follows a precision-milled
 * Electric Tangerine (#FF6D1F) and Recycled Cotton (#F5E7C6) elliptical track
 * around a Black Hole (#222222) calibration hub, casting a synchronized contact shadow.
 *
 * Rendering Technique:
 * Lightweight, zero-dependency 2.5D vector projection using SVG + CSS offset-path
 * and hardware-accelerated transforms. Does not represent fake AI reasoning or
 * fabricated mastery progress.
 */
export const OrbitMotionVisual: React.FC<OrbitMotionVisualProps> = ({
  size = 'md',
  active = true,
  loop = false,
  label = 'Operation in progress',
  decorative = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const stateClass = active
    ? loop
      ? 'ovael-orbit--loop'
      : 'ovael-orbit--once'
    : 'ovael-orbit--idle';

  return (
    <div
      className={`ovael-orbit ovael-orbit--${size} ${stateClass} ${className}`.trim()}
      role={decorative ? 'presentation' : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? 'true' : undefined}
    >
      <svg
        viewBox="0 0 160 108"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ovael-orbit__svg"
        aria-hidden="true"
      >
        <defs>
          {/* Matte Linen Sphere Studio Lighting */}
          <radialGradient id={`orbitSphere-${uid}`} cx="34%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FAF3E1" />
            <stop offset="85%" stopColor="#E6D7B8" />
            <stop offset="100%" stopColor="#CBB994" />
          </radialGradient>

          {/* Electric Tangerine Track Bevel */}
          <linearGradient id={`orbitTrackBevel-${uid}`} x1="20" y1="24" x2="140" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </linearGradient>

          {/* Recessed Cotton Plinth Surface */}
          <linearGradient id={`orbitPlinth-${uid}`} x1="80" y1="18" x2="80" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="100%" stopColor="#EAD8B1" />
          </linearGradient>
        </defs>

        {/* 1. Grounded Ambient Plinth Shadow */}
        <ellipse
          cx="80"
          cy="58"
          rx="66"
          ry="35"
          fill="rgba(34, 34, 34, 0.08)"
        />

        {/* 2. Milled Outer Plinth (Recycled Cotton #F5E7C6 with Black Hole #222222 hairline) */}
        <ellipse
          cx="80"
          cy="54"
          rx="64"
          ry="33"
          fill={`url(#orbitPlinth-${uid})`}
          stroke="#222222"
          strokeWidth="1.25"
        />

        {/* 3. Recessed Orbital Channel Wall (Electric Tangerine #FF6D1F 2.5D depth rim) */}
        <ellipse
          cx="80"
          cy="55.5"
          rx="52"
          ry="26"
          fill="none"
          stroke="#222222"
          strokeWidth="7.5"
          strokeOpacity="0.12"
        />
        <ellipse
          cx="80"
          cy="54"
          rx="52"
          ry="26"
          fill="none"
          stroke={`url(#orbitTrackBevel-${uid})`}
          strokeWidth="6.5"
        />

        {/* 4. Precision Track Centerline Groove */}
        <path
          d="M 28 54 A 52 26 0 1 1 132 54 A 52 26 0 1 1 28 54"
          stroke="#222222"
          strokeWidth="1"
          strokeOpacity="0.45"
          strokeDasharray="3 4"
        />

        {/* 5. Central Calibration Hub (Black Hole #222222 + Sustainable Linen #FAF3E1 cap) */}
        <g className="ovael-orbit__hub" transform="translate(80, 54)">
          {/* Contact shadow under hub */}
          <ellipse cx="0" cy="3" rx="17" ry="9.5" fill="rgba(34, 34, 34, 0.16)" />
          {/* Extruded hub base */}
          <ellipse cx="0" cy="1.5" rx="15" ry="8" fill="#222222" />
          {/* Top bevel face */}
          <ellipse cx="0" cy="-0.5" rx="15" ry="8" fill="#222222" stroke="#FAF3E1" strokeWidth="1" strokeOpacity="0.5" />
          {/* Center indexing ring */}
          <ellipse cx="0" cy="-0.5" rx="6" ry="3.2" fill="#FF6D1F" />
          <circle cx="0" cy="-0.5" r="1.6" fill="#FAF3E1" />
        </g>

        {/* 6. Orbiting Sphere Assembly (Synchronized Contact Shadow + Rolling Sphere) */}
        <g className="ovael-orbit__traveler">
          {/* Grounded Contact Shadow moving on the orange track directly under the sphere */}
          <ellipse
            cx="1.5"
            cy="4.5"
            rx="8.5"
            ry="4.8"
            fill="rgba(34, 34, 34, 0.28)"
            className="ovael-orbit__shadow"
          />

          {/* Sphere Body (Studio lighting stays oriented top-left while meridian seam rolls) */}
          <circle
            cx="0"
            cy="0"
            r="8"
            fill={`url(#orbitSphere-${uid})`}
            stroke="#222222"
            strokeWidth="1.25"
          />

          {/* Rolling Equatorial Seam (rotates in proportion to orbital travel) */}
          <g className="ovael-orbit__seam">
            <ellipse
              cx="0"
              cy="0"
              rx="7.2"
              ry="2.6"
              fill="none"
              stroke="#FF6D1F"
              strokeWidth="1.2"
            />
            <circle cx="4" cy="0" r="1.2" fill="#222222" />
          </g>

          {/* Studio Specular Highlight */}
          <circle cx="-2.6" cy="-2.6" r="2" fill="#FFFFFF" fillOpacity="0.9" />
        </g>
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
    </div>
  );
};
