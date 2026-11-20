import "./imposter.css";

/** Card picture for the games list: three cards, the one in front is the odd one out. */
export function ImposterThumb() {
  return (
    <svg viewBox="0 0 96 96" className="imp-thumb" aria-hidden="true">
      <rect width="96" height="96" className="imp-thumb-bg" />
      {[-15, 15].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 48 86)`}>
          <rect x="27" y="16" width="42" height="58" rx="7" className="imp-thumb-card" />
          <path d="M36 36h24M36 45h15" className="imp-thumb-line" />
        </g>
      ))}
      <rect x="27" y="20" width="42" height="58" rx="7" className="imp-thumb-front" />
      <text x="48" y="60" textAnchor="middle" className="imp-thumb-mark">
        ?
      </text>
    </svg>
  );
}
