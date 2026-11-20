import type { SVGProps } from "react";

/** Imposter's own line icons (24×24, currentColor), next to the shared ones in @/ui/icons. */
function Mark({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
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

type P = SVGProps<SVGSVGElement>;

/** Two cards, the front one dealt: "Deal the cards". */
export const DealIcon = (p: P) => (
  <Mark {...p}>
    <rect x="9" y="3" width="12" height="16" rx="2" />
    <path d="m6 7.5-1.6.5a2 2 0 0 0-1.3 2.5l3 9.5a2 2 0 0 0 2.5 1.3l5.4-1.8" />
  </Mark>
);

export const ChevronDownIcon = (p: P) => (
  <Mark {...p}>
    <path d="m6 9 6 6 6-6" />
  </Mark>
);
