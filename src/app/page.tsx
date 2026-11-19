import Link from "next/link";

import { GAMES } from "@/games/registry";
import { ArrowUpRightIcon } from "@/ui/icons";
import { AUTHOR, PORTFOLIO_URL } from "@/ui/site";
import { ThemeToggle } from "@/ui/theme-toggle";

export default function Home() {
  return (
    <div className="page">
      <header className="topbar">
        <span />
        <ThemeToggle />
      </header>
      <main>
        <section className="home-hero">
          <h1 className="home-title">Games</h1>
          <p className="home-lede">Small puzzles and party games I design and build, one at a time.</p>
        </section>

        <ul className="game-list">
          {GAMES.map(({ slug, name, blurb, detail, Thumb }) => (
            <li key={slug}>
              <Link href={`/${slug}`} className="game-card">
                <div className="thumb">
                  <Thumb />
                </div>
                <div>
                  <h2>{name}</h2>
                  <p>{blurb}</p>
                  <span className="meta">Play · {detail}</span>
                </div>
              </Link>
            </li>
          ))}
          <li>
            <div className="game-card is-soon">
              <div className="thumb">?</div>
              <div>
                <h2>More soon</h2>
                <p>The next game is on the way.</p>
              </div>
            </div>
          </li>
        </ul>
      </main>
      <footer className="site-footer">
        <span>Made by {AUTHOR}</span>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          Portfolio <ArrowUpRightIcon width={14} height={14} />
        </a>
      </footer>
    </div>
  );
}
