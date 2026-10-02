import { test } from "node:test";
import assert from "node:assert/strict";
import { clockConfig, gradeEgg, statsView } from "@/lib/egg/game";
import { rollPeriod, rollPose, restTime, dwell } from "@/lib/egg/roll";

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
