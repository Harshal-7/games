/** Card picture for the games list: a mic and a turn-back arrow on a peacock teal card. Styled in home.css. */
export function UltaThumb() {
  return (
    <span className="game-thumb game-thumb-ulta" aria-hidden="true">
      <svg viewBox="0 0 80 108" className="game-thumb-mic" focusable="false">
        <path d="M58 22h6a12 12 0 0 1 0 24H54" className="ul-thumb-turn" />
        <path d="m59 39-6 7 6 7" className="ul-thumb-turn" />
        <rect x="20" y="10" width="26" height="46" rx="13" className="ul-thumb-body" />
        <path d="M33 22v22" className="ul-thumb-grille" />
        <path d="M11 44a22 22 0 0 0 44 0M33 66v16M21 90h24" className="ul-thumb-stand" />
      </svg>
    </span>
  );
}
