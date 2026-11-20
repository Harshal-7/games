"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ChevronLeftIcon } from "@/ui/icons";

import { backTarget } from "./back-target";

/** Back on the Settings page: to the game you came from (?from=), else the games list. */
export function SettingsBack() {
  const { href, label } = backTarget(useSearchParams().get("from"));
  return <BackLink href={href} label={label} />;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back-link">
      <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
      {label}
    </Link>
  );
}
