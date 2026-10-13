import React, { useId, useRef, useState, useEffect, useCallback } from 'react';

export interface ProgressionMotionVisualProps {
  /** Visual presentation variant */
  variant?: 'editorial' | 'compact';
  /** Optional custom CSS class */
  className?: string;
  /** Accessible description for conceptual illustration */
  ariaLabel?: string;
}

type NodeKey = 'origin' | 'inflection' | 'destination';

interface Point2D {
  x: number;
  y: number;
}

interface SamplePoint {
  distance: number;
  x: number;
  y: number;
}

/**
 * Single source of truth for the learning-track node coordinates and cubic Bézier curve.
 * - Origin: (40, 205) — curve start point
 * - Inflection: (215, 75) — exact C1 junction between the first and second cubic Bézier segments
 * - Destination: (330, 100) — curve endpoint
 */
const TRACK_NODES: Record<NodeKey, Point2D> = {
  origin: { x: 40, y: 205 },
  inflection: { x: 215, y: 75 },
  destination: { x: 330, y: 100 },
};

const CURVE_PATH = `M ${TRACK_NODES.origin.x} ${TRACK_NODES.origin.y} C 110 205, 140 75, ${TRACK_NODES.inflection.x} ${TRACK_NODES.inflection.y} C 275 75, 300 135, ${TRACK_NODES.destination.x} ${TRACK_NODES.destination.y}`;

// Minimum separation along the curve between adjacent stations (in SVG path units)
const MIN_NODE_GAP = 28;

const NODE_NAMES: Record<NodeKey, string> = {
  origin: 'Origin Station',
  inflection: 'Intermediate Junction Station',
  destination: 'Destination Focal Station',
};

const NODE_LABELS: Record<NodeKey, string> = {
  origin: 'Interactive origin learning station (use arrow keys or drag along path)',
  inflection: 'Interactive intermediate junction station (use arrow keys or drag along path)',
  destination: 'Interactive destination focal station (use arrow keys or drag along path)',
};

/**
 * Pre-samples the actual SVG curve to enable sub-millisecond nearest-point projection.
 */
function samplePath(path: SVGPathElement, sampleCount = 200): SamplePoint[] {
  const totalLength = path.getTotalLength();
  const samples: SamplePoint[] = [];
  const step = totalLength / (sampleCount - 1);
  for (let i = 0; i < sampleCount; i++) {
    const d = Math.min(i * step, totalLength);
    const pt = path.getPointAtLength(d);
    samples.push({ distance: d, x: pt.x, y: pt.y });
  }
  return samples;
}

/**
 * Finds the exact distance along the SVG path that is closest to target coordinates (x, y).
 * Uses two-pass search (coarse sample sweep + fine local refinement) for <0.1px precision.
 */
function findClosestDistance(
  target: Point2D,
  samples: SamplePoint[],
  path: SVGPathElement
): number {
  if (samples.length === 0) return 0;

  // 1. Coarse sample search
  let bestIdx = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = samples[i].x - target.x;
    const dy = samples[i].y - target.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }

  // 2. Fine local refinement
  const totalLength = path.getTotalLength();
  const sampleStep = totalLength / (samples.length - 1);
  const minD = Math.max(0, samples[bestIdx].distance - sampleStep);
  const maxD = Math.min(totalLength, samples[bestIdx].distance + sampleStep);

  const steps = 14;
  const fineStep = (maxD - minD) / steps;
  let refinedD = samples[bestIdx].distance;
  let refinedDistSq = bestDistSq;

  for (let s = 0; s <= steps; s++) {
    const testD = minD + s * fineStep;
    const pt = path.getPointAtLength(testD);
    const dx = pt.x - target.x;
    const dy = pt.y - target.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < refinedDistSq) {
      refinedDistSq = dSq;
      refinedD = testD;
    }
  }

  return refinedD;
}

/**
 * Transforms pointer screen coordinates (clientX, clientY) into SVG user coordinates (viewBox space).
 * Automatically accounts for responsive scaling, letterboxing, scroll offsets, and CSS transforms.
 */
function getSvgCoordinates(svg: SVGSVGElement, clientX: number, clientY: number): Point2D | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

/**
 * OVAEL-X Signature Curved Learning-Path Illustration (PROGRESSION).
 *
 * Geometry & Interactive Architecture:
 * - Every track layer (shadow, lower bevel, charcoal outline, Recycled Cotton bed,
 *   centerline groove, and animated orange trajectory) references `CURVE_PATH`.
 * - Nodes are directly draggable with pointer events and keyboard-accessible sliders,
 *   strictly constrained to the mathematical SVG curve via SVG geometry APIs.
 * - Node ordering is preserved: origin < intermediate < destination with minimum gap.
 * - Outer `<g transform="translate(x y)">` positions the node on the curve centerline.
 * - Inner `<g className="auth-editorial-motif__anchor ...">` controls subtle scale/contrast.
 * - The traveling orange marker uses SVG-native `<animateMotion>` with `<mpath>`
 *   referencing the trajectory `<path id={curveId}>`.
 */
export const ProgressionMotionVisual: React.FC<ProgressionMotionVisualProps> = ({
  variant = 'editorial',
  className = '',
  ariaLabel = 'Interactive geometric curved learning-track illustration with draggable stations',
}) => {
  const uid = useId().replace(/:/g, '');
  const curveId = `learningPathCurve-${uid}`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const samplesRef = useRef<SamplePoint[]>([]);
  const totalLengthRef = useRef<number>(368);
  const dragPointerIdRef = useRef<number | null>(null);

  // Default positions for SSR and initial render
  const [nodePositions, setNodePositions] = useState<Record<NodeKey, Point2D>>({
    origin: TRACK_NODES.origin,
    inflection: TRACK_NODES.inflection,
    destination: TRACK_NODES.destination,
  });

  const [nodeDistances, setNodeDistances] = useState<Record<NodeKey, number>>({
    origin: 0,
    inflection: 236,
    destination: 368,
  });

  const nodeDistancesRef = useRef<Record<NodeKey, number>>({
    origin: 0,
    inflection: 236,
    destination: 368,
  });

  const [activeDragNode, setActiveDragNode] = useState<NodeKey | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeKey | null>(null);
  const [hasMovedDestination, setHasMovedDestination] = useState<boolean>(false);

  // Initialize path geometry and initial distances on client mount
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    try {
      const totalLength = path.getTotalLength();
      totalLengthRef.current = totalLength;
      const samples = samplePath(path, 200);
      samplesRef.current = samples;

      // Find exact distance along curve for the intermediate junction node (215, 75)
      const dInflection = findClosestDistance(TRACK_NODES.inflection, samples, path);
      const ptInflection = path.getPointAtLength(dInflection);

      const initialDistances: Record<NodeKey, number> = {
        origin: 0,
        inflection: dInflection,
        destination: totalLength,
      };

      nodeDistancesRef.current = initialDistances;
      setNodeDistances(initialDistances);

      setNodePositions({
        origin: TRACK_NODES.origin,
        inflection: { x: ptInflection.x, y: ptInflection.y },
        destination: TRACK_NODES.destination,
      });
    } catch {
      // Fallback gracefully in environments without full SVG DOM metrics
    }
  }, []);

  /**
   * Calculates the permitted distance range along the curve for a given node,
   * enforcing strict node ordering and minimum separation.
   */
  const getValidDistanceBounds = useCallback((key: NodeKey): { min: number; max: number } => {
    const total = totalLengthRef.current || 368;
    const dists = nodeDistancesRef.current;

    switch (key) {
      case 'origin':
        return {
          min: 0,
          max: Math.max(0, dists.inflection - MIN_NODE_GAP),
        };
      case 'inflection':
        return {
          min: Math.min(total, dists.origin + MIN_NODE_GAP),
          max: Math.max(0, dists.destination - MIN_NODE_GAP),
        };
      case 'destination':
        return {
          min: Math.min(total, dists.inflection + MIN_NODE_GAP),
          max: total,
        };
    }
  }, []);

  /**
   * Moves a node to a specific distance along the curve, constrained to valid bounds.
   */
  const moveNodeToDistance = useCallback(
    (key: NodeKey, targetD: number) => {
      const path = pathRef.current;
      if (!path) return;

      const bounds = getValidDistanceBounds(key);
      const clampedD = Math.max(bounds.min, Math.min(bounds.max, targetD));
      const pt = path.getPointAtLength(clampedD);

      nodeDistancesRef.current = {
        ...nodeDistancesRef.current,
        [key]: clampedD,
      };

      setNodeDistances((prev) => ({ ...prev, [key]: clampedD }));
      setNodePositions((prev) => ({ ...prev, [key]: { x: pt.x, y: pt.y } }));

      if (key === 'destination' && Math.abs(clampedD - (totalLengthRef.current || 368)) > 3) {
        setHasMovedDestination(true);
      }
    },
    [getValidDistanceBounds]
  );

  // --- Pointer Drag Handlers ---
  const handlePointerDown = (key: NodeKey, e: React.PointerEvent<SVGCircleElement>) => {
    // Only primary mouse button or touch/pen
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }

    dragPointerIdRef.current = e.pointerId;
    setActiveDragNode(key);
  };

  const handlePointerMove = (key: NodeKey, e: React.PointerEvent<SVGCircleElement>) => {
    if (activeDragNode !== key || dragPointerIdRef.current !== e.pointerId) return;
    if (!svgRef.current || !pathRef.current) return;

    const svgPt = getSvgCoordinates(svgRef.current, e.clientX, e.clientY);
    if (!svgPt) return;

    const rawD = findClosestDistance(svgPt, samplesRef.current, pathRef.current);
    moveNodeToDistance(key, rawD);
  };

  const handlePointerUp = (key: NodeKey, e: React.PointerEvent<SVGCircleElement>) => {
    if (activeDragNode === key) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
      dragPointerIdRef.current = null;
      setActiveDragNode(null);
    }
  };

  const handlePointerCancel = (key: NodeKey, e: React.PointerEvent<SVGCircleElement>) => {
    handlePointerUp(key, e);
  };

  // --- Keyboard Slider Handlers ---
  const handleKeyDown = (key: NodeKey, e: React.KeyboardEvent<SVGCircleElement>) => {
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      delta = 8; // step 8px along curve
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      delta = -8;
    } else if (e.key === 'PageUp') {
      delta = 24;
    } else if (e.key === 'PageDown') {
      delta = -24;
    } else if (e.key === 'Home') {
      delta = -9999;
    } else if (e.key === 'End') {
      delta = 9999;
    } else {
      return;
    }

    e.preventDefault();
    const currentD = nodeDistancesRef.current[key];
    moveNodeToDistance(key, currentD + delta);
  };

  const totalLen = totalLengthRef.current || 368;
  const originPct = Math.round((nodeDistances.origin / totalLen) * 100);
  const inflectionPct = Math.round((nodeDistances.inflection / totalLen) * 100);
  const destinationPct = Math.round((nodeDistances.destination / totalLen) * 100);

  return (
    <div
      className={`ovael-progression ovael-progression--${variant} ${
        activeDragNode ? 'ovael-progression--is-dragging' : ''
      } ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 360 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="auth-editorial-motif-svg ovael-progression__svg"
      >
        <defs>
          {/* Warm Recycled Cotton (#F5E7C6) Channel Bed */}
          <linearGradient
            id={`progBed-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#F5E7C6" />
            <stop offset="55%" stopColor="#EFE0BC" />
            <stop offset="100%" stopColor="#F5E7C6" />
          </linearGradient>

          {/* Subtle Lower Depth Rim */}
          <linearGradient
            id={`progWall-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#222222" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#FF6D1F" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF6D1F" stopOpacity="0.68" />
          </linearGradient>

          {/* Primary Progressive Orange Trajectory Gradient */}
          <linearGradient
            id={`editorialGrad-${uid}`}
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y}
            x2={TRACK_NODES.destination.x}
            y2={TRACK_NODES.destination.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF6D1F" />
            <stop offset="50%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#E55B10" />
          </linearGradient>

          {/* Studio-Lit Travelling Accent Collar */}
          <radialGradient id={`progSphere-${uid}`} cx="35%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#FAF3E1" />
            <stop offset="100%" stopColor="#E5D5B2" />
          </radialGradient>

          {/* Destination Node Outer Ring Fill */}
          <radialGradient id={`progTangerineCap-${uid}`} cx="36%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FF8542" />
            <stop offset="55%" stopColor="#FF6D1F" />
            <stop offset="100%" stopColor="#D9530F" />
          </radialGradient>
        </defs>

        {/* 1. Delicate Architectural Registration Crosshairs & Station Datum Lines */}
        <g
          opacity="0.35"
          stroke="rgba(34, 34, 34, 0.25)"
          strokeWidth="1"
          className="auth-editorial-motif__grid ovael-progression__grid"
          aria-hidden="true"
        >
          <path d="M 36 40 H 44 M 40 36 V 44" />
          <path d="M 326 240 H 334 M 330 236 V 244" />
          <line
            x1={TRACK_NODES.origin.x}
            y1="250"
            x2={TRACK_NODES.destination.x}
            y2="250"
            strokeDasharray="3 6"
            stroke="rgba(34, 34, 34, 0.14)"
          />
          <line
            x1={TRACK_NODES.origin.x}
            y1={TRACK_NODES.origin.y + 13}
            x2={TRACK_NODES.origin.x}
            y2="250"
            strokeDasharray="2 3"
            stroke="rgba(34, 34, 34, 0.16)"
          />
          <line
            x1={TRACK_NODES.inflection.x}
            y1={TRACK_NODES.inflection.y + 13}
            x2={TRACK_NODES.inflection.x}
            y2="250"
            strokeDasharray="2 4"
            stroke="rgba(34, 34, 34, 0.12)"
          />
          <line
            x1={TRACK_NODES.destination.x}
            y1={TRACK_NODES.destination.y + 15}
            x2={TRACK_NODES.destination.x}
            y2="250"
            strokeDasharray="2 3"
            stroke="rgba(34, 34, 34, 0.16)"
          />
        </g>

        {/* 2. Secondary Supporting Echo Contour (parallel reference offset from CURVE_PATH) */}
        <path
          className="auth-editorial-motif__echo"
          d={CURVE_PATH}
          transform="translate(0 16)"
          stroke="rgba(34, 34, 34, 0.15)"
          strokeWidth="1.25"
          strokeDasharray="4 6"
          aria-hidden="true"
        />

        {/* 3. Static Supporting Track Layers (All sharing CURVE_PATH as single geometric reference) */}
        {/* Soft contact shadow beneath the track */}
        <path
          d={CURVE_PATH}
          transform="translate(0 5)"
          stroke="rgba(34, 34, 34, 0.07)"
          strokeWidth="16"
          strokeLinecap="round"
          aria-hidden="true"
        />
        {/* Lower 2.5D bevel accent */}
        <path
          d={CURVE_PATH}
          transform="translate(0 2)"
          stroke={`url(#progWall-${uid})`}
          strokeWidth="14"
          strokeLinecap="round"
          className="ovael-progression__wall"
          aria-hidden="true"
        />
        {/* Charcoal structural track outline (#222222) */}
        <path
          d={CURVE_PATH}
          stroke="#222222"
          strokeWidth="14"
          strokeLinecap="round"
          strokeOpacity="0.9"
          aria-hidden="true"
        />
        {/* Warm Recycled Cotton (#F5E7C6) inner track bed */}
        <path
          d={CURVE_PATH}
          stroke={`url(#progBed-${uid})`}
          strokeWidth="11.5"
          strokeLinecap="round"
          className="ovael-progression__bed"
          aria-hidden="true"
        />
        {/* Subtle static centerline guide groove */}
        <path
          d={CURVE_PATH}
          stroke="rgba(34, 34, 34, 0.16)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="2 4"
          aria-hidden="true"
        />

        {/* 4. Primary Animated Orange Trajectory (Draws progressively from origin to destination) */}
        <path
          ref={pathRef}
          id={curveId}
          className="auth-editorial-motif__trajectory ovael-progression__rail"
          d={CURVE_PATH}
          stroke={`url(#editorialGrad-${uid})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength="100"
          aria-hidden="true"
        />

        {/* 5. Node 1: Origin Station — Draggable along curve */}
        <g
          className={`ovael-progression__node-pos ovael-progression__node-pos--origin ${
            activeDragNode === 'origin' ? 'ovael-progression__node-pos--dragging' : ''
          } ${hoveredNode === 'origin' ? 'ovael-progression__node-pos--hovered' : ''}`.trim()}
          transform={`translate(${nodePositions.origin.x} ${nodePositions.origin.y})`}
        >
          {/* Contact shadow */}
          <circle cx="0" cy="2" r="10.5" fill="rgba(34, 34, 34, 0.14)" aria-hidden="true" />
          {/* Inner animation and visual presentation */}
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--origin" aria-hidden="true">
            <circle cx="0" cy="0" r="10" fill="#F5E7C6" stroke="#222222" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="5.6" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--origin"
            />
          </g>
          {/* Comfortable 44px hit-target for mouse, pen, touch dragging and keyboard accessibility */}
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="transparent"
            pointerEvents="all"
            className="ovael-progression__hit-target"
            tabIndex={0}
            role="slider"
            aria-label={NODE_LABELS.origin}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={originPct}
            aria-valuetext={`${NODE_NAMES.origin} at ${originPct}% of learning path`}
            onPointerDown={(e) => handlePointerDown('origin', e)}
            onPointerMove={(e) => handlePointerMove('origin', e)}
            onPointerUp={(e) => handlePointerUp('origin', e)}
            onPointerCancel={(e) => handlePointerCancel('origin', e)}
            onKeyDown={(e) => handleKeyDown('origin', e)}
            onMouseEnter={() => setHoveredNode('origin')}
            onMouseLeave={() => setHoveredNode(null)}
          />
        </g>

        {/* 6. Node 2: Intermediate Station — Draggable along curve */}
        <g
          className={`ovael-progression__node-pos ovael-progression__node-pos--inflection ${
            activeDragNode === 'inflection' ? 'ovael-progression__node-pos--dragging' : ''
          } ${hoveredNode === 'inflection' ? 'ovael-progression__node-pos--hovered' : ''}`.trim()}
          transform={`translate(${nodePositions.inflection.x} ${nodePositions.inflection.y})`}
        >
          {/* Contact shadow */}
          <circle cx="0" cy="2" r="10.5" fill="rgba(34, 34, 34, 0.14)" aria-hidden="true" />
          {/* Inner animation and visual presentation */}
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--inflection" aria-hidden="true">
            <circle cx="0" cy="0" r="9.5" fill="#F5E7C6" stroke="#222222" strokeWidth="1.5" />
            <path
              d="M 0 -6.6 L 6.6 0 L 0 6.6 L -6.6 0 Z"
              fill="#FAF3E1"
              stroke="#222222"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--inflection"
            />
          </g>
          {/* Comfortable 44px hit-target */}
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="transparent"
            pointerEvents="all"
            className="ovael-progression__hit-target"
            tabIndex={0}
            role="slider"
            aria-label={NODE_LABELS.inflection}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={inflectionPct}
            aria-valuetext={`${NODE_NAMES.inflection} at ${inflectionPct}% of learning path`}
            onPointerDown={(e) => handlePointerDown('inflection', e)}
            onPointerMove={(e) => handlePointerMove('inflection', e)}
            onPointerUp={(e) => handlePointerUp('inflection', e)}
            onPointerCancel={(e) => handlePointerCancel('inflection', e)}
            onKeyDown={(e) => handleKeyDown('inflection', e)}
            onMouseEnter={() => setHoveredNode('inflection')}
            onMouseLeave={() => setHoveredNode(null)}
          />
        </g>

        {/* 7. Node 3: Destination Focal Station — Draggable along curve */}
        <g
          className={`ovael-progression__node-pos ovael-progression__node-pos--destination ${
            activeDragNode === 'destination' ? 'ovael-progression__node-pos--dragging' : ''
          } ${hoveredNode === 'destination' ? 'ovael-progression__node-pos--hovered' : ''}`.trim()}
          transform={`translate(${nodePositions.destination.x} ${nodePositions.destination.y})`}
        >
          {/* Contact shadow */}
          <circle cx="0" cy="2.2" r="11.5" fill="rgba(34, 34, 34, 0.16)" aria-hidden="true" />
          {/* Inner animation and visual presentation */}
          <g className="auth-editorial-motif__anchor auth-editorial-motif__anchor--destination" aria-hidden="true">
            <circle
              cx="0"
              cy="0"
              r="15"
              fill="none"
              stroke="#FF6D1F"
              strokeWidth="1.1"
              strokeDasharray="2.5 3.5"
              opacity="0.48"
              className="ovael-progression__dest-ring"
            />
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={`url(#progTangerineCap-${uid})`}
              stroke="#222222"
              strokeWidth="1.5"
            />
            <circle cx="0" cy="0" r="6.2" fill="#FAF3E1" stroke="#222222" strokeWidth="1.25" />
            <circle
              cx="0"
              cy="0"
              r="2.6"
              fill="#FF6D1F"
              className="ovael-progression__node-core ovael-progression__node-core--destination"
            />
          </g>
          {/* Comfortable 44px hit-target */}
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="transparent"
            pointerEvents="all"
            className="ovael-progression__hit-target"
            tabIndex={0}
            role="slider"
            aria-label={NODE_LABELS.destination}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={destinationPct}
            aria-valuetext={`${NODE_NAMES.destination} at ${destinationPct}% of learning path`}
            onPointerDown={(e) => handlePointerDown('destination', e)}
            onPointerMove={(e) => handlePointerMove('destination', e)}
            onPointerUp={(e) => handlePointerUp('destination', e)}
            onPointerCancel={(e) => handlePointerCancel('destination', e)}
            onKeyDown={(e) => handleKeyDown('destination', e)}
            onMouseEnter={() => setHoveredNode('destination')}
            onMouseLeave={() => setHoveredNode(null)}
          />
        </g>

        {/* 8. Traveling Orange Accent — Follows #learningPathCurve via native SVG animateMotion + mpath during entrance */}
        {!hasMovedDestination && (
          <g className="auth-editorial-motif__tracer ovael-progression__sphere-rig" aria-hidden="true">
            <animateMotion
              dur="0.86s"
              begin="0s"
              fill="freeze"
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.22 1 0.36 1"
            >
              <mpath href={`#${curveId}`} />
            </animateMotion>
            <circle
              cx="0"
              cy="0"
              r="6.2"
              fill={`url(#progSphere-${uid})`}
              stroke="#222222"
              strokeWidth="1.25"
            />
            <g className="ovael-progression__sphere-roll">
              <circle cx="0" cy="0" r="2.6" fill="#FF6D1F" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};


