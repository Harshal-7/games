import type { Metadata } from "next";

import { KnightsTour } from "@/games/knights-tour/ui/knights-tour";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Knight's Tour",
  description: "Jump like a chess knight and land on every square exactly once. Boards from 5×5 to 8×8.",
};

export default function KnightsTourPage() {
  return (
    <GameShell game="knights-tour">
      <KnightsTour />
    </GameShell>
  );
}
