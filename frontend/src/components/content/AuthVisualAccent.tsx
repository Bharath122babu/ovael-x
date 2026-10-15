import { usePrefersReducedMotion } from "./MotionPrimitives";

/**
 * AuthVisualAccent: Layered isometric SVG synthesis graphic
 * representing causal knowledge networks, evidence nodes, and learning synthesis
 * utilizing the 5 exact OVAEL-X brand colors.
 */
export function AuthVisualAccent({ className = "" }: { className?: string }) {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <div
      className={`auth-visual-accent ${className}`}
      aria-hidden="true"
      style={{
        width: "100%",
        maxWidth: "460px",
        margin: "1.25rem auto 0",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 460 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "auto",
          overflow: "visible",
        }}
      >
        <defs>
          {/* Subtle gradient fills from brand palette */}
          <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D2FDFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#B4DFE5" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#B4DFE5" stopOpacity="0.06" />
          </linearGradient>
          <filter id="authShadowFilter" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#1E2544" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Base Isometric Ground Plane */}
        <path
          d="M230 40 L410 120 L230 200 L50 120 Z"
          fill="url(#planeGrad)"
          stroke="#B4DFE5"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {/* Network Nodes Grid on Ground */}
        <g stroke="#B4DFE5" strokeOpacity="0.3" strokeWidth="1">
          <line x1="140" y1="80" x2="320" y2="160" />
          <line x1="320" y1="80" x2="140" y2="160" />
          <line x1="230" y1="40" x2="230" y2="200" strokeDasharray="3 3" />
        </g>

        {/* Primary Central Knowledge Plane (Card) */}
        <g filter="url(#authShadowFilter)">
          <path
            d="M230 75 L360 135 L230 195 L100 135 Z"
            fill="url(#cardGrad1)"
            stroke="#B4DFE5"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
        </g>

        {/* Core Synthesized Causal Edges */}
        <path
          d="M170 125 L230 95 L290 125 L230 155 Z"
          fill="#FBE8A6"
          fillOpacity="0.22"
          stroke="#FBE8A6"
          strokeWidth="1.5"
        />

        {/* Vertical Data Beams / Evidence Pillars */}
        {/* Node A (Left, Coral - High Alert/Focus) */}
        <line
          x1="145"
          y1="120"
          x2="145"
          y2="65"
          stroke="#F4976C"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
        <circle cx="145" cy="65" r="7" fill="#F4976C" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="145" cy="65" r="14" fill="#F4976C" fillOpacity="0.25">
          {!prefersReduced && (
            <animate
              attributeName="r"
              values="10;17;10"
              dur="3.2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Node B (Center Top, Brand Navy / Pale Cyan - Authority/Truth) */}
        <line
          x1="230"
          y1="95"
          x2="230"
          y2="30"
          stroke="#D2FDFF"
          strokeWidth="2"
        />
        <circle cx="230" cy="30" r="9" fill="#1E2544" stroke="#FBE8A6" strokeWidth="2.5" />
        <circle cx="230" cy="30" r="4" fill="#FBE8A6" />

        {/* Node C (Right, Soft Blue - Materials/Concepts) */}
        <line
          x1="315"
          y1="120"
          x2="315"
          y2="70"
          stroke="#B4DFE5"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
        <circle cx="315" cy="70" r="7" fill="#B4DFE5" stroke="#1E2544" strokeWidth="2" />

        {/* Node D (Bottom Center, Pale Cyan - Grounded Inference) */}
        <line
          x1="230"
          y1="155"
          x2="230"
          y2="190"
          stroke="#B4DFE5"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <circle cx="230" cy="190" r="6" fill="#D2FDFF" stroke="#1E2544" strokeWidth="2" />

        {/* Horizontal Interconnects between floating nodes */}
        <path
          d="M145 65 Q 185 35 230 30 Q 275 35 315 70"
          fill="none"
          stroke="#D2FDFF"
          strokeWidth="1.8"
          strokeOpacity="0.9"
        />
        <path
          d="M145 65 Q 185 105 230 95 Q 275 105 315 70"
          fill="none"
          stroke="#F4976C"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />

        {/* Decorative mini badges */}
        <g transform="translate(290, 18)">
          <rect width="68" height="22" rx="11" fill="rgba(30, 37, 68, 0.85)" stroke="#B4DFE5" strokeWidth="1" filter="url(#authShadowFilter)" />
          <circle cx="11" cy="11" r="3.5" fill="#FBE8A6" />
          <text x="21" y="15" fill="#D2FDFF" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
            VERIFIED
          </text>
        </g>

        <g transform="translate(85, 175)">
          <rect width="94" height="22" rx="11" fill="rgba(30, 37, 68, 0.85)" stroke="#FBE8A6" strokeWidth="1" filter="url(#authShadowFilter)" />
          <circle cx="11" cy="11" r="3.5" fill="#F4976C" />
          <text x="21" y="15" fill="#FBE8A6" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
            EVIDENCE-LED
          </text>
        </g>
      </svg>
    </div>
  );
}
