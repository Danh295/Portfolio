import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// WCAG AA (4.5:1) for body text: --fg and --mid on both backgrounds (--bg, and --soft,
// the hovered-row fill), in both themes. Tokens are read from globals.css.
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const theme = (sel) => {
  const block = css.slice(css.indexOf(sel)).split("}")[0];
  return Object.fromEntries(
    [...block.matchAll(/--(\w+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

for (const [name, sel] of [
  ["dark", ':root[data-theme="dark"]'],
  ["light", ':root[data-theme="light"]'],
]) {
  test(name + " theme text contrast ≥ 4.5:1", () => {
    const t = theme(sel);
    for (const fg of ["fg", "mid"])
      for (const bg of ["bg", "soft"]) {
        const r = ratio(t[fg], t[bg]);
        assert.ok(r >= 4.5, `--${fg} on --${bg}: ${r.toFixed(2)}:1`);
      }
  });
}
