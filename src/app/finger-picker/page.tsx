import type { Metadata } from "next";

import { PickerBack } from "@/games/finger-picker/ui/back";
import { FingerPicker } from "@/games/finger-picker/ui/finger-picker";
import { GameShell } from "@/ui/game-shell";

export const metadata: Metadata = {
  title: "Finger picker",
  description: "Everyone puts a finger on the screen and the phone picks one, makes teams or puts you in order.",
};

export default function FingerPickerPage() {
  return (
    <GameShell game="finger-picker" layout="party" back={<PickerBack />}>
      <FingerPicker />
    </GameShell>
  );
}
