import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "./icons";
import { TopBar } from "./top-bar";

/** The frame around every game: back to the list, Settings, then the game itself. */
export function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="page is-game">
      <TopBar
        back={
          <Link href="/" className="back-link">
            <ChevronLeftIcon />
            Games
          </Link>
        }
      />
      <main className="game-main">{children}</main>
    </div>
  );
}
