import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldReveal } from "@/lib/reveal";

const base = { jumping: false, visible: false, active: false, labelShown: false, focused: false };
const at = (over) => shouldReveal({ ...base, ...over });

test("any scroll the user makes: a section starts as soon as any of it shows", () => {
  assert.equal(at({}), false, "not on screen yet");
  assert.equal(at({ visible: true }), true, "wheel, trackpad, touch, Space or PageDown alike");
  assert.equal(at({ visible: true, active: false, labelShown: false }), true, "header off screen");
});

test("a jump in flight: only its target, once its header is fully on screen", () => {
  assert.equal(at({ jumping: true, visible: true }), false, "a section the jump flies past");
  assert.equal(at({ jumping: true, visible: true, active: true }), false, "header not shown yet");
  assert.equal(at({ jumping: true, visible: true, active: true, labelShown: true }), true);
  assert.equal(at({ jumping: true, active: true, labelShown: true }), true, "the target lands");
});

test("keyboard focus inside a waiting section always starts it", () => {
  assert.equal(at({ focused: true }), true);
  assert.equal(at({ jumping: true, focused: true }), true);
});
