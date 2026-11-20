/** Card picture for the games list: a lit patakha on a marigold card. Styled in home.css. */
export function PatakhaThumb() {
  return (
    <span className="game-thumb game-thumb-patakha" aria-hidden="true">
      <svg viewBox="0 0 160 124" className="game-thumb-cracker" focusable="false">
        <g transform="rotate(-24 70 72)">
          <rect x="18" y="52" width="104" height="40" rx="8" className="pk-thumb-body" />
          <path d="M46 52h13l-12 40H34ZM76 52h13L77 92H64Z" className="pk-thumb-stripe" />
          <path d="M26 52h7v40h-7a8 8 0 0 1-8-8V60a8 8 0 0 1 8-8ZM107 52h7a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-7Z" className="pk-thumb-cap" />
          <rect x="18" y="52" width="104" height="40" rx="8" className="pk-thumb-edge" />
        </g>
        <path d="M117 51c8-6 2-16 10-22s8-8 6-14" className="pk-thumb-fuse" />
        <path d="M133-2v8M133 24v8M116 15h8M142 15h8M121 3l5 5M140 22l5 5M121 27l5-5M140 8l5-5" className="pk-thumb-rays" />
        <circle cx="133" cy="15" r="6" className="pk-thumb-spark" />
      </svg>
    </span>
  );
}
