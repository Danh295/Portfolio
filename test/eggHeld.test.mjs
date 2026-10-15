import { test } from "node:test";
import assert from "node:assert/strict";
import { heldAfter } from "@/lib/egg/held";

// "Held" (CONTEXT.md): the egg frame after a tap on a touch screen. One finger on the pot
// turns the egg and the page doesn't scroll there.
const press = (pointerType, inFrame) => ({ type: "press", pointerType, inFrame });

test("a touch inside the egg frame holds it", () => {
  assert.equal(heldAfter(false, press("touch", true)), true);
});

test("a touch outside the frame lets go", () => {
  assert.equal(heldAfter(true, press("touch", false)), false);
});

test("a touch outside the frame while not held changes nothing", () => {
  assert.equal(heldAfter(false, press("touch", false)), false);
});

test("a mouse or a pen never holds and never lets go", () => {
  assert.equal(heldAfter(false, press("mouse", true)), false);
  assert.equal(heldAfter(true, press("mouse", false)), true);
  assert.equal(heldAfter(false, press("pen", true)), false);
});

test("the round ending (the result, stage 5) lets go", () => {
  assert.equal(heldAfter(true, { type: "stage", stage: 5 }), false);
});

test("the stages of a round in progress keep it held", () => {
  for (const stage of [0, 1, 2, 3, 4]) {
    assert.equal(heldAfter(true, { type: "stage", stage }), true, "stage " + stage);
  }
});

test("a stage change doesn't hold an egg that isn't held", () => {
  assert.equal(heldAfter(false, { type: "stage", stage: 2 }), false);
});

test("a tap on the result holds it again, to turn the finished egg", () => {
  const afterRound = heldAfter(true, { type: "stage", stage: 5 });
  assert.equal(heldAfter(afterRound, press("touch", true)), true);
});

test("leaving the gui (a project page, terminal mode) lets go", () => {
  assert.equal(heldAfter(true, { type: "leave" }), false);
  assert.equal(heldAfter(false, { type: "leave" }), false);
});
