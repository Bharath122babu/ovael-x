import React, { useRef, useCallback } from 'react';

export interface AdaptiveLearningMotifProps {
  /** Size variant */
  variant?: 'compact' | 'standard' | 'card';
  /** Whether mouse micro-tilt is enabled */
  interactive?: boolean;
  /** Optional custom CSS class */
  className?: string;
  /** Optional custom accessible label (defaults to conceptual adaptive learning notice) */
  ariaLabel?: string;
}

/**
 * Signature OVAEL-X Adaptive Learning Visual Motif.
 *
 * An understated dimensional visual representing interconnected knowledge pathways,
 * concepts, and adaptive learning structures.
 *
 * Data Integrity Guarantee:
 * This visual is purely conceptual/illustrative. It does not fabricate student progress,
 * live mastery scores, or real-time neural network states.
 */
export const AdaptiveLearningMotif: React.FC<AdaptiveLearningMotifProps> = ({
  variant = 'compact',
  interactive = true,
  className = '',
  ariaLabel = 'Conceptual dimensional diagram of interconnected adaptive learning pathways',
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !sceneRef.current) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

      const rotateY = (x * 12).toFixed(2); // max ±6 deg
      const rotateX = (-y * 12).toFixed(2); // max ±6 deg

      sceneRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  }, []);

  return (
    <div
      className={`adaptive-motif adaptive-motif--${variant} ${className}`}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerLeave={interactive ? handlePointerLeave : undefined}
      role="img"
      aria-label={ariaLabel}
    >
      <div ref={sceneRef} className="adaptive-motif__scene">
        <svg
          viewBox="0 0 280 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Soft Ambient Shadow Filter */}
            <filter id="motifSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4f46e5" floodOpacity="0.18" />
            </filter>

            {/* Hub Glow Filter */}
            <filter id="hubAmbientGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.35" />
            </filter>

            {/* Foundation Grid Gradient */}
            <linearGradient id="foundationPlane" x1="140" y1="80" x2="140" y2="165" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.08" />
            </linearGradient>

            {/* Elevated Concept Tier Gradient */}
            <linearGradient id="elevatedTier" x1="140" y1="65" x2="140" y2="125" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#eef2ff" stopOpacity="0.5" />
            </linearGradient>

            {/* Vector Pathway Gradient */}
            <linearGradient id="pathwayGradient" x1="75" y1="95" x2="205" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
            </linearGradient>

            {/* Central Hub Sphere Gradient */}
            <radialGradient id="hubSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="45%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3730a3" />
            </radialGradient>

            {/* Satellite Node Radial Gradient */}
            <radialGradient id="satelliteSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>

            {/* Graphite Satellite Node */}
            <radialGradient id="graphiteSphere" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* 1. Foundational Perspective Substrate Plane */}
          <polygon
            points="35,125 140,80 245,125 140,165"
            fill="url(#foundationPlane)"
            stroke="#cbd5e1"
            strokeWidth="0.75"
            strokeOpacity="0.6"
          />

          {/* Internal Grid Lines on Foundation */}
          <line x1="87" y1="102" x2="192" y2="145" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="192" y1="102" x2="87" y2="145" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.4" />

          {/* 2. Elevated Dimensional Concept Plane */}
          <polygon
            points="70,100 140,70 210,100 140,128"
            fill="url(#elevatedTier)"
            stroke="#c7d2fe"
            strokeWidth="1"
            filter="url(#motifSoftGlow)"
          />
          {/* Top Bevel Specular Edge */}
          <polyline
            points="70,100 140,70 210,100"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />

          {/* 3. Altitude Depth Vectors (Vertical projection lines) */}
          <line x1="140" y1="40" x2="140" y2="70" stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2 2" strokeOpacity="0.6" />
          <line x1="75" y1="95" x2="75" y2="118" stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2 2" strokeOpacity="0.5" />
          <line x1="205" y1="90" x2="205" y2="115" stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2 2" strokeOpacity="0.5" />

          {/* 4. Interconnected Learning Pathways */}
          <path
            d="M 140,40 L 140,85"
            stroke="url(#pathwayGradient)"
            strokeWidth="1.25"
            className="motif-data-link"
          />
          <path
            d="M 75,95 L 140,85"
            stroke="url(#pathwayGradient)"
            strokeWidth="1.25"
            className="motif-data-link"
          />
          <path
            d="M 140,85 L 205,90"
            stroke="url(#pathwayGradient)"
            strokeWidth="1.25"
            className="motif-data-link"
          />
          <path
            d="M 75,95 L 105,135"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.7"
          />
          <path
            d="M 140,85 L 175,135"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.7"
          />

          {/* 5. Substrate Foundation Points */}
          <circle cx="105" cy="135" r="3" fill="#64748b" opacity="0.6" />
          <circle cx="175" cy="135" r="3" fill="#64748b" opacity="0.6" />

          {/* 6. Satellite Topic Nodes */}
          {/* North Concept Node (Apex) */}
          <g transform="translate(140, 40)">
            <circle cx="0" cy="0" r="10" fill="#3b82f6" fillOpacity="0.12" />
            <circle cx="0" cy="0" r="6" fill="url(#satelliteSphere)" />
            <circle cx="-1.5" cy="-1.5" r="1.5" fill="#ffffff" fillOpacity="0.75" />
          </g>

          {/* West Concept Node */}
          <g transform="translate(75, 95)">
            <circle cx="0" cy="0" r="9" fill="#0f172a" fillOpacity="0.1" />
            <circle cx="0" cy="0" r="5.5" fill="url(#graphiteSphere)" />
            <circle cx="-1.5" cy="-1.5" r="1.5" fill="#ffffff" fillOpacity="0.6" />
          </g>

          {/* East Concept Node */}
          <g transform="translate(205, 90)">
            <circle cx="0" cy="0" r="10" fill="#6366f1" fillOpacity="0.15" />
            <circle cx="0" cy="0" r="5.5" fill="url(#satelliteSphere)" />
            <circle cx="-1.5" cy="-1.5" r="1.5" fill="#ffffff" fillOpacity="0.75" />
          </g>

          {/* 7. Central Adaptive Learning Anchor Hub */}
          <g transform="translate(140, 85)" className="motif-pulse-node">
            {/* Halo ring */}
            <circle cx="0" cy="0" r="15" fill="#4f46e5" fillOpacity="0.15" />
            <circle cx="0" cy="0" r="11" fill="#4f46e5" fillOpacity="0.25" filter="url(#hubAmbientGlow)" />
            {/* Core sphere */}
            <circle cx="0" cy="0" r="7.5" fill="url(#hubSphere)" />
            {/* Specular light highlight */}
            <circle cx="-2" cy="-2" r="2" fill="#ffffff" fillOpacity="0.85" />
          </g>
        </svg>
      </div>
    </div>
  );
};
