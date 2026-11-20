"use client";

import { useState } from "react";

import { readCode } from "../logic/code";
import type { Game } from "../logic/room";
import { joinLink } from "./join-link";
import { ShareIcon } from "./marks";
import { act } from "./use-room";

/** The code, big, for the car to copy: own phones only, on the phone that started (or any phone, from its card). */
export function Share({ game, started }: { game: Game; started: boolean }) {
  const read = readCode(game.code);
  const size = read.ok ? read.code.size : 5;
  const seat = game.seats[0];

  return (
    <div className="hb-share">
      <header className="hb-form-head">
        <h1 className="game-title hb-screen-title">{seat === 1 ? "Your code" : "This game's code"}</h1>
      </header>

      <div className="card hb-code-card">
        <span className="hb-code" aria-label={game.code.split("").join(" ")}>
          {game.code}
        </span>
        <span className="hb-code-meta">
          {size}×{size} card · you&apos;re seat {seat}
        </span>
      </div>

      <p className="hb-share-how">
        Send everyone the link, or they tap <b>Join</b> and type this code. Each picks a seat: 2, 3, 4…
      </p>

      <ShareLink code={game.code} />

      <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "share", on: false })}>
        {started ? "Back to my card" : "Show my card"}
      </button>
    </div>
  );
}

/**
 * Sends the join link through the phone's share sheet (WhatsApp and so on), or copies it
 * where there's no share sheet. Opening the link fills in the code on the Join screen.
 */
function ShareLink({ code }: { code: string }) {
  const [said, setSaid] = useState<"copied" | "failed" | null>(null);
  const url = joinLink(code);

  async function share() {
    const text = `Join my Highway Bingo game: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Highway Bingo", text, url });
        return;
      } catch (e) {
        // Closing the share sheet isn't a failure.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setSaid("copied");
    } catch {
      setSaid("failed");
    }
  }

  return (
    <div className="hb-share-link">
      <button type="button" className="btn" onClick={share}>
        <ShareIcon width={18} height={18} />
        {said === "copied" ? "Link copied" : "Share link"}
      </button>
      {said === "failed" && <p className="hb-share-url">{url}</p>}
    </div>
  );
}
