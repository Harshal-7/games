import Link from "next/link";
import type { ReactNode } from "react";

import { SlidersIcon } from "./icons";

/** The bar at the top of every page: a way back on the left, Settings on the right. */
export function TopBar({ back, settings = true }: { back?: ReactNode; settings?: boolean }) {
  return (
    <header className="topbar">
      {back ?? <span />}
      {settings && (
        <Link href="/settings" className="icon-btn" aria-label="Settings" title="Settings">
          <SlidersIcon />
        </Link>
      )}
    </header>
  );
}
