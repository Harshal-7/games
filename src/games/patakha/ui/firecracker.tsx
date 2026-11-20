"use client";

import { useId, useState } from "react";

/**
 * The patakha: a fat marigold cracker with red caps and a twisted fuse. Lit, a spark
 * fizzes at the tip of the fuse. The fuse never burns down and the spark flickers at
 * the same pace all round, so the drawing says nothing about the time left.
 */
export function Firecracker({ lit, className }: { lit: boolean; className?: string }) {
  const clip = `${useId()}-body`;
  return (
    <svg
      viewBox="0 0 160 124"
      className={["pk-cracker", className].filter(Boolean).join(" ")}
      data-lit={lit}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="74" cy="114" rx="48" ry="6" className="pk-cracker-shadow" />
      <g transform="rotate(-24 70 72)">
        <clipPath id={clip}>
          <rect x="18" y="52" width="104" height="40" rx="8" />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          <rect x="18" y="52" width="104" height="40" className="pk-cracker-body" />
          <path d="M46 52h13l-12 40H34ZM76 52h13L77 92H64Z" className="pk-cracker-stripe" />
          <rect x="18" y="52" width="15" height="40" className="pk-cracker-cap" />
          <rect x="107" y="52" width="15" height="40" className="pk-cracker-cap" />
        </g>
        <rect x="18" y="52" width="104" height="40" rx="8" className="pk-cracker-edge" />
      </g>
      <path d="M117 51c8-6 2-16 10-22s8-8 6-14" className="pk-fuse" />
      {lit && (
        <g transform="translate(133 15)">
          <g className="pk-spark">
            <circle r="12" className="pk-spark-glow" />
            <path d="M0-17v7M0 10v7M-17 0h7M10 0h7M-12-12l5 5M7 7l5 5M-12 12l5-5M7-7l5-5" className="pk-spark-rays" />
            <circle r="5" className="pk-spark-core" />
          </g>
        </g>
      )}
    </svg>
  );
}

/** A 16-point star, as SVG points: radii alternate between `outer` and `inner`. */
function star(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 32 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / 16 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const OUTER = star(90, 70, 70, 46);
const INNER = star(90, 70, 52, 36);

/**
 * BANG, in a burst. It pops in once; Next replays CSS animations when a kept page shows
 * again, so once it has landed it switches to a still class.
 */
export function Burst({ text = "Bang!" }: { text?: string }) {
  const [landed, setLanded] = useState(false);
  return (
    <svg
      viewBox="0 0 180 140"
      className={landed ? "pk-burst" : "pk-burst is-popping"}
      role="img"
      aria-label={text}
      onAnimationEnd={() => setLanded(true)}
    >
      <polygon points={OUTER} className="pk-burst-outer" />
      <polygon points={INNER} className="pk-burst-inner" />
      <text x="90" y="81" textAnchor="middle" className="pk-burst-text">
        {text}
      </text>
    </svg>
  );
}

/** The flash of the bang, once, across the whole screen. */
export function Flash() {
  const [done, setDone] = useState(false);
  if (done) return null;
  return <div className="pk-flash" aria-hidden="true" onAnimationEnd={() => setDone(true)} />;
}
