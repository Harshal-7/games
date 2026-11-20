/** Card picture for the games list: a night-blue card with a crescent moon and stars. */
export function MafiaThumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb" aria-hidden="true">
      <rect x="0" y="0" width="92" height="124" rx="10" style={{ fill: "var(--night)" }} />
      <rect
        x="5.75"
        y="5.75"
        width="80.5"
        height="112.5"
        rx="6"
        style={{ fill: "none", stroke: "var(--on-night)", strokeWidth: 1.5, opacity: 0.85 }}
      />
      {/* The moon: a cream disc with a night-blue bite out of it. */}
      <circle cx="46" cy="58" r="22" style={{ fill: "var(--on-night)" }} />
      <circle cx="56.5" cy="50" r="19" style={{ fill: "var(--night)" }} />
      {[
        [24, 28, 2.6],
        [69, 84, 2.2],
        [70, 30, 1.6],
        [22, 92, 1.8],
        [52, 100, 1.4],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r * 2}L${x + r * 0.6} ${y - r * 0.6}L${x + r * 2} ${y}L${x + r * 0.6} ${y + r * 0.6}L${x} ${y + r * 2}L${x - r * 0.6} ${y + r * 0.6}L${x - r * 2} ${y}L${x - r * 0.6} ${y - r * 0.6}Z`}
          style={{ fill: "var(--on-night)" }}
        />
      ))}
    </svg>
  );
}
