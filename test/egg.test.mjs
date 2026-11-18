import { test } from "node:test";
import assert from "node:assert/strict";
import { clockConfig, gradeEgg, statsView, paintDue } from "@/lib/egg/game";
import { countEgg, readBest, count } from "@/lib/egg/counter";
import { rollPeriod, rollPose, restTime, nextStop, dwell } from "@/lib/egg/roll";

test("gradeEgg boundaries (seconds)", () => {
  const C = clockConfig("seconds");
  const w = (x) => gradeEgg(x, C).word;
  assert.equal(w(6.5), "perfect");
  assert.equal(w(6.64), "perfect");
  assert.equal(w(6.7), "so close");
  assert.equal(w(6.9), "jammy");
  assert.equal(w(5.9), "runny");
  assert.equal(w(7.9), "firm");
  assert.equal(w(8.1), "hard-boiled");
  assert.equal(gradeEgg(6.7, C).type, "jammy", "so close counts as jammy");
  assert.equal(gradeEgg(6.5, C).off, "dead on");
});

test("gradeEgg boundaries (minutes)", () => {
  const C = clockConfig("minutes");
  assert.equal(gradeEgg(390, C).word, "perfect");
  assert.equal(gradeEgg(390 + 20, C).word, "jammy");
  assert.equal(gradeEgg(390 - 60, C).word, "runny");
  assert.equal(gradeEgg(390 + 120, C).word, "hard-boiled");
});

test("statsView: device counts, singular/plural", () => {
  const types = ["perfect", "jammy"];
  assert.equal(
    statsView({ vals: [1, 0], you: "perfect" }, types).head,
    "1 egg cooked on this device",
  );
  assert.equal(
    statsView({ vals: [2, 3], you: "jammy" }, types).head,
    "5 eggs cooked on this device",
  );
  const v = statsView({ vals: [0, 0], you: "jammy" }, types);
  assert.equal(v.rows.length, 2);
  assert.ok(v.rows.every((r) => r.bar.length === 10));
});

test("rolling egg: finite period, time runs forward, energy-shaped dwell", () => {
  const P = rollPeriod();
  assert.ok(P > 1 && P < 10, String(P));
  let prev = rollPose(0);
  for (let t = 0.01; t < 2 * P; t += 0.01) {
    const p = rollPose(t);
    assert.ok(p.theta >= 0 && p.theta < 2 * Math.PI);
    assert.ok(p.x >= prev.x - 1e-9, "never rolls backwards");
    assert.ok(Number.isFinite(p.h) && p.omega > 0);
    prev = p;
  }
  assert.ok(Math.abs(rollPose(0.3).h - rollPose(0.3 + P).h) < 1e-9, "periodic");
  assert.ok(Number.isFinite(restTime()));
  const { share } = dwell();
  assert.ok(Math.abs(share.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  assert.ok(share[0] > share[2], "lingers on the ends, sweeps past the sides");
});

test("nextStop: the 404 egg comes to rest on its side within the limit, from any start", () => {
  const P = rollPeriod(),
    rest = rollPose(restTime()).theta;
  // Orientation distance on the circle, so 0 and 2π count as the same pose.
  const apart = (a, b) => {
    const d = Math.abs(a - b) % (2 * Math.PI);
    return Math.min(d, 2 * Math.PI - d);
  };
  // From the start, from a stop (the replay), and from times that fall anywhere in a turn.
  for (const from of [0, nextStop(0), 0.4, 1.7, 2.9, 7.31, 12.5]) {
    const stop = nextStop(from);
    assert.ok(stop > from, "it moves first: " + from);
    assert.ok(stop <= from + 5 + 1e-9, "never past the limit: " + from);
    assert.ok(apart(rollPose(stop).theta, rest) < 1e-3, "lies on its side: " + from);
    assert.ok(stop + P > from + 5, "the last rest moment that fits: " + from);
  }
});

// Paints are timed, not counted: the same 30 and 15 a second on a 60, 120 or 144Hz display.
test("paintDue: 30 paints a second live and 15 at rest, whatever the display's rate", () => {
  for (const hz of [60, 120, 144, 240]) {
    const count = (atRest) => {
      let last = 0,
        paints = 0;
      for (let f = 1; f <= hz * 4; f++) {
        const now = (f * 1000) / hz;
        if (paintDue(now, last, atRest)) {
          paints++;
          last = now;
        }
      }
      return paints / 4;
    };
    assert.ok(Math.abs(count(false) - 30) <= 3, hz + "Hz live: " + count(false));
    assert.ok(Math.abs(count(true) - 15) <= 2, hz + "Hz at rest: " + count(true));
  }
  assert.equal(paintDue(100, 0, true), true, "the first frame paints");
});

// Storage is the visitor's to edit: counts and best times are cleaned where they are read.
const withStorage = (data, fn) => {
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = String(v)),
  };
  try {
    return fn();
  } finally {
    globalThis.localStorage = prev;
  }
};

test("egg counts: tampered storage becomes finite non-negative integers", () => {
  assert.equal(count(-1), 0);
  assert.equal(count(2.7), 2);
  assert.equal(count("3"), 0, "a string is not a count");
  assert.equal(count(NaN), 0);
  assert.equal(count(Infinity), 0);
  assert.equal(count(null), 0);
  assert.equal(count(5), 5);
  const types = ["perfect", "jammy", "firm"];
  const r = withStorage({ "danny-egg-local": '{"perfect":-1,"jammy":"x"}' }, () =>
    countEgg("firm", types),
  );
  assert.deepEqual(r.vals, [0, 0, 1]);
  const bad = withStorage({ "danny-egg-local": "[1,2]" }, () => countEgg("jammy", types));
  assert.deepEqual(bad.vals, [0, 1, 0]);
});

test("statsView: negative or odd counts never throw", () => {
  const types = ["perfect", "jammy", "firm"];
  const v = statsView({ vals: [-1, 1, 0], you: "jammy" }, types);
  assert.equal(v.head, "1 egg cooked on this device");
  assert.ok(v.rows.every((r) => r.bar.length === 10));
  assert.doesNotThrow(() => statsView({ vals: [NaN, Infinity, 2.5], you: "x" }, types));
  assert.doesNotThrow(() => statsView({ vals: [1], you: "x" }, types), "short vals");
});

test("readBest: a stored best time is a finite non-negative number per clock mode", () => {
  const sec = clockConfig("seconds"),
    min = clockConfig("minutes");
  const data = { "danny-egg-best-sec": "6.4", "danny-egg-best-min": "-5" };
  assert.equal(
    withStorage(data, () => readBest(sec)),
    6.4,
  );
  assert.equal(
    withStorage(data, () => readBest(min)),
    null,
    "negative",
  );
  for (const bad of ["abc", "", "NaN", "Infinity"]) {
    assert.equal(
      withStorage({ "danny-egg-best-sec": bad }, () => readBest(sec)),
      null,
      bad,
    );
  }
});
