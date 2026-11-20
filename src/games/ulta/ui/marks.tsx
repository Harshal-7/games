import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Small line icons in the site's style, 24×24, drawn with currentColor. */
function Icon({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A mic. */
export const MicIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7" />
  </Icon>
);

/** Play, backwards: a play triangle pointing left. */
export const BackwardsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M17 5.5v13L6.5 12Z" fill="currentColor" />
  </Icon>
);

/** Play. */
export const ForwardsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 5.5v13L17.5 12Z" fill="currentColor" />
  </Icon>
);

export const ChevronDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

/** Swap sides: two arrows passing each other. */
export const SwapIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13" />
  </Icon>
);

/**
 * Ulta's own picture: a mic whose sound wave runs out to the right and comes back
 * upside down, on the title card and the games list.
 */
export function UltaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true" focusable="false">
      <g className="ul-mark-wave">
        <path d="M58 30c6-10 12-10 18 0s12 10 18 0 12-10 18 0" />
        <path d="M58 66c6 10 12 10 18 0s12-10 18 0 12 10 18 0" />
        <path d="M112 30c6 0 6 36 0 36" />
      </g>
      <path d="m103 60 9 6-9 6" className="ul-mark-wave" />
      <rect x="18" y="10" width="26" height="46" rx="13" className="ul-mark-mic" />
      <path d="M31 22v22" className="ul-mark-grille" />
      <path d="M12 44a19 19 0 0 0 38 0M31 63v14M21 82h20" className="ul-mark-stand" />
    </svg>
  );
}
