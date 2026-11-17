import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapTab } from "@/lib/focusWrap";

test("Tab on the last control wraps to the first; elsewhere it is the browser's", () => {
  assert.equal(wrapTab({ at: 2, count: 3, shift: false }), 0);
  assert.equal(wrapTab({ at: 0, count: 3, shift: false }), null);
  assert.equal(wrapTab({ at: 1, count: 3, shift: false }), null);
  assert.equal(wrapTab({ at: -1, count: 3, shift: false }), null, "from the box: the first");
  assert.equal(wrapTab({ at: 0, count: 1, shift: false }), 0, "a single control stays");
});

test("Shift+Tab on the first control or the box wraps to the last", () => {
  assert.equal(wrapTab({ at: 0, count: 3, shift: true }), 2);
  assert.equal(wrapTab({ at: -1, count: 3, shift: true }), 2);
  assert.equal(wrapTab({ at: 1, count: 3, shift: true }), null);
  assert.equal(wrapTab({ at: 2, count: 3, shift: true }), null);
});

test("a dialog with nothing to tab to keeps focus where it is", () => {
  assert.equal(wrapTab({ at: -1, count: 0, shift: false }), -1);
  assert.equal(wrapTab({ at: -1, count: 0, shift: true }), -1);
});
