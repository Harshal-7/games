import type { Metadata } from "next";

import { Imposter } from "@/games/imposter/ui/imposter";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Imposter",
  description:
    "A party game for one phone. Everyone gets the secret word except the imposter, who has to fake it.",
};

export default function ImposterPage() {
  return (
    <GameShell layout="party" settings={false}>
      <Imposter />
    </GameShell>
  );
}
