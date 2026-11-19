/** 83_000 → "1:23", 3_723_000 → "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** 1 → "1 undo", 3 → "3 undos". */
export function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
