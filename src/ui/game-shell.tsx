import type { ReactNode } from "react";

import type { GameSlug } from "@/games/slugs";

import { BackToGames } from "./back-to-games";
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
  back,
}: {
  children: ReactNode;
  game: GameSlug;
  layout?: "board" | "party";
  /** In place of "‹ Games", for a page that can be opened from another game. */
  back?: ReactNode;
}) {
  return (
    <div className={layout === "board" ? "page is-game" : "page is-party"} data-game={game}>
      <TopBar
        back={back ?? <BackToGames game={game} />}
        actions={<SettingsLink from={game} />}
      />
      <main className="game-main">{children}</main>
    </div>
  );
}
