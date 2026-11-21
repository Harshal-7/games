/**
 * Exact fractions, so 8 ÷ 3 × 3 is exactly 8 and nothing rounds. Always in lowest terms
 * with a positive bottom, so two equal values have equal parts.
 */
export type Frac = { readonly n: number; readonly d: number };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function frac(n: number, d = 1): Frac {
  if (d === 0 || !Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`Not a fraction: ${n}/${d}`);
  if (n === 0) return { n: 0, d: 1 };
  const g = gcd(n, d) * Math.sign(d);
  return { n: n / g, d: d / g };
}

export type Op = "+" | "-" | "×" | "÷";
export const OPS: readonly Op[] = ["+", "-", "×", "÷"];

/** a op b, or null for a division by zero. */
export function apply(a: Frac, op: Op, b: Frac): Frac | null {
  switch (op) {
    case "+":
      return frac(a.n * b.d + b.n * a.d, a.d * b.d);
    case "-":
      return frac(a.n * b.d - b.n * a.d, a.d * b.d);
    case "×":
      return frac(a.n * b.n, a.d * b.d);
    case "÷":
      return b.n === 0 ? null : frac(a.n * b.d, a.d * b.n);
  }
}

export function equals(a: Frac, b: Frac): boolean {
  return a.n === b.n && a.d === b.d;
}

export function isWhole(a: Frac): boolean {
  return a.d === 1;
}

/** "8/3", "-1/3", "24". */
export function show(a: Frac): string {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

/** The sign as people write it: a real minus, not a hyphen. */
export function showOp(op: Op): string {
  return op === "-" ? "−" : op;
}

export const TARGET = frac(24);
