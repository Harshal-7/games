"use client";

import { CheckIcon } from "@/ui/icons";

import { PACKS } from "../logic/packs";
import { drawnIn } from "../logic/progress";
import { useProgress } from "./stores";

const ALL = PACKS.flatMap((pack) => pack.patterns.map((p) => p.id));

/** "✓ 4 drawn" on the games list, once any hand-made pattern is drawn. */
export function RangoliBadge() {
  const drawn = drawnIn(useProgress(), ALL);
  if (drawn === 0) return null;
  return (
    <span className="game-chip is-drawn">
      <CheckIcon width={12} height={12} strokeWidth={3.4} />
      <span className="game-chip-num">{drawn}</span> drawn
    </span>
  );
}
