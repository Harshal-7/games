import type { SVGProps } from "react";

/**
 * Highway Bingo's drawings: the highway milestone (yellow top, white stone) and a few
 * line icons (24×24, currentColor), next to the shared ones in @/ui/icons.
 */

/** A highway milestone, our own drawing. `top` and `lines` are what's painted on it. */
export function Milestone({
  top = "NH",
  lines = ["DHABA", "2 km"],
  className,
}: {
  top?: string;
  lines?: [string, string];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 132" className={["hb-milestone", className].filter(Boolean).join(" ")} aria-hidden="true" focusable="false">
      <path d="M14 124V56a36 36 0 0 1 72 0v68Z" className="hb-milestone-body" />
      <path d="M14 60V56a36 36 0 0 1 72 0v4Z" className="hb-milestone-top" />
      <path d="M14 124V56a36 36 0 0 1 72 0v68ZM14 60h72" className="hb-milestone-edge" />
      <path d="M4 125h92" className="hb-milestone-ground" />
      <text x="50" y="49" textAnchor="middle" className="hb-milestone-top-text">
        {top}
      </text>
      <text x="50" y="84" textAnchor="middle" className="hb-milestone-text">
        {lines[0]}
      </text>
      <text x="50" y="108" textAnchor="middle" className="hb-milestone-text is-big">
        {lines[1]}
      </text>
    </svg>
  );
}

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

export const ChevronDownIcon = (p: P) => (
  <Mark {...p}>
    <path d="m6 9 6 6 6-6" />
  </Mark>
);

/** A steering wheel: the driver's note. */
export const WheelIcon = (p: P) => (
  <Mark {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M3.4 10.2c3-.9 5.9-.9 6.6 0M20.6 10.2c-3-.9-5.9-.9-6.6 0M12 14.2V21" />
  </Mark>
);

/** A magnifier: Check a card. */
export const CheckCardIcon = (p: P) => (
  <Mark {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5.5 5.5" />
  </Mark>
);

/** A box with an arrow up: Share. */
export const ShareIcon = (p: P) => (
  <Mark {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Mark>
);

/** An arrow: Join. */
export const JoinIcon = (p: P) => (
  <Mark {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Mark>
);
