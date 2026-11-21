import { Draw } from "../draw";
import type { Pattern } from "../pattern";

/**
 * Medium: 16 to 32 lines, a motif with a second layer or a few parts hanging off it.
 * Tones: 0 pink, 1 saffron, 2 teal, 3 green, 4 blue, 5 purple.
 */

/** Dots placed in a frame turned by `degrees` about the centre, so a motif can lean. */
function turned(d: Draw, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (x: number, y: number) => d.dot(x * c - y * s, x * s + y * c);
}

/** Kamal: a lotus from above, four long petals and four short ones round a ring. */
function kamal(): Pattern {
  const d = new Draw();
  const ring = d.ring(8, 14);
  d.circle(ring, 1);
  ring.forEach((dot, i) => {
    const long = i % 2 === 0;
    d.petal(dot, d.polar(long ? 48 : 34, -90 + 45 * i), long ? 0 : 5, long ? 0.24 : 0.26);
  });
  return d.done();
}

/** Suraj: a sun, a ring of pointed rays round its disc and a square inside. */
function suraj(): Pattern {
  const d = new Draw();
  const disc = d.ring(8, 20);
  const tips = d.ring(8, 48, -90 + 22.5);
  d.circle(disc, 0);
  disc.forEach((dot, i) => d.line(dot, tips[i], 1).line(tips[i], disc[(i + 1) % 8], 1));
  d.path([disc[0], disc[2], disc[4], disc[6]], 5, true);
  return d.done();
}

/** Toran: a string of long mango leaves with flower drops between them. */
function toran(): Pattern {
  const d = new Draw();
  const xs = [-48, -32, -16, 0, 16, 32, 48];
  const ys = xs.map((x) => -32 + 8 * (1 - (x / 48) ** 2));
  const string = xs.map((x, i) => d.dot(x, ys[i]));
  d.path(string, 1, false, -0.05);
  string.forEach((dot, i) => {
    if (i % 2 === 0) d.petal(dot, d.dot(xs[i], ys[i] + 56), 3, 0.14);
    else d.petal(dot, d.dot(xs[i], ys[i] + 22), 0, 0.26);
  });
  return d.done();
}

/** Mor pankh: a peacock feather, its eye inside the frond and barbs down the quill. */
function morPankh(): Pattern {
  const d = new Draw();
  const at = turned(d, 32);
  const base = at(0, 0);
  const eye = at(0, -18);
  d.petal(base, at(0, -72), 2, 0.26);
  d.line(base, eye, 1);
  d.petal(eye, at(0, -58), 4, 0.3);
  d.petal(eye, at(0, -42), 5, 0.18);
  const quill = [base, at(0, 14), at(0, 29), at(0, 44), at(0, 58)];
  d.path(quill, 1);
  [20, 16, 12].forEach((reach, i) => {
    const y = 14 + 15 * i;
    d.petal(quill[i + 1], at(reach, y - reach * 0.7), 3, 0.2);
    d.petal(quill[i + 1], at(-reach, y - reach * 0.7), 3, 0.2);
  });
  return d.done();
}

/** Kairi: a paisley with a curl at its tip and a flower in its belly. */
function kairi(): Pattern {
  const d = new Draw();
  const [cx, cy, r] = [0, 14, 30];
  const [right, bottom, left] = [0, 90, 180].map((deg) => d.polar(r, deg, cx, cy));
  d.arc(right, bottom, 0, cx, cy).arc(bottom, left, 0, cx, cy);
  const tip = d.dot(24, -46);
  d.line(left, tip, 0, 0.3).line(tip, right, 0, -0.1);
  d.petal(tip, d.dot(40, -38), 1, 0.32);
  const seeds = d.ring(4, 10, 0, cx, cy);
  d.circle(seeds, 1, cx, cy);
  d.petal(seeds[0], right, 5, 0.2).petal(seeds[1], bottom, 5, 0.2).petal(seeds[2], left, 5, 0.2);
  d.petal(seeds[3], d.dot(cx, cy - 34), 5, 0.22);
  return d.done();
}

/** Sitara: an eight-pointed star of two squares, with a dot wherever they cross. */
function sitara(): Pattern {
  const d = new Draw();
  const a = 34;
  const k = a * (Math.SQRT2 - 1);
  const r = a * Math.SQRT2;
  const square = [
    [d.dot(-a, -a), d.dot(-k, -a), d.dot(k, -a), d.dot(a, -a)],
    [d.dot(a, -a), d.dot(a, -k), d.dot(a, k), d.dot(a, a)],
    [d.dot(a, a), d.dot(k, a), d.dot(-k, a), d.dot(-a, a)],
    [d.dot(-a, a), d.dot(-a, k), d.dot(-a, -k), d.dot(-a, -a)],
  ];
  square.forEach((side) => d.path(side, 0));
  const diamond = [
    [d.dot(0, -r), d.dot(k, -a), d.dot(a, -k), d.dot(r, 0)],
    [d.dot(r, 0), d.dot(a, k), d.dot(k, a), d.dot(0, r)],
    [d.dot(0, r), d.dot(-k, a), d.dot(-a, k), d.dot(-r, 0)],
    [d.dot(-r, 0), d.dot(-a, -k), d.dot(-k, -a), d.dot(0, -r)],
  ];
  diamond.forEach((side) => d.path(side, 1));
  return d.done();
}

/** Jaal: a net of five diamonds touching at their corners, a loop on each outer point. */
function jaal(): Pattern {
  const d = new Draw();
  const s = 16;
  const diamond = (cx: number, cy: number) => [d.dot(cx, cy - s), d.dot(cx + s, cy), d.dot(cx, cy + s), d.dot(cx - s, cy)];
  d.path(diamond(0, 0), 0, true, -0.12);
  const outer = [
    [0, -2 * s],
    [2 * s, 0],
    [0, 2 * s],
    [-2 * s, 0],
  ];
  outer.forEach(([cx, cy], i) => {
    const ring = diamond(cx, cy);
    d.path(ring, 2, true, 0.12);
    d.petal(ring[i], d.dot(cx + Math.sign(cx) * (s + 16), cy + Math.sign(cy) * (s + 16)), 1, 0.3);
  });
  return d.done();
}

/** Chakra: a wheel, eight petal spokes between its hub and its rim. */
function chakra(): Pattern {
  const d = new Draw();
  const hub = d.ring(8, 13);
  const rim = d.ring(8, 44);
  d.circle(hub, 1).circle(rim, 4);
  hub.forEach((dot, i) => d.petal(dot, rim[i], 0, 0.15));
  return d.done();
}

/** Phool bel: a flower vine, one flower above it and one below, two leaves in between. */
function phoolBel(): Pattern {
  const d = new Draw();
  const vine = [d.dot(-60, 0), d.dot(-30, -10), d.dot(0, 0), d.dot(30, 10), d.dot(60, 0)];
  d.path(vine, 3);
  [-1, 1].forEach((side) => {
    const [cx, cy] = [30 * side, 21 * side];
    const ring = d.ring(4, 11, side < 0 ? 90 : -90, cx, cy);
    d.circle(ring, 1, cx, cy);
    [1, 2, 3].forEach((k) => d.petal(ring[k], d.polar(25, (side < 0 ? 90 : -90) + 90 * k, cx, cy), 0, 0.26));
  });
  d.petal(vine[2], d.dot(16, -20), 3, 0.22).petal(vine[2], d.dot(-16, 20), 3, 0.22);
  return d.done();
}

/** Jhumka: a bell earring, its stud and stem, the dome and five drops along its rim. */
function jhumka(): Pattern {
  const d = new Draw();
  const stud = d.ring(4, 6, -90, 0, -40);
  d.circle(stud, 5, 0, -40);
  const top = d.dot(0, -18);
  d.line(stud[2], top, 1);
  const rim = [d.dot(-26, 8), d.dot(-13, 8), d.dot(0, 8), d.dot(13, 8), d.dot(26, 8)];
  d.line(top, rim[0], 0, -0.25).line(top, rim[4], 0, 0.25);
  d.line(top, rim[2], 1);
  d.path(rim, 0);
  rim.forEach((dot, i) => d.petal(dot, d.dot(-26 + 13 * i, 25), i % 2 === 0 ? 5 : 1, 0.3));
  return d.done();
}

export const MEDIUM: readonly { id: string; name: string; pattern: Pattern }[] = [
  { id: "kamal", name: "Kamal", pattern: kamal() },
  { id: "suraj", name: "Suraj", pattern: suraj() },
  { id: "toran", name: "Toran", pattern: toran() },
  { id: "mor-pankh", name: "Mor pankh", pattern: morPankh() },
  { id: "kairi", name: "Kairi", pattern: kairi() },
  { id: "sitara", name: "Sitara", pattern: sitara() },
  { id: "jaal", name: "Jaal", pattern: jaal() },
  { id: "chakra", name: "Chakra", pattern: chakra() },
  { id: "phool-bel", name: "Phool bel", pattern: phoolBel() },
  { id: "jhumka", name: "Jhumka", pattern: jhumka() },
];
