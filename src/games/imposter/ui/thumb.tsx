/** Card picture for the games list: the red card back with its sealed question mark. */
export function ImposterThumb() {
  return (
    <span className="game-thumb game-thumb-back" aria-hidden="true">
      <span className="game-thumb-seal">?</span>
    </span>
  );
}
