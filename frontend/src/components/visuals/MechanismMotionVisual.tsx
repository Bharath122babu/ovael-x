import React, { useId } from 'react';

export type MechanismMotionState = 'idle' | 'settled' | 'active';

export interface MechanismMotionVisualProps {
  /** Scale/layout variant */
  variant?: 'compact' | 'standard' | 'inline';
  /** Real application state driving the mechanical interaction */
  state?: MechanismMotionState;
  /** If true, hides the visual from screen readers */
  decorative?: boolean;
  /** Accessible label when informative */
  ariaLabel?: string;
  /** Optional custom CSS class */
  className?: string;
}

/**
 * OVAEL-X Signature Motion Concept C — MECHANISM
 *
 * A compact 2.5D mechanical interaction between three geometric forms:
 * 1. A milled Recycled Cotton (#F5E7C6) two-level guide channel with Black Hole (#222222) rim.
 * 2. A pivoting Electric Tangerine (#FF6D1F) indexing bar mounted on a central axle.
 * 3. A studio-lit Sustainable Linen (#FAF3E1) sphere.
 *
 * Choreography:
 * - Sphere enters the upper intake channel.
 * - Sphere makes contact with the pivoting orange rocker bar.
 * - Rocker bar rotates into its indexed position (-22 deg), redirecting the sphere.
 * - Both the sphere and the mechanism settle cleanly into the lower output socket.
 */
export const MechanismMotionVisual: React.FC<MechanismMotionVisualProps> = ({
  variant = 'compact',
  state = 'settled',
  decorative = true,
  ariaLabel = 'Mechanical state indicator',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`ovael-mechanism ovael-mechanism--${variant} ovael-mechanism--${state} ${className}`.trim()}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? 'true' : undefined}
    >
      <svg
        viewBox="0 0 184 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ovael-mechanism__svg"
        aria-hidden="true"
      >
        <defs>
          {/* Studio-Lit Linen Sphere */}
          <radialGradient id={`mechSphere-${uid}`} cx="34%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FAF3E1" />
            <stop offset="85%" stopColor="#E5D5B2" />
            <stop offset="100%" stopColor="#C4B18A" />
          </radialGradient>

          {/* Electric Tangerine Rocker Bar Surface */}
          <linearGradient id={`mechBar-${uid}`} x1="68" y1="36" x2="128" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8542" />
            <stop offset="50%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </linearGradient>

          {/* Milled Channel Bed (Recycled Cotton #F5E7C6) */}
          <linearGradient id={`mechChannel-${uid}`} x1="20" y1="20" x2="164" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="100%" stopColor="#EAD7AF" />
          </linearGradient>
        </defs>

        {/* 1. Grounded Housing Plinth & Ambient Shadow */}
        <rect
          x="10"
          y="13"
          width="164"
          height="66"
          rx="16"
          fill="rgba(34, 34, 34, 0.07)"
        />
        <rect
          x="10"
          y="10"
          width="164"
          height="66"
          rx="16"
          fill="#FAF3E1"
          stroke="#222222"
          strokeWidth="1.25"
        />

        {/* 2. Recessed Milled Guide Channel (Upper Intake -> Pivot Junction -> Lower Indexed Socket) */}
        {/* Extruded 2.5D Inner Rim Shadow */}
        <path
          d="M 28 31 H 96 L 154 57"
          stroke="#222222"
          strokeWidth="17"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Recessed Channel Floor (Recycled Cotton #F5E7C6) */}
        <path
          d="M 28 30 H 96 L 154 56"
          stroke={`url(#mechChannel-${uid})`}
          strokeWidth="14.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Centerline Track Groove */}
        <path
          d="M 28 30 H 96 L 154 56"
          stroke="#222222"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2.5 3.5"
          strokeOpacity="0.4"
        />

        {/* 3. Intake & Output Station Sockets */}
        <circle cx="28" cy="30" r="4" fill="#FAF3E1" stroke="#222222" strokeWidth="1.1" />
        <g transform="translate(154, 56)" className="ovael-mechanism__socket">
          <circle r="6.5" fill="#FAF3E1" stroke="#FF6D1F" strokeWidth="1.4" />
          <circle r="2.2" fill="#FF6D1F" />
        </g>

        {/* 4. Pivoting Mechanical Rocker Bar (Electric Tangerine #FF6D1F on Black Hole #222222 Axle) */}
        <g className="ovael-mechanism__rocker" transform="translate(96, 43)">
          {/* Contact Shadow under Rocker Bar */}
          <rect
            x="-24"
            y="-4.5"
            width="48"
            height="12"
            rx="6"
            fill="rgba(34, 34, 34, 0.16)"
          />
          {/* 2.5D Extruded Lower Edge of Rocker Bar */}
          <rect
            x="-24"
            y="-5"
            width="48"
            height="11"
            rx="5.5"
            fill="#B84307"
            stroke="#222222"
            strokeWidth="1.2"
          />
          {/* Top Face of Rocker Bar */}
          <rect
            x="-24"
            y="-6.5"
            width="48"
            height="11"
            rx="5.5"
            fill={`url(#mechBar-${uid})`}
            stroke="#222222"
            strokeWidth="1.25"
          />
          {/* End Bumper Detents */}
          <circle cx="-16" cy="-1" r="2" fill="#FAF3E1" />
          <circle cx="16" cy="-1" r="2" fill="#FAF3E1" />
          {/* Central Mechanical Pivot Axle */}
          <circle cx="0" cy="-1" r="5.5" fill="#222222" />
          <circle cx="0" cy="-1" r="2.2" fill="#FAF3E1" />
        </g>

        {/* 5. Travelling & Interacting Sphere Assembly */}
        <g className="ovael-mechanism__sphere">
          {/* Synchronized Contact Shadow on Channel Bed */}
          <ellipse
            cx="1.4"
            cy="4"
            rx="7"
            ry="4"
            fill="rgba(34, 34, 34, 0.25)"
          />
          {/* Studio-Lit Linen Sphere Body */}
          <circle
            cx="0"
            cy="0"
            r="6.8"
            fill={`url(#mechSphere-${uid})`}
            stroke="#222222"
            strokeWidth="1.25"
          />
          {/* Rolling Seam Band */}
          <g className="ovael-mechanism__sphere-seam">
            <ellipse
              cx="0"
              cy="0"
              rx="6"
              ry="2.2"
              fill="none"
              stroke="#FF6D1F"
              strokeWidth="1.2"
            />
            <circle cx="3.2" cy="0" r="1.1" fill="#222222" />
          </g>
          {/* Specular Studio Highlight */}
          <circle cx="-2.2" cy="-2.2" r="1.7" fill="#FFFFFF" fillOpacity="0.92" />
        </g>
      </svg>
    </div>
  );
};
