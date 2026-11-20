import type { Metadata } from "next";

import { CLIP_DIR, clipFile, FIXED_LINES } from "@/games/mafia/logic/lines";
import { Mafia } from "@/games/mafia/ui/mafia";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Mafia",
  description:
    "A party game for one phone. The phone narrates the night, so nobody sits out: find the Mafia before they take over the town.",
};

export default function MafiaPage() {
  return (
    <GameShell game="mafia" layout="party">
      {/* The narrator's recordings: fetched early, and saved by the offline worker with the page. */}
      {FIXED_LINES.map((text) => (
        <link key={text} rel="prefetch" as="audio" href={`${CLIP_DIR}/${clipFile(text)}`} />
      ))}
      <Mafia />
    </GameShell>
  );
}
