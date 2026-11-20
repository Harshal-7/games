import Link from "next/link";
import type { ReactNode } from "react";

import type { GameSlug } from "@/games/slugs";

import { ChevronLeftIcon } from "./icons";
import { SettingsLink } from "./settings-link";
import { TopBar } from "./top-bar";

/**
 * The frame around every game: back to the list, Settings, then the game itself.
 * `game` colours the page (data-game: brass for Knight's Tour, red for Imposter).
 * "board" games fill the window on big screens without scrolling; "party" games
 * scroll like a normal page.
 */
export function GameShell({
  children,
  game,
  layout = "board",
}: {
  children: ReactNode;
  game: GameSlug;
  layout?: "board" | "party";
}) {
  return (
    <div className={layout === "board" ? "page is-game" : "page is-party"} data-game={game}>
      <TopBar
        back={
          <Link href="/" className="back-link">
            <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
            Games
          </Link>
        }
        actions={<SettingsLink from={game} />}
      />
      <main className="game-main">{children}</main>
    </div>
  );
}
