import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SETTINGS_SCRIPT } from "@/settings/settings";
import { SettingsSync } from "@/settings/settings-sync";
import { AUTHOR } from "@/ui/site";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `Games · ${AUTHOR}`, template: "%s · Games" },
  description: `Small browser games designed and built by ${AUTHOR}.`,
};

// Dark is the default theme, so the phone's address bar matches it.
export const viewport: Viewport = {
  themeColor: "#131312",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-mode="dark" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      <body>
        {children}
        <SettingsSync />
      </body>
    </html>
  );
}
