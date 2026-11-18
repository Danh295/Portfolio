import { test } from "node:test";
import assert from "node:assert/strict";
import { isDark, themeKeyChanged } from "@/lib/themePref";

test("a saved choice beats the OS, either way round", () => {
  assert.equal(isDark("dark", true), true);
  assert.equal(isDark("light", false), false);
});

test("nothing saved (or junk) follows the OS", () => {
  for (const saved of [null, undefined, "", "blue"]) {
    assert.equal(isDark(saved, true), false, "OS light");
    assert.equal(isDark(saved, false), true, "OS dark");
  }
});

test("storage events: the theme's key, or a clear, change it; other keys don't", () => {
  assert.equal(themeKeyChanged("danny-theme", "danny-theme"), true);
  assert.equal(themeKeyChanged(null, "danny-theme"), true);
  assert.equal(themeKeyChanged("danny-keys", "danny-theme"), false);
});
