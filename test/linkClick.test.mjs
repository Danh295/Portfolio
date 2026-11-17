import { test } from "node:test";
import assert from "node:assert/strict";
import { inApp, isPlainClick } from "@/lib/linkClick";

const click = (over = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  prevented: false,
  preventDefault() {
    this.prevented = true;
  },
  ...over,
});

test("a plain left click (or Enter on a link, which fires one) is the app's", () => {
  assert.equal(isPlainClick(click()), true);
  let went = 0;
  const e = click();
  inApp(() => went++)(e);
  assert.equal(went, 1);
  assert.equal(e.prevented, true, "the browser does not navigate");
});

test("modified clicks and other buttons stay the browser's", () => {
  for (const over of [
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { button: 2 },
    { defaultPrevented: true },
  ]) {
    let went = 0;
    const e = click(over);
    inApp(() => went++)(e);
    assert.equal(went, 0, JSON.stringify(over));
    assert.equal(e.prevented, false, JSON.stringify(over));
  }
});
