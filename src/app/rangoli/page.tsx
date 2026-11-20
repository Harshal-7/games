import type { Metadata } from "next";

import { Rangoli } from "@/games/rangoli/ui/rangoli";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Rangoli in one line",
  description: "Draw each rangoli pattern in one go: every line once, never twice.",
};

export default function RangoliPage() {
  return (
    <GameShell game="rangoli">
      <Rangoli />
    </GameShell>
  );
}
