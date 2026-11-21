import type { Metadata } from "next";

import { Make24 } from "@/games/make-24/ui/make-24";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Make 24",
  description: "Four numbers, + − × ÷, and 24 to make. Five new hands a day, the same for everyone.",
};

export default function Make24Page() {
  return (
    <GameShell game="make-24">
      <Make24 />
    </GameShell>
  );
}
