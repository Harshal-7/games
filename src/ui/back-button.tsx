"use client";

import { useRouter } from "next/navigation";

import { ChevronLeftIcon } from "./icons";

/**
 * Back to wherever the visitor came from (keeping that page as it was), or to
 * `fallback` when they opened this page directly.
 */
export function BackButton({ label = "Back", fallback = "/" }: { label?: string; fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-link"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ChevronLeftIcon />
      {label}
    </button>
  );
}
