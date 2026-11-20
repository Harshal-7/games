import { count, formatDuration } from "@/ui/format";

import type { Best } from "../logic/best";

/** "Perfect · 6:12 · no hints", "2 marbles · 9:40 · 1 hint": the best line's words, time in mono. */
export function bestText(best: Best) {
  const what = best.left > 1 ? `${best.left} marbles` : best.perfect ? "Perfect" : "Solved";
  return (
    <>
      {what} · <span className="ms-best-time">{formatDuration(best.ms)}</span> ·{" "}
      {best.hints === 0 ? "no hints" : count(best.hints, "hint")}
    </>
  );
}
