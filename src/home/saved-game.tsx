"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { savedGame, savedGameLine } from "@/games/imposter/logic/saved";
import { useHydrated } from "@/games/imposter/ui/parts";
import { act, useRoom } from "@/games/imposter/ui/use-room";
import { Confirm } from "@/ui/confirm";
import { ArrowRightIcon, PlusIcon } from "@/ui/icons";

/**
 * The Imposter room saved in this browser: Continue where you left off, or a New game
 * with the same players. Shows counts only, never anything secret.
 */
export function SavedGame() {
  const room = useRoom();
  const hydrated = useHydrated();
  const router = useRouter();
  const titleId = useId();
  const [asking, setAsking] = useState(false);
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
          <h2 className="label saved-title" id={titleId}>
            Saved game
          </h2>
          {asking ? (
            <Confirm
              title="Start a new game?"
              detail="Same players. Rounds and scores start from zero."
              yes="New game"
              onNo={() => setAsking(false)}
              onYes={() => {
                act({ type: "new-room" });
                // Home stays mounted (hidden) after leaving, so close the question first.
                setAsking(false);
                router.push("/imposter");
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
              <button type="button" className="card saved-new" onClick={() => setAsking(true)}>
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
