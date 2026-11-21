import type { Metadata } from "next";

import { CrackTheCode } from "@/games/crack-the-code/ui/crack-the-code";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Crack the code",
  description: "Guess the secret code from right-place, wrong-place clues. A new daily code every day, the same for everyone.",
};

export default function CrackTheCodePage() {
  return (
    <GameShell game="crack-the-code">
      <CrackTheCode />
    </GameShell>
  );
}
