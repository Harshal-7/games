"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { savedGame, savedGameLine } from "@/games/imposter/logic/saved";
import { useHydrated } from "@/games/imposter/ui/parts";
import { act, useRoom } from "@/games/imposter/ui/use-room";
import { Confirm } from "@/ui/confirm";
import { ArrowRightIcon, CloseIcon, PlusIcon } from "@/ui/icons";

/**
 * The Imposter room saved in this browser: Continue where you left off, a New game with
 * the same players, or Remove it from Home. Shows counts only, never anything secret.
 */
export function SavedGame() {
  const room = useRoom();
  const hydrated = useHydrated();
  const router = useRouter();
  const titleId = useId();
  const [asking, setAsking] = useState<"new" | "remove" | null>(null);
  const saved = hydrated ? savedGame(room) : null;
  const has = saved !== null;

  // The head script kept space for this card; give it back if nothing is saved after all.
  useEffect(() => {
    if (hydrated) document.documentElement.toggleAttribute("data-room", has);
  }, [hydrated, has]);

  return (
    <section className="saved-slot" data-game="imposter" aria-labelledby={saved ? titleId : undefined}>
      {saved && (
        <>
          <div className="saved-head">
            <h2 className="label" id={titleId}>
              Saved game
            </h2>
            {!asking && (
              <button type="button" className="btn saved-remove" onClick={() => setAsking("remove")}>
                <CloseIcon width={14} height={14} strokeWidth={2.8} />
                Remove
              </button>
            )}
          </div>
          {asking === "new" ? (
            <Confirm
              title="Start a new game?"
              detail="Same players. Rounds and scores start from zero."
              yes="New game"
              onNo={() => setAsking(null)}
              onYes={() => {
                act({ type: "new-room" });
                // Home stays mounted (hidden) after leaving, so close the question first.
                setAsking(null);
                router.push("/imposter");
              }}
            />
          ) : asking === "remove" ? (
            <Confirm
              title="Remove the saved game?"
              detail="Its players, rounds and scores are cleared from this browser."
              yes="Remove"
              onNo={() => setAsking(null)}
              onYes={() => {
                act({ type: "clear-room" });
                setAsking(null);
              }}
            />
          ) : (
            <div className="saved-row">
              <Link href="/imposter" className="card saved-continue">
                <span className="saved-back" aria-hidden="true" />
                <span className="saved-text">
                  <span className="saved-name">Imposter</span>
                  <span className="saved-line">{savedGameLine(saved)}</span>
                  <span className="saved-go">
                    Continue
                    <ArrowRightIcon width={16} height={16} strokeWidth={2.4} />
                  </span>
                </span>
              </Link>
              <button type="button" className="card saved-new" onClick={() => setAsking("new")}>
                <span className="saved-plus" aria-hidden="true">
                  <PlusIcon width={16} height={16} strokeWidth={2.8} />
                </span>
                <span className="saved-new-name">New game</span>
                <span className="saved-new-note">Same players</span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
