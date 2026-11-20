import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Fraunces } from "next/font/google";

import { SETTINGS_SCRIPT } from "@/settings/settings";
import { SettingsSync } from "@/settings/settings-sync";
import { AUTHOR } from "@/ui/site";

import "./globals.css";

// Fraunces for titles (with its italic), DM Sans for reading, DM Mono for numbers.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], variable: "--font-dm-sans", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `Games · ${AUTHOR}`, template: "%s · Games" },
  description: `Small browser games designed and built by ${AUTHOR}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="dark"
      suppressHydrationWarning
      className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Also adds the theme-color meta (felt green or paper) for the phone's address bar. */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      <body>
        {children}
        <SettingsSync />
      </body>
    </html>
  );
}
