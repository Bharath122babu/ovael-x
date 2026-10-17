import React from "react";
import { usePrefersReducedMotion } from "./MotionPrimitives";

export type AuthFeatureKey = "sources" | "gaps" | "memory";

export interface AuthVisualAccentProps {
  mode?: "signin" | "register";
  online?: boolean;
  className?: string;
  isLogin?: boolean;
  activeFeature?: AuthFeatureKey | null;
}

/**
 * Restrained Nothing-inspired monochromatic dot-matrix motif.
 * 8x6 precision dot matrix with deliberate active-index patterns,
 * fine calibration hairlines, and technical index annotation.
 * Pure SVG + CSS; static under prefers-reduced-motion.
 */
export const AuthVisualAccent: React.FC<AuthVisualAccentProps> = ({
  mode,
  online = true,
  className = "",
  isLogin = true,
  activeFeature: _activeFeature = null,
}) => {
  const prefersReduced = usePrefersReducedMotion();
  const effectiveMode: "signin" | "register" =
    mode ?? (isLogin ? "signin" : "register");

  // 8x6 precision dot matrix with deliberate active-index pattern
  const rows = 6;
  const cols = 8;
  const activeIndices =
    effectiveMode === "signin"
      ? new Set(["0-0", "0-1", "0-7", "1-0", "2-3", "2-4", "3-3", "3-4", "5-0", "5-7"])
      : new Set(["0-0", "0-7", "1-3", "1-4", "2-2", "2-5", "3-2", "3-5", "4-3", "4-4", "5-0", "5-7"]);

  return (
    <aside
      className={`ovael-auth-motif ${prefersReduced ? "ovael-auth-motif--reduced-motion" : ""} ${className}`.trim()}
      aria-hidden="true"
      data-testid="auth-dot-matrix-motif"
    >
      <div className="ovael-auth-motif__meta">
        <span className="ovael-auth-motif__index">INDEX // 01</span>
        <span className="ovael-auth-motif__coord">
          {effectiveMode === "signin" ? "AUTH.SIGNIN" : "AUTH.REGISTER"}
        </span>
      </div>

      <svg
        className="ovael-auth-motif__svg"
        width="108"
        height="78"
        viewBox="0 0 108 78"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fine calibration hairlines */}
        <line
          x1="0"
          y1="6"
          x2="108"
          y2="6"
          stroke="#D6D6D6"
          strokeWidth="0.75"
          strokeDasharray="2 4"
        />
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="78"
          stroke="#D6D6D6"
          strokeWidth="0.75"
          strokeDasharray="2 4"
        />

        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const key = `${r}-${c}`;
            const isPrimary = activeIndices.has(key);
            const cx = 6 + c * 13.5;
            const cy = 6 + r * 13;
            return (
              <circle
                key={key}
                cx={cx}
                cy={cy}
                r={isPrimary ? 2.2 : 1.25}
                fill={isPrimary ? "#111111" : "#D6D6D6"}
                className={
                  isPrimary
                    ? "ovael-auth-motif__dot--active"
                    : "ovael-auth-motif__dot"
                }
              />
            );
          })
        )}
      </svg>

      <div className="ovael-auth-motif__status">
        <span
          className={`ovael-auth-motif__led ${
            online ? "ovael-auth-motif__led--online" : "ovael-auth-motif__led--offline"
          }`}
        />
        <span>{online ? "NODE READY" : "LOCAL MODE"}</span>
      </div>
    </aside>
  );
};

export default AuthVisualAccent;
