import type { Metadata } from "next";

import { HighwayBingo } from "@/games/highway-bingo/ui/highway-bingo";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Highway Bingo",
  description:
    "Bingo cards of things you spot on Indian roads. Everyone plays on their own phone with a shared code, no signal needed. The first full line wins.",
};

export default function HighwayBingoPage() {
  return (
    <GameShell game="highway-bingo" layout="party">
      <HighwayBingo />
    </GameShell>
  );
}
