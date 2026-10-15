import { usePrefersReducedMotion } from "./MotionPrimitives";

export interface KnowledgeNetworkGraphicProps {
  className?: string;
  size?: number;
  interactive?: boolean;
}

/**
 * KnowledgeNetworkGraphic: Accessible SVG component illustrating
 * causal knowledge graphs, concept dependencies, and learning mastery
 * in the OVAEL-X brand palette.
 */
export function KnowledgeNetworkGraphic({
  className = "",
  size = 280,
}: KnowledgeNetworkGraphicProps) {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <div
      className={`knowledge-network-graphic ${className}`}
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "100%",
      }}
    >
      <svg
        width={size}
        height={size * 0.75}
        viewBox="0 0 320 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="kngShadow" x="-10%" y="-10%" width="125%" height="135%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#303C6C" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Causal connecting lines */}
        <line x1="70" y1="120" x2="160" y2="60" stroke="#B4DFE5" strokeWidth="2" strokeDasharray="4 3" />
        <line x1="160" y1="60" x2="250" y2="100" stroke="#303C6C" strokeWidth="2.5" />
        <line x1="70" y1="120" x2="140" y2="180" stroke="#F4976C" strokeWidth="2" />
        <line x1="140" y1="180" x2="250" y2="100" stroke="#B4DFE5" strokeWidth="1.8" />
        <line x1="160" y1="60" x2="140" y2="180" stroke="#303C6C" strokeWidth="1.5" strokeOpacity="0.3" />

        {/* Central pulsing influence field */}
        <circle cx="160" cy="115" r="42" fill="#D2FDFF" fillOpacity="0.4" />

        {/* Node 1: Prerequisite (Soft Blue) */}
        <g filter="url(#kngShadow)">
          <circle cx="70" cy="120" r="22" fill="#FFFFFF" stroke="#B4DFE5" strokeWidth="3" />
          <circle cx="70" cy="120" r="10" fill="#B4DFE5" />
        </g>
        <text x="70" y="156" fill="#303C6C" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Foundation
        </text>

        {/* Node 2: Core Anchor (Brand Navy) */}
        <g filter="url(#kngShadow)">
          <circle cx="160" cy="60" r="26" fill="#303C6C" stroke="#FBE8A6" strokeWidth="3" />
          <circle cx="160" cy="60" r="12" fill="#FBE8A6" />
        </g>
        <text x="160" y="24" fill="#303C6C" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Core Idea
        </text>

        {/* Node 3: Causal Gap / Practice Target (Coral) */}
        <g filter="url(#kngShadow)">
          <circle cx="140" cy="180" r="20" fill="#FFFFFF" stroke="#F4976C" strokeWidth="3" />
          <circle cx="140" cy="180" r="9" fill="#F4976C" />
          {!prefersReduced && (
            <circle cx="140" cy="180" r="25" stroke="#F4976C" strokeWidth="1" strokeOpacity="0.4">
              <animate
                attributeName="r"
                values="20;30;20"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.6;0;0.6"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
        <text x="140" y="214" fill="#F4976C" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Practice Target
        </text>

        {/* Node 4: Synthesis / Mastery (Yellow + Navy) */}
        <g filter="url(#kngShadow)">
          <circle cx="250" cy="100" r="24" fill="#FBE8A6" stroke="#303C6C" strokeWidth="2.5" />
          <polygon
            points="250,90 253,97 260,98 255,103 257,110 250,106 243,110 245,103 240,98 247,97"
            fill="#303C6C"
          />
        </g>
        <text x="250" y="138" fill="#303C6C" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="system-ui, sans-serif">
          Mastered
        </text>
      </svg>
    </div>
  );
}
