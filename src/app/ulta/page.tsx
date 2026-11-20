import type { Metadata } from "next";

import { UltaCheck } from "@/games/ulta/ui/check";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Ulta",
  description: "Sing a line, hear it backwards, copy it, and guess the song from the flipped copy.",
};

export default function UltaPage() {
  return (
    <GameShell game="ulta" layout="party">
      <UltaCheck />
    </GameShell>
  );
}
