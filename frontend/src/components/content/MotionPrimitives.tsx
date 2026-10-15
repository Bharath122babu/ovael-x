import { useEffect, useState, useRef, type ReactNode, type CSSProperties } from "react";

/**
 * Hook to check if the user prefers reduced motion.
 * Automatically synchronizes with system accessibility preferences.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", listener);
      return () => mediaQueryList.removeEventListener("change", listener);
    } else {
      // Compatibility for older browser environments
      mediaQueryList.addListener(listener);
      return () => mediaQueryList.removeListener(listener);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * ScrollReveal component: smoothly fades and slides in elements
 * when they enter the viewport, respecting prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [prefersReduced]);

  const style: CSSProperties = prefersReduced
    ? {}
    : {
        transitionProperty: "opacity, transform",
        transitionDuration: "400ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(16px)",
      };

  return (
    <div ref={elementRef} className={`scroll-reveal ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * ExpandableSection: smooth collapsible content container
 * using CSS Grid row animation.
 */
export function ExpandableSection({
  isOpen,
  children,
  className = "",
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: prefersReduced ? "none" : "grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  };

  return (
    <div className={`motion-expandable-grid ${className}`} style={gridStyle}>
      <div style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/**
 * AnimatedProgressBar: accessible, smoothly animated horizontal progress bar
 * using the OVAEL-X brand palette tokens.
 */
export function AnimatedProgressBar({
  value,
  max = 100,
  label,
  variant = "navy",
  className = "",
}: {
  value: number;
  max?: number;
  label?: string;
  variant?: "navy" | "coral" | "yellow" | "soft-blue";
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const variantColor =
    variant === "coral"
      ? "var(--brand-coral)"
      : variant === "yellow"
        ? "var(--brand-yellow)"
        : variant === "soft-blue"
          ? "var(--brand-soft-blue)"
          : "var(--brand-navy)";

  return (
    <div
      className={`progress-bar-container ${className}`}
      role="progressbar"
      aria-label={label || "Progress"}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "var(--brand-soft-blue-subtle, #EBF7F9)",
          borderRadius: "9999px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: variantColor,
            borderRadius: "9999px",
            transition: prefersReduced
              ? "none"
              : "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * RadialGauge: accessible SVG circular progress gauge
 * themed with the brand palette.
 */
export function RadialGauge({
  value,
  max = 100,
  size = 72,
  strokeWidth = 6,
  label,
  variant = "coral",
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  variant?: "coral" | "navy" | "yellow" | "soft-blue";
}) {
  const prefersReduced = usePrefersReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color =
    variant === "coral"
      ? "var(--brand-coral)"
      : variant === "yellow"
        ? "var(--brand-yellow)"
        : variant === "soft-blue"
          ? "var(--brand-soft-blue)"
          : "var(--brand-navy)";

  return (
    <div
      className="radial-gauge-container"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || "Gauge"}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--brand-soft-blue-subtle, #EBF7F9)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: prefersReduced
              ? "none"
              : "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: size * 0.28,
          fontWeight: 700,
          color: "var(--brand-navy)",
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}
