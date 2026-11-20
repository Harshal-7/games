import Link from "next/link";

import { GAMES } from "@/games/registry";
import { SavedGame } from "@/home/saved-game";
import { ArrowUpRightIcon } from "@/ui/icons";
import { SettingsLink } from "@/ui/settings-link";
import { AUTHOR, PORTFOLIO_URL } from "@/ui/site";

import "@/home/home.css";

export default function Home() {
  return (
    <div className="page is-home">
      <header className="topbar">
        <span className="label">Puzzles · Party games</span>
        <SettingsLink />
      </header>

      <main>
        <section className="home-hero">
          <h1 className="home-title">
            Games<span className="home-dot">.</span>
          </h1>
          <p className="home-lede">Small puzzles and party games I design and build, one at a time.</p>
        </section>

        <SavedGame />

        <ul className="game-list">
          {GAMES.map(({ slug, name, blurb, detail, Thumb, Badge }) => (
            <li key={slug} data-game={slug}>
              <Link href={`/${slug}`} className="card game-card">
                <Thumb />
                <div className="game-card-text">
                  <h2>{name}</h2>
                  <p>{blurb}</p>
                  <div className="game-chips">
                    <span className="game-chip">{detail}</span>
                    {Badge && <Badge />}
                  </div>
                </div>
              </Link>
            </li>
          ))}
          <li>
            <div className="game-soon">
              <span className="game-soon-art" aria-hidden="true">
                <span />
                <span />
              </span>
              <div>
                <h2>More soon</h2>
                <p>The next game is on the way.</p>
              </div>
            </div>
          </li>
        </ul>
      </main>

      <footer className="site-footer">
        <span className="site-made">
          <svg viewBox="0 0 44 44" width="34" height="34" role="img" aria-label="HS" className="hs-seal">
            <circle cx="22" cy="22" r="18" className="hs-seal-wax" />
            <circle cx="22" cy="22" r="13.5" className="hs-seal-ring" />
            <text x="22" y="26.5" textAnchor="middle" className="hs-seal-text">
              HS
            </text>
          </svg>
          <span>
            Made by <b>{AUTHOR}</b>
          </span>
        </span>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="btn site-portfolio">
          Portfolio
          <ArrowUpRightIcon width={14} height={14} strokeWidth={2.4} />
        </a>
      </footer>
    </div>
  );
}
