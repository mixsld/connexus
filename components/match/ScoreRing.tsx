"use client";

/**
 * ScoreRing — SVG circular progress ring showing a compatibility score.
 *
 * Design spec (design.md):
 *   - Two concentric <circle> elements: full track + progress arc
 *   - stroke-dasharray / stroke-dashoffset drives the arc length
 *   - UST gold (#F5A623) for the progress arc
 *   - Numeric score label centred inside the ring
 *   - Optional CSS transition on mount when animate=true
 *   - aria-label on the SVG for WCAG 2.1 AA screen-reader support
 */

import { useEffect, useRef, useState } from "react";

export interface ScoreRingProps {
  /** Compatibility score in [0, 100] */
  score: number;
  /** Diameter of the SVG in px. Default: 80 */
  size?: number;
  /** Stroke width in px. Default: 6 */
  strokeWidth?: number;
  /** Animate the arc on mount via CSS transition. Default: false */
  animate?: boolean;
}

export default function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  animate = false,
}: ScoreRingProps) {
  const clampedScore = Math.min(100, Math.max(0, score));

  // Geometry
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // stroke-dashoffset: 0 = full ring, circumference = empty ring
  const targetOffset = circumference * (1 - clampedScore / 100);

  // For the mount animation we start at circumference (empty) and
  // transition to the target offset after the first paint.
  const [offset, setOffset] = useState(animate ? circumference : targetOffset);
  const mounted = useRef(false);

  useEffect(() => {
    if (animate && !mounted.current) {
      mounted.current = true;
      // Defer one frame so the CSS transition fires
      const id = requestAnimationFrame(() => setOffset(targetOffset));
      return () => cancelAnimationFrame(id);
    }
  }, [animate, targetOffset]);

  // Score colour thresholds for the label text (WCAG contrast on white/dark bg)
  const labelColor =
    clampedScore >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : clampedScore >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const fontSize = size <= 64 ? "text-xs" : size <= 96 ? "text-sm" : "text-base";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Compatibility score: ${clampedScore} out of 100`}
      className="shrink-0"
    >
      {/* Track circle — full ring, muted colour */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-gray-700"
      />

      {/* Progress arc — UST gold, rotated so arc starts at 12 o'clock */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#7C3AED"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={
          animate
            ? { transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }
            : undefined
        }
      />

      {/* Score label — centred inside the ring */}
      <foreignObject x={0} y={0} width={size} height={size}>
        <div
          // @ts-expect-error — xmlns required for foreignObject in SVG
          xmlns="http://www.w3.org/1999/xhtml"
          className={`flex h-full w-full items-center justify-center font-semibold tabular-nums ${fontSize} ${labelColor}`}
          aria-hidden="true"
        >
          {clampedScore % 1 === 0
            ? clampedScore
            : clampedScore.toFixed(1)}
        </div>
      </foreignObject>
    </svg>
  );
}
