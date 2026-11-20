import Link from "next/link";

import { ChevronLeftIcon } from "@/ui/icons";

import type { BackTarget } from "./back-target";

/** Back on the Settings page: to the game you came from, else the games list. */
export function BackLink({ href, label }: BackTarget) {
  return (
    <Link href={href} className="back-link">
      <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
      {label}
    </Link>
  );
}
