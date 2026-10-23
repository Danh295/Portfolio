import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorDelta, doubleTap, pinchZoom, wheelZoom } from "@/lib/resumePinch";

test("spreading the fingers by a factor zooms by that factor", () => {
  assert.equal(pinchZoom(1, 100, 200), 2);
  assert.equal(pinchZoom(0.5, 100, 300), 1.5);
});

test("pinching in zooms out by the same factor", () => {
  assert.equal(pinchZoom(1, 200, 100), 0.5);
  assert.equal(pinchZoom(2, 120, 60), 1);
});

test("a pinch stays inside the zoom range", () => {
  assert.equal(pinchZoom(2, 100, 300), 3, "never past 300%");
  assert.equal(pinchZoom(0.5, 100, 10), 0.25, "never below 25%");
});

test("fingers that start on the same spot change nothing", () => {
  assert.equal(pinchZoom(1.25, 0, 80), 1.25);
  assert.equal(pinchZoom(1.25, 80, 0), 0.25, "fingers brought together bottom out at the minimum");
});

// The point under the fingers must stay under them. Positions are in screen px: `focal` is
// where the fingers are, `pageBefore` / `pageAfter` the page's top-left corner before and
// after the zoom changed (it moves when a centred page starts to overflow, or scroll differs).
// The result is how far to scroll (right and down are positive) to put the point back.
test("zooming in at a point scrolls so the point stays under the fingers", () => {
  // The point is 80px right and 150px down from the page's corner at zoom 1; at zoom 2 it is
  // 160 and 300 from the (unmoved) corner, so the page must scroll by the 80 and 150 it grew.
  assert.deepEqual(
    anchorDelta({
      zoomFrom: 1,
      zoomTo: 2,
      focal: { x: 100, y: 200 },
      pageBefore: { left: 20, top: 50 },
      pageAfter: { left: 20, top: 50 },
    }),
    { dx: 80, dy: 150 },
  );
});

test("a centred page that starts to overflow has moved: that counts too", () => {
  // Corner 50px in from the left (centred), then flush left at zoom 2: the point's offset
  // (150, 40) doubles to (300, 80) from the new corner (0, 60): at (300, 140) vs the fingers (200, 100).
  assert.deepEqual(
    anchorDelta({
      zoomFrom: 1,
      zoomTo: 2,
      focal: { x: 200, y: 100 },
      pageBefore: { left: 50, top: 60 },
      pageAfter: { left: 0, top: 60 },
    }),
    { dx: 100, dy: 40 },
  );
});

test("zooming out from a scrolled position", () => {
  // Corner at (-100, -200) at zoom 2: the point at (300, 300) is (200, 250) at zoom 1. At zoom 1
  // the corner is (20, 40), so the point lands at (220, 290): 80 left and 10 up of the fingers.
  assert.deepEqual(
    anchorDelta({
      zoomFrom: 2,
      zoomTo: 1,
      focal: { x: 300, y: 300 },
      pageBefore: { left: -100, top: -200 },
      pageAfter: { left: 20, top: 40 },
    }),
    { dx: -80, dy: -10 },
  );
});

test("no zoom change and no movement needs no scroll", () => {
  const page = { left: 12, top: 34 };
  assert.deepEqual(
    anchorDelta({
      zoomFrom: 1.5,
      zoomTo: 1.5,
      focal: { x: 77, y: 88 },
      pageBefore: page,
      pageAfter: page,
    }),
    { dx: 0, dy: 0 },
  );
});

// Double-tap flips between the page fitted to the width and 100%.
test("double-tap from fit goes to 100%, from anywhere else to fit", () => {
  const fit = 0.4363; // a 390px phone
  assert.deepEqual(doubleTap(fit, fit), { zoom: 1, atFit: false });
  assert.deepEqual(doubleTap(1, fit), { zoom: fit, atFit: true });
  assert.deepEqual(doubleTap(1.5, fit), { zoom: fit, atFit: true });
});

test("a zoom that reads as the fit's percentage is at fit", () => {
  assert.deepEqual(doubleTap(0.4366, 0.4363), { zoom: 1, atFit: false });
});

test("when fit already is 100%, a double-tap still does something visible", () => {
  assert.deepEqual(doubleTap(1.0004, 1.0004), { zoom: 2, atFit: false });
  assert.deepEqual(doubleTap(2, 1.0004), { zoom: 1.0004, atFit: true });
});

// Ctrl+wheel: a laptop trackpad pinch arrives as many small deltas, a mouse wheel notch as one
// big one (about 100). Wheel up (negative deltaY) zooms in. e^0.25 = 1.2840, e^0.01 = 1.0100.
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.0005, actual + " is not near " + expected);

test("a wheel or trackpad delta zooms smoothly, up zooms in", () => {
  assert.equal(wheelZoom(1, 0), 1);
  near(wheelZoom(1, -50), 1.284);
  near(wheelZoom(1, 50), 0.7788);
  near(wheelZoom(1, -2), 1.01);
});

test("one big wheel notch is capped, so it isn't an enormous jump", () => {
  near(wheelZoom(1, -500), 1.284);
  near(wheelZoom(1, 100), 0.7788);
});

test("the wheel stays inside the zoom range", () => {
  assert.equal(wheelZoom(3, -50), 3);
  assert.equal(wheelZoom(0.25, 50), 0.25);
});
