import { test } from "node:test";
import assert from "node:assert/strict";
import { frameFor } from "@/lib/viewportFrame";

// The numbers a real iPhone (Safari, iOS 26) reported in terminal mode with the keyboard up:
// innerHeight 695, visualViewport.height 358, offsetTop 0, scale 1.
const KEYBOARD = {
  innerHeight: 695,
  vvHeight: 358,
  vvOffsetTop: 0,
  vvScale: 1,
  editableFocused: true,
};

test("a keyboard is up: the prompt is focused and the visible area is much shorter", () => {
  assert.deepEqual(frameFor(KEYBOARD), { top: 0, height: 358, keyboard: true });
});

test("the keyboard is closing: stale numbers with nothing focused are not a keyboard", () => {
  assert.equal(frameFor({ ...KEYBOARD, editableFocused: false }).keyboard, false);
});

test("Safari's toolbar moving is not a keyboard: the area shrinks by less than 80px", () => {
  const f = frameFor({ ...KEYBOARD, vvHeight: 650 });
  assert.deepEqual(f, { top: 0, height: 650, keyboard: false });
  // and when the toolbar collapses, innerHeight and the visual viewport grow together
  assert.deepEqual(frameFor({ ...KEYBOARD, innerHeight: 760, vvHeight: 760 }), {
    top: 0,
    height: 760,
    keyboard: false,
  });
});

test("iOS has panned the page to show the prompt: the frame follows the visible area", () => {
  const f = frameFor({ ...KEYBOARD, vvHeight: 300, vvOffsetTop: 40 });
  assert.deepEqual(f, { top: 40, height: 300, keyboard: true });
});

test("fractions are rounded to whole pixels", () => {
  const f = frameFor({ ...KEYBOARD, vvHeight: 357.67, vvOffsetTop: 0.4 });
  assert.deepEqual(f, { top: 0, height: 358, keyboard: true });
});

test("a pinch-zoomed page has no frame to follow", () => {
  assert.equal(frameFor({ ...KEYBOARD, vvScale: 1.5 }), null);
  assert.notEqual(frameFor({ ...KEYBOARD, vvScale: 1.005 }), null, "rounding noise isn't a zoom");
});
