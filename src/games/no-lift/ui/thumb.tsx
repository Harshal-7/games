/** Card picture for the games list: a small cream flower of dots and lines on a pink card. Styled in home.css. */
export function NoLiftThumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb game-thumb-no-lift" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="92" height="124" rx="10" className="nl-thumb-card" />
      <rect x="5" y="5" width="82" height="114" rx="7" className="nl-thumb-edge" />
      <g transform="translate(46 62)">
        <path
          d="M0 -6A6 6 0 0 1 6 0A6 6 0 0 1 0 6A6 6 0 0 1 -6 0A6 6 0 0 1 0 -6ZM0 -6Q-9 -18 0 -30Q9 -18 0 -6ZM6 0Q18 -9 30 0Q18 9 6 0ZM0 6Q9 18 0 30Q-9 18 0 6ZM-6 0Q-18 9 -30 0Q-18 -9 -6 0Z"
          className="nl-thumb-lines"
        />
        {[
          [0, -30],
          [30, 0],
          [0, 30],
          [-30, 0],
          [0, -6],
          [6, 0],
          [0, 6],
          [-6, 0],
        ].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={2.3} className="nl-thumb-dot" />
        ))}
        {[
          [-21, -21],
          [21, -21],
          [21, 21],
          [-21, 21],
        ].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r={1.8} className="nl-thumb-dot" />
        ))}
      </g>
    </svg>
  );
}
