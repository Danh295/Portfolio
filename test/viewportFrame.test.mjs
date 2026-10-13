import { test } from "node:test";
import assert from "node:assert/strict";
import { frameFor, nextBaseline } from "@/lib/viewportFrame";

// What a real iPhone (Safari, iOS 26) reported in terminal mode as the keyboard opened
// (telemetry from the phone, 2026-10-13). iOS reports it in two steps:
//   1. window resize:  innerHeight 695, visualViewport.height 358, offsetTop 0
//   2. then a scroll:  innerHeight 358, visualViewport.height 358, offsetTop 337, scrollY 337
// (the layout viewport itself shrinks and the page scrolls). The height before the keyboard
// was 695, and a keyboard is only ever up while the prompt has focus.
const BEFORE = { height: 695, orientation: "portrait-primary" };
const STEP1 = {
  baselineHeight: 695,
  vvHeight: 358,
  vvOffsetTop: 0,
  vvScale: 1,
  editableFocused: true,
};
const STEP2 = {
  baselineHeight: 695,
  vvHeight: 358,
  vvOffsetTop: 337,
  vvScale: 1,
  editableFocused: true,
};

test("the keyboard opens in two steps and both are a keyboard", () => {
  assert.deepEqual(frameFor(STEP1), { top: 0, height: 358, keyboard: true });
  // innerHeight is 358 here, so innerHeight - visualViewport.height says 'no keyboard'
  assert.deepEqual(frameFor(STEP2), { top: 337, height: 358, keyboard: true });
});

test("the keyboard is closing: stale numbers with nothing focused are not a keyboard", () => {
  assert.equal(frameFor({ ...STEP2, editableFocused: false }).keyboard, false);
});

test("Safari's toolbar moving is not a keyboard: it changes the height by about 110px", () => {
  // the toolbar collapsing and coming back, measured on the phone: 622 .. 735
  const f = frameFor({ ...STEP1, baselineHeight: 735, vvHeight: 622 });
  assert.deepEqual(f, { top: 0, height: 622, keyboard: false });
});

test("a short keyboard (landscape) still counts", () => {
  const f = frameFor({ ...STEP1, baselineHeight: 340, vvHeight: 150 });
  assert.equal(f.keyboard, true);
});

test("fractions are rounded to whole pixels", () => {
  const f = frameFor({ ...STEP1, vvHeight: 357.67, vvOffsetTop: 0.4 });
  assert.deepEqual(f, { top: 0, height: 358, keyboard: true });
});

test("a pinch-zoomed page has no frame to follow", () => {
  assert.equal(frameFor({ ...STEP1, vvScale: 1.5 }), null);
  assert.notEqual(frameFor({ ...STEP1, vvScale: 1.005 }), null, "rounding noise isn't a zoom");
});

test("the baseline is the tallest height seen in this orientation", () => {
  const o = "portrait-primary";
  assert.deepEqual(nextBaseline(null, { innerHeight: 695, vvHeight: 695, orientation: o }), BEFORE);
  // the keyboard opening never lowers it, whichever of the two numbers shrinks first
  assert.deepEqual(
    nextBaseline(BEFORE, { innerHeight: 695, vvHeight: 358, orientation: o }),
    BEFORE,
  );
  assert.deepEqual(
    nextBaseline(BEFORE, { innerHeight: 358, vvHeight: 358, orientation: o }),
    BEFORE,
  );
  // the toolbar collapsing raises it
  assert.equal(
    nextBaseline(BEFORE, { innerHeight: 735, vvHeight: 735, orientation: o }).height,
    735,
  );
});

test("turning the phone starts the baseline over", () => {
  const next = nextBaseline(BEFORE, {
    innerHeight: 340,
    vvHeight: 340,
    orientation: "landscape-primary",
  });
  assert.deepEqual(next, { height: 340, orientation: "landscape-primary" });
});
