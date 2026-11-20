"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { GameSlug } from "@/games/slugs";

import { Confirm } from "./confirm";
import { ChevronLeftIcon } from "./icons";
import { leaveGuard, type LeaveGuard } from "./leave-guard";

/**
 * "‹ Games" at the top of every game. Leaving ends the game; with a game under way it
 * asks first. The game is ended once its page is out of sight (Next keeps the page
 * mounted but hidden, which runs this component's cleanup), so the lobby never
 * flashes up on the way out.
 */
export function BackToGames({ game }: { game: GameSlug }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [asking, setAsking] = useState<LeaveGuard | null>(null);
  const ending = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      ending.current?.();
      ending.current = null;
    },
    [],
  );

  return (
    <>
      <Link
        href="/"
        className="back-link"
        onClick={(e) => {
          const guard = leaveGuard(game);
          if (!guard) return;
          if (!guard.ask) {
            ending.current = guard.end;
            return;
          }
          e.preventDefault();
          setAsking(guard);
          dialog.current?.showModal();
        }}
      >
        <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
        Games
      </Link>
      <dialog ref={dialog} className="leave-dialog" onClose={() => setAsking(null)}>
        {asking && (
          <Confirm
            title="Leave this game?"
            detail={asking.detail}
            no="Keep playing"
            yes="Leave"
            onNo={() => dialog.current?.close()}
            onYes={() => {
              ending.current = asking.end;
              dialog.current?.close();
              router.push("/");
            }}
          />
        )}
      </dialog>
    </>
  );
}
