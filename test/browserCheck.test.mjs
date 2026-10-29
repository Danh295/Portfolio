import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// CSS Modules generate the class names (Next 16.4 changed their shape and silently broke a
// `[class*="Intro-module"]` wait), so the browser check selects by data attribute or by a
// class the app sets itself, never by a substring of a generated one.
test("the browser check selects no generated class names", () => {
  const src = readFileSync(new URL("../scripts/browser-check.mjs", import.meta.url), "utf8");
  const hits = src
    .split("\n")
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => /\[\s*class\s*[*^$|~]?=/.test(text));
  assert.deepEqual(
    hits.map(({ line, text }) => `${line}: ${text.trim().slice(0, 100)}`),
    [],
  );
});
