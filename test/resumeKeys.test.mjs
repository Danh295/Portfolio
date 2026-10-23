import { test } from "node:test";
import assert from "node:assert/strict";
import { resumeKey } from "@/lib/resumeKeys";

// Facts about a keydown, as the viewer reads them: the key, whether a modifier or a held key
// is involved, and whether single-character shortcuts are on.
const press = (key, extra = {}) => ({
  key,
  ctrl: false,
  meta: false,
  alt: false,
  repeat: false,
  keysOn: true,
  ...extra,
});

test("each shortcut means one action", () => {
  assert.equal(resumeKey(press("+")), "zoomIn");
  assert.equal(resumeKey(press("=")), "zoomIn", "+ is unshifted = on most keyboards");
  assert.equal(resumeKey(press("-")), "zoomOut");
  assert.equal(resumeKey(press("0")), "fit");
  assert.equal(resumeKey(press("d")), "download");
  assert.equal(resumeKey(press("p")), "print");
  assert.equal(resumeKey(press("D")), "download", "caps lock doesn't matter");
  assert.equal(resumeKey(press("x")), null);
  assert.equal(resumeKey(press("Enter")), null);
});

// Cmd/Ctrl/Alt combinations belong to the browser: Cmd+P prints the page itself, Ctrl+- zooms
// the page, Alt+D focuses the address bar.
test("a key with Cmd, Ctrl or Alt is left to the browser", () => {
  for (const mod of ["ctrl", "meta", "alt"])
    for (const key of ["+", "-", "0", "d", "p"])
      assert.equal(resumeKey(press(key, { [mod]: true })), null, mod + "+" + key);
});

// WCAG 2.1.4: the visitor can turn single-character shortcuts off (the app's `set keys off`).
test("with shortcuts off, no key does anything", () => {
  for (const key of ["+", "-", "0", "d", "p"])
    assert.equal(resumeKey(press(key, { keysOn: false })), null, key);
});

// Holding + or - keeps zooming; holding d or p must not download or print again and again.
test("a held key repeats zoom but not download or print", () => {
  assert.equal(resumeKey(press("+", { repeat: true })), "zoomIn");
  assert.equal(resumeKey(press("-", { repeat: true })), "zoomOut");
  assert.equal(resumeKey(press("d", { repeat: true })), null);
  assert.equal(resumeKey(press("p", { repeat: true })), null);
});

// Autofill and some input methods dispatch keydown events with no `key` at all.
test("a keydown without a key is ignored, not an error", () => {
  assert.equal(resumeKey(press(undefined)), null);
  assert.equal(resumeKey(press("Dead")), null);
});
