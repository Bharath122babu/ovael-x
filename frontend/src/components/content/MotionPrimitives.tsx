import {
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";

/**
 * Centralized motion tokens defining standard durations and easings
 * across the OVAEL-X application.
 */
export const MOTION_TOKENS = {
  duration: {
    instant: 100, // micro-interactions, active press, checkbox tick
    fast: 150, // button hovers, dropdown items, tooltips
    base: 200, // active nav changes, control toggles, tab switches
    moderate: 250, // accordion expand/collapse, sliding panels
    panel: 300, // sidebar drawer, modal backdrop blur
    entrance: 350, // page header & section reveals
    slow: 450, // full chart data renders, radial gauge stroke
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)", // fluid default
    out: "cubic-bezier(0.05, 0.7, 0.1, 1.0)", // natural deceleration
    in: "cubic-bezier(0.3, 0, 0.8, 0.15)", // natural acceleration
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.15)", // gentle bounce for chips
    linear: "linear",
  },
} as const;

/**
 * Hook to check if the user prefers reduced motion.
 * Automatically synchronizes with:
 * 1. OS-level media query `(prefers-reduced-motion: reduce)`
 * 2. In-app `.reduce-motion` root class toggled from Settings
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const media =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const docClass =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("reduce-motion");
    return Boolean(media || docClass);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Listen for OS media query changes
    const mediaQueryList = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const handleMediaChange = (event: MediaQueryListEvent) => {
      const docClass = document.documentElement.classList.contains("reduce-motion");
      setPrefersReducedMotion(event.matches || docClass);
    };

    if (mediaQueryList?.addEventListener) {
      mediaQueryList.addEventListener("change", handleMediaChange);
    }

    // 2. Listen for class attribute changes on documentElement (.reduce-motion)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const docClass =
            document.documentElement.classList.contains("reduce-motion");
          const mediaMatches = mediaQueryList ? mediaQueryList.matches : false;
          setPrefersReducedMotion(docClass || mediaMatches);
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      if (mediaQueryList?.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleMediaChange);
      }
      observer.disconnect();
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * PageTransition component: provides smooth, subtle entrance for screens
 * without delaying route/state updates or blanking the viewport.
 */
export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  const style: CSSProperties = prefersReduced
    ? {}
    : {
        animation: "pageFadeIn 220ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both",
      };

  return (
    <div className={`page-transition-wrapper ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * FadeIn component: subtle opacity fade with optional stagger delay.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 200,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  const style: CSSProperties = prefersReduced
    ? {}
    : {
        animation: `pageFadeIn ${duration}ms cubic-bezier(0.05, 0.7, 0.1, 1.0) ${delay}ms both`,
      };

  return (
    <div className={`motion-fade-in ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * SlideIn component: subtle translation & opacity reveal for content panels.
 */
export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();

  const animName =
    direction === "down"
      ? "slideDownFade"
      : direction === "left"
        ? "slideLeftFade"
        : direction === "right"
          ? "slideRightFade"
          : "slideUpFade";

  const style: CSSProperties = prefersReduced
    ? {}
    : {
        animation: `${animName} 240ms cubic-bezier(0.05, 0.7, 0.1, 1.0) ${delay}ms both`,
      };

  return (
    <div className={`motion-slide-in ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * StaggerContainer & StaggerItem: elegant list entrances.
 * Capped to max 6 items so long lists remain performant.
 */
export function StaggerContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`motion-stagger-container ${className}`}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  index = 0,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const cappedIndex = Math.min(index, 6);
  const delay = cappedIndex * 35;

  const style: CSSProperties = prefersReduced
    ? {}
    : {
        animation: `itemSlideUp 200ms cubic-bezier(0.05, 0.7, 0.1, 1.0) ${delay}ms both`,
      };

  return (
    <div className={`motion-stagger-item ${className}`} style={style}>
      {children}
    </div>
  );
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
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
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
        transitionDuration: "300ms",
        transitionTimingFunction: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
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
    transition: prefersReduced
      ? "none"
      : "grid-template-rows 250ms cubic-bezier(0.2, 0, 0, 1)",
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
              : "width 400ms cubic-bezier(0.05, 0.7, 0.1, 1.0)",
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
              : "stroke-dashoffset 450ms cubic-bezier(0.05, 0.7, 0.1, 1.0)",
          }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: size * 0.28,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

/**
 * PulseIndicator: accessible live status indicator dot
 * that smoothly pulses when motion is allowed, and remains steady when reduced.
 */
export function PulseIndicator({
  variant = "active",
  size = 8,
  className = "",
}: {
  variant?: "active" | "warning" | "error" | "syncing";
  size?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  return (
    <span
      className={`pulse-indicator ${variant} ${prefersReduced ? "reduced" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonLoader: accessible placeholder with shimmer or pulse.
 */
export function SkeletonLoader({
  width = "100%",
  height = "20px",
  borderRadius = "6px",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  return (
    <div
      className={`skeleton-loader ${prefersReduced ? "reduced" : ""} ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * InteractiveCard: card container with subtle hover lift and keyboard accessibility.
 */
export function InteractiveCard({
  children,
  onClick,
  className = "",
  selected = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`interactive-motion-card ${selected ? "selected" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * StatusBadge: pill with status dot.
 */
export function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: "stable" | "review" | "uncertain" | "active" | "pending";
  label?: string;
  className?: string;
}) {
  return (
    <span className={`status-pill status-${status} ${className}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label || status}</span>
    </span>
  );
}
