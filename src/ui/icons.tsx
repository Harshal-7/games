import type { SVGProps } from "react";

/** Small line icons, 24×24, drawn with currentColor. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

export const UndoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
);

export const BulbIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 18h6M10 21.5h4" />
    <path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6v.6h6v-.6c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 2.5z" />
  </Icon>
);

export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7.5 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L8.7 4.5a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" />
  </Icon>
);

export const StopIcon = (p: P) => (
  <Icon {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
  </Icon>
);

export const RestartIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
    <path d="M3.5 3.5v5h5" />
  </Icon>
);

export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ArrowUpRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Icon>
);

export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />
  </Icon>
);
