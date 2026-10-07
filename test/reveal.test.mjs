import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldReveal } from "@/lib/reveal";

const base = { jump: "none", visible: false, active: false, labelShown: false, focused: false };
const at = (over) => shouldReveal({ ...base, ...over });

test("the user scrolled: a section starts once enough of it shows", () => {
  assert.equal(at({}), false, "not on screen yet (or only a sliver)");
  assert.equal(at({ visible: true }), true, "wheel, trackpad, touch, Space or PageDown alike");
  assert.equal(at({ visible: true, active: false, labelShown: false }), true, "header off screen");
});

test("a jump in flight starts only its target, the moment its header shows", () => {
  assert.equal(at({ jump: "moving", visible: true }), false, "a section it flies past");
  assert.equal(at({ jump: "moving", visible: true, active: true }), false, "header not shown yet");
  assert.equal(at({ jump: "moving", active: true, labelShown: true }), true, "no wait to land");
});

test("a landed jump starts only the active section, once its header shows", () => {
  assert.equal(at({ jump: "landed", visible: true, active: true, labelShown: true }), true);
  assert.equal(at({ jump: "landed", active: true }), false, "header not fully shown");
  assert.equal(at({ jump: "landed", visible: true }), false, "a section peeking below waits");
  // Layout moved under the jump (its header ended up under the nav): still the target.
  assert.equal(at({ jump: "landed", active: true, visible: true }), true, "target, header hidden");
});

test("focus inside a waiting section always starts it", () => {
  for (const jump of ["none", "moving", "landed"])
    assert.equal(at({ jump, focused: true }), true, jump);
});
