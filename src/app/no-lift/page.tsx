import type { Metadata } from "next";

import { NoLift } from "@/games/no-lift/ui/no-lift";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "No Lift",
  description: "Draw each pattern in one go: every line once, never twice.",
};

export default function NoLiftPage() {
  return (
    <GameShell game="no-lift">
      <NoLift />
    </GameShell>
  );
}
