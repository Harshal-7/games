import type { SVGProps } from "react";

/** Patakha's own line icons (24×24, currentColor), next to the shared ones in @/ui/icons. */
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

/** A flame: Light it. */
export const FlameIcon = (p: P) => (
  <Mark {...p}>
    <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.5 3-5.3 3.4-9.4 2.4 1.5 3.6 3.6 3.4 6 1-.6 1.6-1.6 1.8-2.8 1.7 1.5 3.4 3.6 3.4 6.2 0 3.2-2.4 5.6-6 5.6Z" />
  </Mark>
);

/** An arrow round to the next player: Pass. */
export const PassIcon = (p: P) => (
  <Mark {...p}>
    <path d="M4 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Mark>
);

export const ChevronDownIcon = (p: P) => (
  <Mark {...p}>
    <path d="m6 9 6 6 6-6" />
  </Mark>
);

/** A life: a heart, filled while it's left, dashed once it's lost. */
export function Heart({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="pk-heart" data-full={full} aria-hidden="true" focusable="false">
      <path d="M12 20.5s-8-4.9-8-11A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 2.9c0 6.1-8 11-8 11Z" />
    </svg>
  );
}
