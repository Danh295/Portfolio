import { test } from "node:test";
import assert from "node:assert/strict";
import { eggFit, MIN_SCALE } from "@/lib/egg/fit";

// A 400px pot frame, 200px of status text, buttons and padding under it. The block fills the
// visible area and the pot takes what's left, scaled down to fit.
const BASE = { framePx: 400, reservePx: 200, touchPhone: true };

test("off a touch phone nothing is filled or scaled (desktop is unchanged)", () => {
  assert.deepEqual(eggFit({ ...BASE, areaPx: 700, touchPhone: false }), { fill: 0, scale: 1 });
});

test("with room to spare the pot stays full size and the block fills the area", () => {
  assert.deepEqual(eggFit({ ...BASE, areaPx: 700 }), { fill: 700, scale: 1 });
});

test("a tighter area scales the pot to what's left after the reserve", () => {
  // (440 - 200) / 400
  assert.deepEqual(eggFit({ ...BASE, areaPx: 440 }), { fill: 440, scale: 0.6 });
});

test("an exact fit is full size", () => {
  assert.deepEqual(eggFit({ ...BASE, areaPx: 600 }), { fill: 600, scale: 1 });
});

test("a very short area stops at the floor: the pot stays playable", () => {
  assert.equal(MIN_SCALE, 0.5);
  assert.deepEqual(eggFit({ ...BASE, areaPx: 250 }), { fill: 250, scale: MIN_SCALE });
});

test("an area that isn't laid out yet (0px) fills nothing", () => {
  assert.deepEqual(eggFit({ ...BASE, areaPx: 0 }), { fill: 0, scale: 1 });
});
