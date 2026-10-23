import { test } from "node:test";
import assert from "node:assert/strict";
import { fitZoom, startZoom, stepZoom, zoomLabel } from "@/lib/resumeView";

test("zoom steps move to the neighbouring step", () => {
  assert.equal(stepZoom(1, +1), 1.25);
  assert.equal(stepZoom(1, -1), 0.75);
});

test("a fit value between steps goes to the next step either way", () => {
  assert.equal(stepZoom(0.43, +1), 0.5);
  assert.equal(stepZoom(0.43, -1), 0.25);
  assert.equal(stepZoom(1.7, +1), 2);
});

test("the ends stay put, and a zoom below the smallest step can still come up", () => {
  assert.equal(stepZoom(3, +1), 3);
  assert.equal(stepZoom(0.25, -1), 0.25);
  assert.equal(stepZoom(0.2, -1), 0.2);
  assert.equal(stepZoom(0.2, +1), 0.25);
});

// The label rounds to a whole percent: a zoom that reads "100%" is on the 100% step, or a
// click would seem to do nothing (it would "step" from 99.96% to 100%).
test("a zoom that reads as a step's percentage is on that step", () => {
  assert.equal(stepZoom(0.9996, +1), 1.25);
  assert.equal(stepZoom(1.0004, -1), 0.75);
  assert.equal(stepZoom(0.5004, +1), 0.75);
});

// A US-letter page is 8.5in = 612pt wide: 816 CSS px at 96 per inch.
const LETTER = 612;

test("fit-to-width makes the page exactly as wide as the room, within the zoom range", () => {
  assert.equal(fitZoom(408, LETTER), 0.5);
  assert.equal(fitZoom(816, LETTER), 1);
  assert.equal(fitZoom(1632, LETTER), 2);
  assert.equal(fitZoom(100, LETTER), 0.25, "never smaller than the smallest step");
  assert.equal(fitZoom(9000, LETTER), 3, "never larger than the largest step");
});

test("the page opens at its printed size, or fitted when the screen is narrower", () => {
  assert.equal(startZoom(1200, LETTER), 1);
  assert.equal(startZoom(816, LETTER), 1);
  assert.ok(Math.abs(startZoom(288, LETTER) - 0.3529) < 0.0001, "a 320px phone: 288 / 816");
});

test("the label is a whole percent", () => {
  assert.equal(zoomLabel(1), "100%");
  assert.equal(zoomLabel(1.25), "125%");
  assert.equal(zoomLabel(0.35294), "35%");
});
