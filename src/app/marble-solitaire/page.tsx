import type { Metadata } from "next";

import { MarbleSolitaire } from "@/games/marble-solitaire/ui/marble-solitaire";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Marble solitaire",
  description: "Jump marbles over each other until only one is left, on the triangle, the English cross or the European board.",
};

export default function MarbleSolitairePage() {
  return (
    <GameShell game="marble-solitaire">
      <MarbleSolitaire />
    </GameShell>
  );
}
