import type { Metadata } from "next";

import { SettingsPanel } from "@/settings/settings-panel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, colour, board and knight styles for the games.",
};

export default function SettingsPage() {
  return (
    <div className="page is-settings">
      <SettingsPanel />
    </div>
  );
}
