"use client";

import { useRouter } from "next/navigation";

import { ChevronLeftIcon } from "./icons";

/** Back to wherever the visitor came from; home if they opened this page directly. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-link"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
    >
      <ChevronLeftIcon />
      Back
    </button>
  );
}
