import type { Metadata } from "next";

import { SettingsPanel } from "@/settings/settings-panel";
import { BackButton } from "@/ui/back-button";
import { TopBar } from "@/ui/top-bar";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, colour, board and knight styles for the games.",
};

export default function SettingsPage() {
  return (
    <div className="page">
      <TopBar back={<BackButton />} settings={false} />
      <main>
        <SettingsPanel />
      </main>
    </div>
  );
}
