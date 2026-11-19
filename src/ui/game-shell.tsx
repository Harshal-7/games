import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

/** The frame around every game: back to the list, theme switch, title, blurb. */
export function GameShell({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <div className="page">
      <header className="topbar">
        <Link href="/" className="back-link">
          <ChevronLeftIcon />
          Games
        </Link>
        <ThemeToggle />
      </header>
      <main className="game-main">
        <h1 className="game-title">{title}</h1>
        <p className="game-blurb">{blurb}</p>
        {children}
      </main>
    </div>
  );
}
