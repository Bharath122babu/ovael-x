import React from 'react';

export interface AuthEditorialMotifProps {
  className?: string;
}

/**
 * OVAEL-X Editorial Artwork Motif.
 *
 * An original geometric visual motif representing continuous, bounded learning.
 * Composed with precise vector geometry, flowing curves, geometric anchors,
 * and a restrained Electric Tangerine (#FF6D1F) focal accent.
 *
 * Free of fake metrics, stage labels, and promotional copy.
 */
export const AuthEditorialMotif: React.FC<AuthEditorialMotifProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`auth-editorial-motif ${className}`}
      role="img"
      aria-label="Abstract geometric editorial motif representing learning progression"
    >
      <svg
        viewBox="0 0 360 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="auth-editorial-motif-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="editorialGrad" x1="40" y1="210" x2="330" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#222222" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#222222" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6D1F" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="editorialEcho" x1="40" y1="230" x2="330" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5E7C6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FAF3E1" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Delicate architectural alignment crosshairs */}
        <g opacity="0.35" stroke="rgba(34, 34, 34, 0.25)" strokeWidth="1">
          <path d="M 36 40 H 44 M 40 36 V 44" />
          <path d="M 316 240 H 324 M 320 236 V 244" />
          <line x1="40" y1="250" x2="320" y2="250" strokeDasharray="3 6" stroke="rgba(34, 34, 34, 0.12)" />
        </g>

        {/* Secondary ghost contour (Recycled Cotton tone) */}
        <path
          d="M 45 225 C 115 225, 145 115, 215 115 C 265 115, 295 155, 325 140"
          stroke="url(#editorialEcho)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Primary flowing vector trajectory */}
        <path
          d="M 40 205 C 110 205, 140 75, 215 75 C 275 75, 300 135, 330 100"
          stroke="url(#editorialGrad)"
          strokeWidth="2.25"
          strokeLinecap="round"
        />

        {/* Origin Geometric Anchor */}
        <circle cx="40" cy="205" r="5.5" fill="#FAF3E1" stroke="#222222" strokeWidth="1.5" />
        <circle cx="40" cy="205" r="2" fill="#222222" />

        {/* Inflection Diamond Anchor */}
        <g transform="translate(215, 75)">
          <rect x="-4" y="-4" width="8" height="8" fill="#F5E7C6" stroke="#222222" strokeWidth="1.25" transform="rotate(45)" />
          <circle cx="0" cy="0" r="1.5" fill="#222222" />
        </g>

        {/* Destination Focal Anchor with Signature Electric Tangerine Accent */}
        <g transform="translate(330, 100)">
          <circle r="12" fill="none" stroke="#FF6D1F" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
          <circle r="6" fill="#FAF3E1" stroke="#FF6D1F" strokeWidth="1.75" />
          <circle r="2.5" fill="#FF6D1F" />
        </g>
      </svg>
    </div>
  );
};
