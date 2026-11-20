import { Draw } from "../draw";
import type { Pattern } from "../pattern";

/**
 * Easy: 6 to 16 lines, each motif drawn once. Tones: 0 pink, 1 saffron, 2 teal,
 * 3 green, 4 blue, 5 purple.
 */

/** Phool: four petals round a little ring. */
function phool(): Pattern {
  const d = new Draw();
  const ring = d.ring(4, 12);
  d.circle(ring, 1);
  ring.forEach((dot, i) => d.petal(dot, d.polar(50, -90 + 90 * i), 0, 0.3));
  return d.done();
}

/** Aam ka patta: a mango leaf with its midrib, two veins and the stalk. */
function aamPatta(): Pattern {
  const d = new Draw();
  const base = d.dot(-26, 26);
  const tip = d.dot(26, -26);
  const mid = d.dot(0, 0);
  const stalk = d.dot(-40, 40);
  d.line(base, tip, 3, 0.34).line(base, tip, 3, -0.34);
  d.line(base, mid, 2).line(mid, tip, 2);
  // Veins: little loops off the midrib.
  d.petal(mid, d.dot(-8, -14), 2, 0.28).petal(mid, d.dot(14, 8), 2, 0.28);
  d.line(stalk, base, 1);
  return d.done();
}

/** Diya: the bowl, its rim, the flame and a little stand. */
function diya(): Pattern {
  const d = new Draw();
  const left = d.dot(-40, 0);
  const right = d.dot(40, 0);
  const wick = d.dot(0, 0);
  const bottom = d.dot(0, 26);
  const flame = d.dot(0, -44);
  d.line(left, bottom, 1, -0.22).line(bottom, right, 1, -0.22);
  d.line(left, wick, 1).line(wick, right, 1);
  d.line(wick, flame, 0, 0.32).line(wick, flame, 0, -0.32);
  const footL = d.dot(-14, 42);
  const footR = d.dot(14, 42);
  d.path([bottom, footL, footR], 2, true);
  return d.done();
}

/** Patang: a kite with its spine and a tail with a bow. */
function patang(): Pattern {
  const d = new Draw();
  const top = d.dot(0, -46);
  const right = d.dot(28, -14);
  const bottom = d.dot(0, 18);
  const left = d.dot(-28, -14);
  d.path([top, right, bottom, left], 0, true);
  d.line(top, bottom, 4);
  const knot = d.dot(10, 34);
  const end = d.dot(0, 50);
  d.line(bottom, knot, 2, -0.3).line(knot, end, 2, 0.3);
  d.petal(knot, d.dot(26, 30), 1, 0.35);
  return d.done();
}

/** Titli: a butterfly, its wings off both ends of its body. */
function titli(): Pattern {
  const d = new Draw();
  const head = d.dot(0, -16);
  const tail = d.dot(0, 16);
  d.petal(head, tail, 2, 0.12);
  d.petal(head, d.dot(-42, -40), 0, 0.22).petal(head, d.dot(42, -40), 0, 0.22);
  d.petal(tail, d.dot(-34, 40), 5, 0.22).petal(tail, d.dot(34, 40), 5, 0.22);
  return d.done();
}

/** Machli: a fish with a tail, a fin on top and one underneath. */
function machli(): Pattern {
  const d = new Draw();
  const mouth = d.dot(-44, 0);
  const joint = d.dot(22, 0);
  const back = d.dot(-10, -20);
  const belly = d.dot(-10, 20);
  d.line(mouth, back, 4, 0.18).line(back, joint, 4, 0.18);
  d.line(mouth, belly, 4, -0.18).line(belly, joint, 4, -0.18);
  d.path([joint, d.dot(44, -18), d.dot(44, 18)], 2, true);
  d.petal(back, d.dot(-18, -42), 1, 0.2).petal(belly, d.dot(-18, 42), 1, 0.2);
  return d.done();
}

/** Chowk: a square with a diamond inside, corner to middle. */
function chowk(): Pattern {
  const d = new Draw();
  const n = d.dot(0, -40);
  const e = d.dot(40, 0);
  const s = d.dot(0, 40);
  const w = d.dot(-40, 0);
  const corners = [d.dot(-40, -40), d.dot(40, -40), d.dot(40, 40), d.dot(-40, 40)];
  d.path([corners[0], n, corners[1], e, corners[2], s, corners[3], w], 4, true);
  d.path([n, e, s, w], 0, true);
  return d.done();
}

/** Tara: a five-pointed star, with a dot wherever its lines cross. */
function tara(): Pattern {
  const d = new Draw();
  const outer = d.ring(5, 48);
  // The inner pentagon, where the star's lines cross.
  const inner = d.ring(5, 48 * 0.382, -90 + 36);
  for (let i = 0; i < 5; i++) {
    // The line from point i to point i + 2 crosses the inner pentagon at two dots.
    const a = outer[i];
    const b = outer[(i + 2) % 5];
    d.path([a, inner[i], inner[(i + 1) % 5], b], i % 2 === 0 ? 1 : 0);
  }
  return d.done();
}

/** Paan: a heart-shaped leaf with its midrib and two veins. */
function paan(): Pattern {
  const d = new Draw();
  const notch = d.dot(0, -24);
  const tip = d.dot(0, 42);
  const left = d.dot(-36, -20);
  const right = d.dot(36, -20);
  d.line(notch, left, 3, -0.5).line(left, tip, 3, -0.2);
  d.line(notch, right, 3, 0.5).line(right, tip, 3, 0.2);
  const mid = d.dot(0, 6);
  d.line(notch, mid, 2).line(mid, tip, 2);
  d.petal(mid, d.dot(-18, -6), 2, 0.22).petal(mid, d.dot(18, -6), 2, 0.22);
  return d.done();
}

/** Kali: a lotus bud in its cup, on a stem with two leaves. */
function kali(): Pattern {
  const d = new Draw();
  const cupL = d.dot(-14, 0);
  const cupR = d.dot(14, 0);
  const mid = d.dot(0, 0);
  const base = d.dot(0, 12);
  d.path([cupL, mid, cupR], 1);
  d.line(cupL, base, 1, -0.3).line(base, cupR, 1, -0.3);
  d.petal(mid, d.dot(0, -46), 0, 0.26);
  d.petal(cupL, d.dot(-34, -28), 0, 0.26).petal(cupR, d.dot(34, -28), 0, 0.26);
  const node = d.dot(0, 32);
  d.line(base, node, 3);
  d.petal(node, d.dot(-28, 24), 3, 0.3).petal(node, d.dot(28, 24), 3, 0.3);
  d.line(node, d.dot(0, 50), 3);
  return d.done();
}

export const EASY: readonly { id: string; name: string; pattern: Pattern }[] = [
  { id: "phool", name: "Phool", pattern: phool() },
  { id: "aam-patta", name: "Aam ka patta", pattern: aamPatta() },
  { id: "diya", name: "Diya", pattern: diya() },
  { id: "patang", name: "Patang", pattern: patang() },
  { id: "titli", name: "Titli", pattern: titli() },
  { id: "machli", name: "Machli", pattern: machli() },
  { id: "chowk", name: "Chowk", pattern: chowk() },
  { id: "tara", name: "Tara", pattern: tara() },
  { id: "paan", name: "Paan", pattern: paan() },
  { id: "kali", name: "Kali", pattern: kali() },
];
