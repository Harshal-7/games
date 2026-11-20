import Link from "next/link";

import type { GameSlug } from "@/games/slugs";

import { SlidersIcon } from "./icons";

/** The Settings button, top right on every page. `from` is where Back on Settings returns. */
export function SettingsLink({ from }: { from?: GameSlug }) {
  return (
    <Link
      href={from ? `/settings?from=${from}` : "/settings"}
      className="icon-btn"
      aria-label="Settings"
      title="Settings"
    >
      <SlidersIcon width={20} height={20} strokeWidth={2.2} />
    </Link>
  );
}
