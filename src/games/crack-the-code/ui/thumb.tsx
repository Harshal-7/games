/** Card picture for the games list: a coral card with a guess row, its pegs and a dial. */
export function CrackTheCodeThumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb" aria-hidden="true">
      <rect x="0.5" y="0.5" width="91" height="123" rx="10" style={{ fill: "var(--coral)", stroke: "var(--ink)" }} />
      <rect x="6" y="6" width="80" height="112" rx="6" style={{ fill: "none", stroke: "var(--ink)", strokeOpacity: 0.45, strokeWidth: 1.5 }} />
      <g style={{ fill: "var(--card)", stroke: "var(--ink)", strokeWidth: 2 }}>
        {[14, 31, 48, 65].map((x) => (
          <rect key={x} x={x} y={38} width={15} height={19} rx={3} />
        ))}
      </g>
      <g textAnchor="middle" style={{ fontFamily: "var(--num)", fontSize: 13, fontWeight: 500, fill: "var(--ink)" }}>
        <text x="21.5" y="52">4</text>
        <text x="38.5" y="52">0</text>
        <text x="55.5" y="52">7</text>
        <text x="72.5" y="52">?</text>
      </g>
      <circle cx="34" cy="76" r="5" style={{ fill: "var(--ink)" }} />
      <circle cx="46" cy="76" r="5" style={{ fill: "var(--ink)" }} />
      <circle cx="58" cy="76" r="4.2" style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 2.2 }} />
      <circle cx="46" cy="98" r="9" style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 2 }} />
      <path d="M46 92v6l4 2" style={{ fill: "none", stroke: "var(--ink)", strokeWidth: 2, strokeLinecap: "round" }} />
    </svg>
  );
}
