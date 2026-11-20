import type { Metadata } from "next";

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
      <Mafia />
    </GameShell>
  );
}
