import Link from "next/link";

import type { GameSlug } from "@/games/slugs";

import { FingerPickerIcon } from "./mark";

/**
 * The last row of a party game's Players card: a way to the Finger picker, which comes
 * back to this setup ("‹ Imposter"). "Make teams" opens it on Teams.
 */
export function PickerLink({ from, teams = false }: { from: GameSlug; teams?: boolean }) {
  return (
    <div className="party-setup-picker">
      <span className="party-setup-picker-text">{teams ? "Need teams?" : "Need someone to go first?"}</span>
      <Link href={`/finger-picker?from=${from}${teams ? "&mode=teams" : ""}`} className="btn party-setup-picker-go">
        <FingerPickerIcon width={22} height={22} />
        {teams ? "Make teams" : "Who starts?"}
      </Link>
    </div>
  );
}
