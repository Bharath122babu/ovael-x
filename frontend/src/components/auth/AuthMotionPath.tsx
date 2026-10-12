import React from 'react';

export interface AuthMotionPathProps {
  className?: string;
  compact?: boolean;
}

/**
 * Signature OVAEL-X Abstract Learning-Path Motion Graphic.
 *
 * Visual storytelling representing continuous adaptive progression:
 * 01 Concept Genesis -> 02 Adaptive Probing -> 03 Demonstrated Mastery.
 *
 * Implemented with lightweight SVG and CSS keyframes.
 * Zero external animation libraries. Fully respects prefers-reduced-motion.
 */
export const AuthMotionPath: React.FC<AuthMotionPathProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div
      className={`auth-motion-motif ${compact ? 'auth-motion-motif--compact' : ''} ${className}`}
      role="img"
      aria-label="Abstract geometric diagram representing adaptive learning progression"
    >
      <svg
        viewBox="0 0 460 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="auth-motion-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pathGradient" x1="60" y1="180" x2="390" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#222222" stopOpacity="0.25" />
            <stop offset="48%" stopColor="#FF6D1F" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#222222" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="guideGradient" x1="60" y1="200" x2="390" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FAF3E1" stopOpacity="0.2" />
          </linearGradient>

          <filter id="markerAmbientGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1" stdDeviation="3.5" floodColor="#FF6D1F" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Subtle architectural baseline and coordinate tick marks */}
        <g className="auth-motion-grid" opacity="0.45">
          <line x1="40" y1="210" x2="420" y2="210" stroke="rgba(34, 34, 34, 0.12)" strokeWidth="1" strokeDasharray="3 5" />
          <line x1="40" y1="35" x2="40" y2="210" stroke="rgba(34, 34, 34, 0.12)" strokeWidth="1" strokeDasharray="3 5" />
          <path d="M 36 210 H 44 M 40 206 V 214" stroke="rgba(34, 34, 34, 0.3)" strokeWidth="1" />
          <path d="M 221 210 H 229 M 225 206 V 214" stroke="rgba(34, 34, 34, 0.3)" strokeWidth="1" />
          <path d="M 376 210 H 384 M 380 206 V 214" stroke="rgba(34, 34, 34, 0.3)" strokeWidth="1" />
        </g>

        {/* Secondary ghost guide arc (Recycled Cotton tone) */}
        <path
          d="M 70 195 C 130 195, 170 115, 225 115 C 280 115, 320 145, 380 95"
          stroke="url(#guideGradient)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="auth-motion-guide"
        />

        {/* Primary Learning Trajectory Curve (Cubic Beziers connecting the 3 anchors) */}
        <path
          id="learningTrajectory"
          d="M 70 175 C 130 175, 165 75, 225 75 C 285 75, 320 125, 380 65"
          stroke="url(#pathGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="auth-motion-path"
        />

        {/* Milestone 01: Concept Genesis */}
        <g className="auth-motion-node auth-motion-node--01" transform="translate(70, 175)">
          <circle r="14" stroke="rgba(34, 34, 34, 0.15)" strokeWidth="1" strokeDasharray="2 3" />
          <circle r="7" fill="#FAF3E1" stroke="#222222" strokeWidth="1.5" />
          <circle r="2.5" fill="#222222" />
          <text x="0" y="26" textAnchor="middle" className="auth-motion-node__text">01 GENESIS</text>
        </g>

        {/* Milestone 02: Adaptive Probing */}
        <g className="auth-motion-node auth-motion-node--02" transform="translate(225, 75)">
          <circle r="16" stroke="rgba(255, 109, 31, 0.3)" strokeWidth="1" />
          <circle r="8" fill="#FAF3E1" stroke="rgba(34, 34, 34, 0.35)" strokeWidth="1.5" />
          <rect x="-3" y="-3" width="6" height="6" fill="#F5E7C6" stroke="#222222" strokeWidth="1" transform="rotate(45)" />
          <text x="0" y="-18" textAnchor="middle" className="auth-motion-node__text">02 PROBING</text>
        </g>

        {/* Milestone 03: Demonstrated Mastery */}
        <g className="auth-motion-node auth-motion-node--03" transform="translate(380, 65)">
          <circle r="18" stroke="rgba(255, 109, 31, 0.35)" strokeWidth="1" strokeDasharray="3 3" />
          <circle r="9" fill="#FAF3E1" stroke="#FF6D1F" strokeWidth="2" />
          <circle r="3.5" fill="#FF6D1F" />
          <text x="0" y="26" textAnchor="middle" className="auth-motion-node__text">03 MASTERY</text>
        </g>

        {/* Electric Tangerine Traveling Accent Marker */}
        <g className="auth-motion-marker" filter="url(#markerAmbientGlow)">
          <circle r="10" fill="none" stroke="#FF6D1F" strokeWidth="1.5" opacity="0.45" className="auth-motion-marker__halo" />
          <circle r="5" fill="#FF6D1F" />
          <circle r="1.8" fill="#FFFFFF" />
        </g>
      </svg>

      <div className="auth-motion-caption">
        <span className="auth-motion-caption__dot" />
        <span className="auth-motion-caption__text">CONTINUOUS ADAPTIVE KERNEL • BOUNDED PROGRESSION</span>
      </div>
    </div>
  );
};
