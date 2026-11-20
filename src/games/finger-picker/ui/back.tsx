"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GAME_NAMES } from "@/games/slugs";
import { fromGame } from "@/settings/back-target";
import { BackToGames } from "@/ui/back-to-games";
import { ChevronLeftIcon } from "@/ui/icons";

/**
 * Top left on the picker: "‹ Imposter" when a game's setup opened it (?from=imposter),
 * straight back to that setup; "‹ Games" otherwise. Only the browser knows the link, so
 * the first paint says Games.
 */
export function PickerBack() {
  return (
    <Suspense fallback={<BackToGames game="finger-picker" />}>
      <FromLink />
    </Suspense>
  );
}

function FromLink() {
  const game = fromGame(useSearchParams().get("from"));
  if (!game || game === "finger-picker") return <BackToGames game="finger-picker" />;
  return (
    <Link href={`/${game}`} className="back-link">
      <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
      {GAME_NAMES[game]}
    </Link>
  );
}
