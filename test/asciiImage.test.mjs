import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RAMP,
  structureLevels,
  gridRows,
  revealOrder,
  revealCount,
  scrambleFrame,
  seedFrom,
  LOCKED,
} from "@/lib/ascii/image";

// A grey image as a flat array, row by row.
const flat = (n, v) => new Array(n).fill(v);

test("structureLevels: a flat image is all blank (no structure, no ink)", () => {
  const l = structureLevels(flat(64, 200));
  assert.equal(l.length, 64);
  assert.ok(l.every((x) => x === 0));
});

test("structureLevels: depends on distance from the median, not on brightness", () => {
  // light text on dark, and dark text on light: the same shape gives the same levels
  const dark = flat(100, 10),
    light = flat(100, 240);
  for (const i of [3, 4, 5, 40, 41, 42, 77]) {
    dark[i] = 245;
    light[i] = 5;
  }
  assert.deepEqual(structureLevels(dark), structureLevels(light));
  const l = structureLevels(dark);
  assert.ok(l[4] > 0 && l[0] === 0, "the shape is inked, the background is not");
});

test("structureLevels: values are integers 0..9 (an index into the ramp)", () => {
  const g = Array.from({ length: 200 }, (_, i) => (i * 37) % 256);
  for (const x of structureLevels(g)) {
    assert.ok(Number.isInteger(x) && x >= 0 && x <= RAMP.length - 1);
  }
});

test("structureLevels: a noise floor keeps a faint gradient blank", () => {
  // a soft gradient (levels 100..110) with one strong mark
  const g = Array.from({ length: 100 }, (_, i) => 100 + (i % 11));
  g[50] = 250;
  const l = structureLevels(g);
  assert.equal(l[50] > 0, true);
  const inked = l.filter((x, i) => i !== 50 && x > 0).length;
  assert.equal(inked, 0, "the gradient's ripple is below the floor");
});

test("structureLevels: the strongest cells reach the top of the ramp", () => {
  const g = flat(100, 0);
  for (let i = 0; i < 10; i++) g[i] = 255;
  const l = structureLevels(g);
  assert.equal(Math.max(...l), RAMP.length - 1);
});

test("gridRows: the stored grid at its own width comes out unchanged", () => {
  const grid = { cols: 4, rows: 2, cells: "01239876" };
  const rows = gridRows(grid, 4);
  assert.equal(rows.length, 2);
  assert.equal(rows[0], RAMP[0] + RAMP[1] + RAMP[2] + RAMP[3]);
  assert.equal(rows[1], RAMP[9] + RAMP[8] + RAMP[7] + RAMP[6]);
});

test("gridRows: fewer columns keeps the aspect (rows scale with columns)", () => {
  const grid = { cols: 8, rows: 4, cells: "0".repeat(32) };
  const rows = gridRows(grid, 4);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.length === 4));
});

test("gridRows: at least one row, and never empty rows", () => {
  const grid = { cols: 100, rows: 2, cells: "5".repeat(200) };
  const rows = gridRows(grid, 3);
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => r.length === 3));
});

test("revealOrder: a permutation of 0..n-1, the same for the same seed", () => {
  const a = revealOrder(50, 7),
    b = revealOrder(50, 7),
    c = revealOrder(50, 8);
  assert.deepEqual([...a], [...b]);
  assert.notDeepEqual([...a], [...c]);
  assert.deepEqual(
    [...a].sort((x, y) => x - y),
    Array.from({ length: 50 }, (_, i) => i),
  );
});

test("revealCount: stepped, nothing at 0 and everything at the end", () => {
  const cfg = { ms: 600, steps: 6 };
  assert.equal(revealCount(0, cfg, 600), 0);
  assert.equal(revealCount(99, cfg, 600), 0, "inside the first step nothing moves yet");
  assert.equal(revealCount(100, cfg, 600), 100);
  assert.equal(revealCount(350, cfg, 600), 300);
  assert.equal(revealCount(600, cfg, 600), 600);
  assert.equal(revealCount(5000, cfg, 600), 600);
});

test("revealCount: reduced motion is three coarse steps", () => {
  const cfg = { ms: 600, steps: 3 };
  assert.equal(revealCount(199, cfg, 90), 0);
  assert.equal(revealCount(200, cfg, 90), 30);
  assert.equal(revealCount(400, cfg, 90), 60);
  assert.equal(revealCount(600, cfg, 90), 90);
});

test("scrambleFrame: junk while it runs, the locked message once it is done", () => {
  const w = 40,
    h = 5;
  const mid = scrambleFrame(2, 5, w, h, 1);
  assert.equal(mid.split("\n").length, h);
  assert.ok(mid.split("\n").every((r) => r.length === w));
  assert.ok(!mid.includes(LOCKED), "not locked mid-scramble");
  const done = scrambleFrame(5, 5, w, h, 1);
  assert.ok(done.includes(LOCKED));
  assert.equal(done.split("\n").length, h);
  assert.ok(done.split("\n").every((r) => r.length === w));
  assert.equal(scrambleFrame(9, 5, w, h, 1), done, "later steps stay locked");
});

test("scrambleFrame: the same step and seed give the same frame", () => {
  assert.equal(scrambleFrame(1, 5, 30, 4, 3), scrambleFrame(1, 5, 30, 4, 3));
});

test("LOCKED is the line the design settled on", () => {
  assert.equal(LOCKED, "[ access denied: proprietary ]");
});

test("seedFrom: the same text gives the same seed, keys of one length give different ones", () => {
  assert.equal(seedFrom("crapos/boot"), seedFrom("crapos/boot"));
  const keys = ["crapos/boot", "operaid/landing", "anifriend/pipeline"];
  assert.ok(Number.isInteger(seedFrom(keys[0])));
  assert.notEqual(seedFrom("ab/cd"), seedFrom("ba/dc"), "same length, different seed");
  assert.equal(new Set(keys.map(seedFrom)).size, keys.length);
  assert.notDeepEqual(
    [...revealOrder(40, seedFrom("ab/cd"))],
    [...revealOrder(40, seedFrom("ba/dc"))],
  );
});
