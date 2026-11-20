import type { Metadata } from "next";

import { Ulta } from "@/games/ulta/ui/ulta";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Ulta",
  description:
    "A party game for one phone. Sing a line, a teammate copies it backwards, and the team guesses the song from the flipped copy.",
};

export default function UltaPage() {
  return (
    <GameShell game="ulta" layout="party">
      <Ulta />
    </GameShell>
  );
}
