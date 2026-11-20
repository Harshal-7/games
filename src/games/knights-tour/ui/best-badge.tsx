"use client";

import { useSettings } from "@/settings/store";
import { formatDuration } from "@/ui/format";

import { SIZES } from "../logic/board";
import { useBestTimes } from "./use-best-times";

/** "Best 5×5 · 2:58" on the games list: the size played last, else the smallest with a time. */
export function KnightsTourBestBadge() {
  const best = useBestTimes();
  const last = useSettings().knightsTour.size;
  const size = best[last] ? last : SIZES.find((s) => best[s]);
  const record = size ? best[size] : undefined;
  if (!size || !record) return null;
  return (
    <span className="game-chip is-best">
      <span className="game-chip-medal" aria-hidden="true" />
      Best {size}×{size} · <span className="game-chip-num">{formatDuration(record.ms)}</span>
    </span>
  );
}
