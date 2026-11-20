import type { SVGProps } from "react";

/**
 * The picker's drawing: three finger discs in the games' colours, the marigold one picked
 * (a dashed ring round it). The Home tile shows it in a cream circle; the setup links use
 * the discs alone.
 */
export function FingerPickerMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true" {...props}>
      <circle className="fp-mark-plate" cx="28" cy="28" r="26.5" />
      <circle className="fp-mark-disc is-red" cx="18" cy="21" r="7" />
      <circle className="fp-mark-disc is-night" cx="36" cy="18" r="7" />
      <circle className="fp-mark-picked" cx="29" cy="37" r="11" />
      <circle className="fp-mark-disc is-marigold" cx="29" cy="37" r="7" />
    </svg>
  );
}

export function FingerPickerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle className="fp-mark-disc is-red is-small" cx="7.5" cy="9" r="3.6" />
      <circle className="fp-mark-disc is-night is-small" cx="16" cy="7.5" r="3.6" />
      <circle className="fp-mark-disc is-marigold is-small" cx="12.5" cy="16.5" r="3.6" />
    </svg>
  );
}
