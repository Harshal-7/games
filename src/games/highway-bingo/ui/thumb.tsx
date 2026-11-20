/** Card picture for the games list: a highway milestone on a milestone-yellow card. Styled in home.css. */
export function HighwayBingoThumb() {
  return (
    <span className="game-thumb game-thumb-highway-bingo" aria-hidden="true">
      <svg viewBox="0 0 100 132" className="game-thumb-milestone" focusable="false">
        <path d="M14 124V56a36 36 0 0 1 72 0v68Z" className="hb-thumb-body" />
        <path d="M14 60V56a36 36 0 0 1 72 0v4Z" className="hb-thumb-top" />
        <path d="M14 124V56a36 36 0 0 1 72 0v68ZM14 60h72" className="hb-thumb-edge" />
        <text x="50" y="49" textAnchor="middle" className="hb-thumb-top-text">
          NH
        </text>
        <path d="M30 78h40M30 94h40M30 110h40M43.3 70v48M56.7 70v48" className="hb-thumb-grid" />
        <path d="M28 76l44 36" className="hb-thumb-line" />
      </svg>
    </span>
  );
}
