import type { Metadata } from "next";

import { Patakha } from "@/games/patakha/ui/patakha";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Patakha",
  description:
    "A party game for one phone. Say an answer and pass the phone on before the hidden fuse runs out, or lose a life.",
};

export default function PatakhaPage() {
  return (
    <GameShell game="patakha" layout="party">
      <Patakha />
    </GameShell>
  );
}
