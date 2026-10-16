import { usePrefersReducedMotion } from "./MotionPrimitives";

/**
 * AuthVisualAccent: Layered isometric SVG synthesis graphic
 * representing causal knowledge networks, evidence nodes, and learning synthesis
 * utilizing the 5 exact OVAEL-X brand colors.
 */
export function AuthVisualAccent({
  className = "",
  isLogin = true,
}: {
  className?: string;
  isLogin?: boolean;
}) {
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
          {/* Soft ambient breathing light behind central lattice */}
          <radialGradient id="authAmbientGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#F4976C" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#D2FDFF" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#B4DFE5" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#1E2544" stopOpacity="0" />
          </radialGradient>

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

        {/* Ambient background illumination */}
        <ellipse
          cx="230"
          cy="115"
          rx="185"
          ry="95"
          fill="url(#authAmbientGlow)"
          className="auth-accent-ambient"
        />

        {/* Subtle ambient coordinate accents */}
        <g className="auth-micro-drift-1" opacity="0.6">
          <rect x="88" y="42" width="5" height="5" transform="rotate(45 90.5 44.5)" stroke="#D2FDFF" strokeWidth="0.8" fill="none" />
        </g>
        <g className="auth-micro-drift-2" opacity="0.5">
          <rect x="368" y="148" width="4.5" height="4.5" transform="rotate(45 370.25 150.25)" stroke="#FBE8A6" strokeWidth="0.8" fill="none" />
        </g>
        <g opacity="0.35">
          <path d="M380 46 L380 54 M376 50 L384 50" stroke="#B4DFE5" strokeWidth="0.75" />
          <path d="M76 116 L76 124 M72 120 L80 120" stroke="#B4DFE5" strokeWidth="0.75" />
        </g>

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

        {/* Primary Central Knowledge Plane (Card with subtle float) */}
        <g filter="url(#authShadowFilter)" className="auth-accent-floating-card">
          <path
            d="M230 75 L360 135 L230 195 L100 135 Z"
            fill="url(#cardGrad1)"
            stroke="#B4DFE5"
            strokeWidth="1.5"
            strokeOpacity="0.65"
          />
        </g>

        {/* Core Synthesized Causal Edges (subtle breathing pulse) */}
        <path
          d="M170 125 L230 95 L290 125 L230 155 Z"
          fill="#FBE8A6"
          fillOpacity="0.22"
          stroke="#FBE8A6"
          strokeWidth="1.5"
          className="auth-accent-core-pulse"
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
        <circle cx="145" cy="65" r="14" fill="#F4976C" fillOpacity="0.25" className="auth-node-aura">
          {isLogin && !prefersReduced && (
            <animate
              attributeName="r"
              values="11;17;11"
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
          className="auth-connection-line"
        />
        {/* Central Vertical Energy Pulse */}
        {isLogin && !prefersReduced && (
          <circle r="2.5" fill="#D2FDFF" opacity="0.85">
            <animateMotion
              path="M230 190 L230 95 L230 30"
              dur="3.8s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        <circle cx="230" cy="30" r="16" stroke="#FBE8A6" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" className="auth-node-aura-b" />
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
        {/* Upper Track: Smooth Curved Interconnect */}
        <path
          d="M145 65 Q 185 35 230 30 Q 275 35 315 70"
          fill="none"
          stroke="#D2FDFF"
          strokeWidth="1.8"
          strokeOpacity="0.85"
        />
        {/* Traveling Energy Packet along Upper Track */}
        {isLogin && !prefersReduced && (
          <g className="auth-traveling-packet">
            <circle r="3" fill="#FBE8A6">
              <animateMotion
                path="M145 65 Q 185 35 230 30 Q 275 35 315 70"
                dur="4.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="7" fill="#FBE8A6" fillOpacity="0.25">
              <animateMotion
                path="M145 65 Q 185 35 230 30 Q 275 35 315 70"
                dur="4.8s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Lower Track: Animated Causal Stream */}
        <path
          d="M145 65 Q 185 105 230 95 Q 275 105 315 70"
          fill="none"
          stroke="#F4976C"
          strokeWidth="1.6"
          strokeDasharray="4 3"
          className="auth-accent-stream-line"
        />

        {/* Decorative mini badges */}
        <g transform="translate(290, 18)" className="auth-accent-badge-a">
          <rect width="68" height="22" rx="11" fill="rgba(30, 37, 68, 0.85)" stroke="#B4DFE5" strokeWidth="1" filter="url(#authShadowFilter)" />
          <circle cx="11" cy="11" r="3.5" fill="#FBE8A6" />
          <text x="21" y="15" fill="#D2FDFF" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
            VERIFIED
          </text>
        </g>

        <g transform="translate(85, 175)" className="auth-accent-badge-b">
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
