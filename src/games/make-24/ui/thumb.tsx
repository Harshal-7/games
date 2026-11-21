/** Card picture for the games list: a lime card with 24 and the four signs. */
export function Make24Thumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb" aria-hidden="true">
      <rect x="0.5" y="0.5" width="91" height="123" rx="10" style={{ fill: "var(--lime)", stroke: "var(--ink)" }} />
      <rect x="6" y="6" width="80" height="112" rx="6" style={{ fill: "none", stroke: "var(--ink)", strokeOpacity: 0.45, strokeWidth: 1.5 }} />
      <text x="46" y="74" textAnchor="middle" style={{ fontFamily: "var(--display)", fontSize: 38, fontWeight: 700, fill: "var(--ink)" }}>
        24
      </text>
      <g textAnchor="middle" style={{ fontFamily: "var(--num)", fontSize: 17, fontWeight: 500, fill: "var(--ink)" }}>
        <text x="22" y="30">+</text>
        <text x="70" y="30">−</text>
        <text x="22" y="106">×</text>
        <text x="70" y="106">÷</text>
      </g>
    </svg>
  );
}
