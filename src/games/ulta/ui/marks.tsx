import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** A mic, drawn like the site's line icons. */
export const MicIcon = (p: P) => (
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
    {...p}
  >
    <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7" />
  </svg>
);
