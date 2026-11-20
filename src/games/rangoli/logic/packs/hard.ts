import { Draw } from "../draw";
import type { Pattern } from "../pattern";

/**
 * Hard: 30 to 64 lines, busier motifs with crossings, loops hanging off one dot and
 * more often two odd dots to start from. Tones: 0 pink, 1 saffron, 2 teal, 3 green,
 * 4 blue, 5 purple.
 */

/** Bada kamal: a big lotus, eight inner petals inside a ring and eight outer petals between them. */
function badaKamal(): Pattern {
  const d = new Draw();
  const seed = d.ring(8, 15);
  const mid = d.ring(16, 38);
  d.circle(seed, 1);
  seed.forEach((dot, i) => d.petal(dot, mid[2 * i], 0, 0.24));
  d.circle(mid, 1);
  mid.forEach((dot, i) => {
    if (i % 2 === 1) d.petal(dot, d.polar(62, -90 + 22.5 * i), 5, 0.26);
  });
  return d.done();
}

/** Kolam 5×5: a five-by-five checkerboard of rounded squares meeting at their corners, a loop at each corner. */
function kolam5(): Pattern {
  const d = new Draw();
  const s = 20;
  const p = (i: number, j: number) => d.dot((i - 2.5) * s, (j - 2.5) * s);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if ((i + j) % 2 === 1) continue;
      const ring = Math.max(Math.abs(i - 2), Math.abs(j - 2));
      const corner = ring === 2 && Math.abs(i - 2) === Math.abs(j - 2);
      const tone = ring === 0 ? 0 : ring === 1 ? 1 : corner ? 2 : 0;
      d.path([p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], tone, true, 0.12);
    }
  }
  [
    [0, 0, -1, -1],
    [5, 0, 1, -1],
    [5, 5, 1, 1],
    [0, 5, -1, 1],
  ].forEach(([i, j, dx, dy]) => d.petal(p(i, j), d.dot((i - 2.5) * s + dx * 12, (j - 2.5) * s + dy * 12), 5, 0.3));
  return d.done();
}

/** Jaali: a lattice of four overlapping diamonds in a frame, a dot at every crossing and a ring in the middle. */
function jaali(): Pattern {
  const d = new Draw();
  const h = 27;
  const frame = 20 + h;
  const centres = [
    [-20, -20],
    [20, -20],
    [20, 20],
    [-20, 20],
  ];
  // Each diamond's corners, and the points where its sides cross its neighbours'.
  const cut = h - 20;
  centres.forEach(([cx, cy]) => {
    const sx = Math.sign(cx);
    const sy = Math.sign(cy);
    const outerX = d.dot(cx + sx * h, cy);
    const outerY = d.dot(cx, cy + sy * h);
    const innerX = d.dot(cx - sx * h, cy);
    const innerY = d.dot(cx, cy - sy * h);
    // Crossings with the neighbour across x = 0, and with the one across y = 0.
    const nearX = d.dot(0, cy - sy * cut);
    const farX = d.dot(0, cy + sy * cut);
    const nearY = d.dot(cx - sx * cut, 0);
    const farY = d.dot(cx + sx * cut, 0);
    d.path([outerX, outerY], 0);
    d.path([outerY, farX, innerX], 0);
    d.path([innerX, nearX, nearY, innerY], 0);
    d.path([innerY, farY, outerX], 0);
  });
  const f = frame;
  d.path(
    [
      d.dot(-f, -f),
      d.dot(-20, -f),
      d.dot(20, -f),
      d.dot(f, -f),
      d.dot(f, -20),
      d.dot(f, 20),
      d.dot(f, f),
      d.dot(20, f),
      d.dot(-20, f),
      d.dot(-f, f),
      d.dot(-f, 20),
      d.dot(-f, -20),
    ],
    2,
    true,
  );
  d.circle(d.ring(4, 40 - h), 1);
  return d.done();
}

/** Mandala: rings within rings, a zigzag star round the centre, petals round that and a circle round it all. */
function mandala(): Pattern {
  const d = new Draw();
  const inner = d.ring(8, 14);
  const star = d.ring(8, 30, -90 + 22.5);
  const outer = d.ring(8, 50, -90 + 22.5);
  d.circle(inner, 0);
  inner.forEach((dot, i) => d.line(dot, star[i], 1).line(star[i], inner[(i + 1) % 8], 1));
  d.circle(star, 2);
  star.forEach((dot, i) => d.petal(dot, outer[i], 0, 0.26));
  d.circle(outer, 5);
  return d.done();
}

/** Pankha: a pleated hand fan with a scalloped edge, its handle and a tassel. */
function pankha(): Pattern {
  const d = new Draw();
  const outer = Array.from({ length: 7 }, (_, k) => d.polar(50, -165 + 25 * k));
  const inner = Array.from({ length: 6 }, (_, k) => d.polar(25, -152.5 + 25 * k));
  const pleats: number[] = [];
  outer.forEach((dot, k) => {
    pleats.push(dot);
    if (k < inner.length) pleats.push(inner[k]);
  });
  d.path(pleats, 0);
  for (let k = 0; k + 1 < outer.length; k++) d.line(outer[k], outer[k + 1], 1, 0.3);
  for (let k = 0; k + 1 < inner.length; k++) d.arc(inner[k], inner[k + 1], 2);
  const pivot = d.dot(0, 0);
  d.line(inner[0], pivot, 2).line(pivot, inner[inner.length - 1], 2);
  const grip = d.dot(0, 24);
  const knot = d.dot(0, 34);
  d.petal(pivot, grip, 4, 0.12);
  d.line(grip, knot, 1);
  d.petal(knot, d.dot(0, 46), 0, 0.3);
  return d.done();
}

/** Seep: a scallop shell with ribbed petals and two little wings, a pearl hanging below. */
function seep(): Pattern {
  const d = new Draw();
  const [cx, cy] = [0, 26];
  const angles = Array.from({ length: 7 }, (_, k) => -170 + (160 / 6) * k);
  const edge = angles.map((deg) => d.polar(46, deg, cx, cy));
  // The inner arc runs between the five ribs; the two outer edges go straight to the hinge.
  const base = angles.map((deg, k) => (k === 0 || k === 6 ? -1 : d.polar(22, deg, cx, cy)));
  const hinge = d.dot(cx, cy);
  d.line(hinge, edge[0], 2);
  for (let k = 0; k + 1 < edge.length; k++) d.line(edge[k], edge[k + 1], 2, 0.25);
  d.line(edge[6], hinge, 2);
  d.line(hinge, base[1], 1);
  for (let k = 1; k < 5; k++) d.arc(base[k], base[k + 1], 1, cx, cy);
  d.line(base[5], hinge, 1);
  for (let k = 1; k <= 5; k++) d.petal(base[k], edge[k], 0, 0.07);
  d.petal(hinge, d.polar(16, 145, cx, cy), 2, 0.15).petal(hinge, d.polar(16, 35, cx, cy), 2, 0.15);
  const pearl = d.ring(4, 7, -90, cx, cy + 26);
  d.line(hinge, pearl[0], 5);
  d.circle(pearl, 5, cx, cy + 26);
  return d.done();
}

/** Bandhanwar: a door hanging of mango leaves and strings of beads and flowers. */
function bandhanwar(): Pattern {
  const d = new Draw();
  const xs = [-52, -26, 0, 26, 52];
  const ys = xs.map((x) => -36 + 8 * (1 - (x / 52) ** 2));
  const string = xs.map((x, i) => d.dot(x, ys[i]));
  d.path(string, 1, false, -0.05);
  string.forEach((dot, i) => {
    const [x, y] = [xs[i], ys[i]];
    if (i % 2 === 0) {
      d.petal(dot, d.dot(x, y + 62), 3, 0.12);
      return;
    }
    const flowers = [16, 32].map((dy) => {
      const flower = d.dot(x, y + dy);
      d.petal(flower, d.dot(x - 12, y + dy), 0, 0.22).petal(flower, d.dot(x + 12, y + dy), 0, 0.22);
      return flower;
    });
    const bead = d.dot(x, y + 47);
    d.petal(dot, flowers[0], 1, 0.16);
    d.petal(flowers[0], flowers[1], 1, 0.16).petal(flowers[1], bead, 1, 0.16);
    d.petal(bead, d.dot(x, y + 60), 0, 0.3);
  });
  return d.done();
}

/** Teen pankh: three peacock feathers fanned out on one stem with a pair of leaves. */
function teenPankh(): Pattern {
  const d = new Draw();
  const base = d.dot(0, 30);
  [-36, 0, 36].forEach((lean) => {
    const angle = ((lean - 90) * Math.PI) / 180;
    const at = (r: number) => d.dot(r * Math.cos(angle), 30 + r * Math.sin(angle));
    const fork = at(28);
    const eye = at(40);
    d.petal(base, fork, 1, 0.05);
    d.petal(fork, at(86), 2, 0.24);
    d.petal(fork, eye, 1, 0.1);
    d.petal(eye, at(70), 4, 0.3);
    d.petal(eye, at(56), 5, 0.18);
  });
  const node = d.dot(0, 44);
  d.path([base, node, d.dot(0, 58)], 3);
  d.petal(node, d.dot(-14, 36), 3, 0.24).petal(node, d.dot(14, 36), 3, 0.24);
  return d.done();
}

/** Gamla: a pot with three flowers, the side ones on curving branches off the stem. */
function gamla(): Pattern {
  const d = new Draw();
  const rimL = d.dot(-19, 8);
  const rimR = d.dot(19, 8);
  const mouth = d.dot(0, 8);
  const footL = d.dot(-12, 40);
  const footR = d.dot(12, 40);
  d.path([rimL, mouth, rimR], 1);
  d.line(rimL, footL, 1, -0.25).line(footL, footR, 1).line(footR, rimR, 1, -0.25);
  const node = d.dot(0, -12);
  const top = d.ring(4, 10, 90, 0, -40);
  d.path([mouth, node, top[0]], 3);
  d.circle(top, 1, 0, -40);
  [1, 2, 3].forEach((k) => d.petal(top[k], d.polar(24, 90 + 90 * k, 0, -40), 0, 0.24));
  [-1, 1].forEach((side) => {
    const [fx, fy] = [36 * side, -8];
    const facing = side < 0 ? -6.3 : 186.3;
    const ring = d.ring(4, 9, facing, fx, fy);
    d.petal(node, ring[0], 3, 0.08);
    d.circle(ring, 1, fx, fy);
    [1, 2, 3].forEach((k) => d.petal(ring[k], d.polar(22, facing + 90 * k, fx, fy), 0, 0.24));
  });
  return d.done();
}

/** Bada sitara: the eight-pointed star of two squares, a flower in its heart reaching every crossing. */
function badaSitara(): Pattern {
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
  const heart = d.ring(8, 13, -67.5);
  const crossings = d.ring(8, Math.hypot(a, k), -67.5);
  d.circle(heart, 5);
  heart.forEach((dot, i) => d.petal(dot, crossings[i], 2, 0.2));
  return d.done();
}

export const HARD: readonly { id: string; name: string; pattern: Pattern }[] = [
  { id: "bada-kamal", name: "Bada kamal", pattern: badaKamal() },
  { id: "kolam-5", name: "Kolam 5×5", pattern: kolam5() },
  { id: "jaali", name: "Jaali", pattern: jaali() },
  { id: "mandala", name: "Mandala", pattern: mandala() },
  { id: "pankha", name: "Pankha", pattern: pankha() },
  { id: "seep", name: "Seep", pattern: seep() },
  { id: "bandhanwar", name: "Bandhanwar", pattern: bandhanwar() },
  { id: "teen-pankh", name: "Teen pankh", pattern: teenPankh() },
  { id: "gamla", name: "Gamla", pattern: gamla() },
  { id: "bada-sitara", name: "Bada sitara", pattern: badaSitara() },
];
