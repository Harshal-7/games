import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon, SlidersIcon } from "./icons";
import { TopBar } from "./top-bar";

/**
 * The frame around every game: back to the list, Settings when the game has any,
 * then the game itself. "board" games fill the window on big screens without
 * scrolling; "party" games scroll like a normal page.
 */
export function GameShell({
  children,
  layout = "board",
  settings = true,
}: {
  children: ReactNode;
  layout?: "board" | "party";
  settings?: boolean;
}) {
  return (
    <div className={layout === "board" ? "page is-game" : "page is-party"}>
      <TopBar
        back={
          <Link href="/" className="back-link">
            <ChevronLeftIcon />
            Games
          </Link>
        }
        actions={
          settings && (
            <Link href="/settings" className="icon-btn" aria-label="Settings" title="Settings">
              <SlidersIcon />
            </Link>
          )
        }
      />
      <main className="game-main">{children}</main>
    </div>
  );
}
