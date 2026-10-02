import { test } from "node:test";
import assert from "node:assert/strict";
import { openBuffer, vimKey } from "@/lib/vim";

const keys = (lines, seq) => {
  let s = openBuffer("a.txt", lines);
  for (const k of seq) s = vimKey(s, k).state;
  return s;
};

test("motions: w, e, b, 0, $, G, gg", () => {
  assert.equal(keys(["one two three"], ["w"]).c, 4);
  assert.equal(keys(["one two three"], ["w", "w"]).c, 8);
  assert.equal(keys(["one two three"], ["$"]).c, 12);
  assert.equal(keys(["one two three"], ["$", "0"]).c, 0);
  assert.equal(keys(["a", "b", "c"], ["G"]).r, 2);
  assert.equal(keys(["a", "b", "c"], ["G", "g", "g"]).r, 0);
  assert.equal(keys(["a", "b", "c"], ["2", "G"]).r, 1);
});

test("dd, yy/p, u, ctrl-r", () => {
  const d = keys(["a", "b", "c"], ["j", "d", "d"]);
  assert.deepEqual(d.lines, ["a", "c"]);
  assert.deepEqual(keys(["a", "b"], ["y", "y", "p"]).lines, ["a", "a", "b"]);
  const u = keys(["a", "b", "c"], ["d", "d", "u"]);
  assert.deepEqual(u.lines, ["a", "b", "c"]);
  let s = openBuffer("a.txt", ["a", "b"]);
  for (const k of ["d", "d", "u"]) s = vimKey(s, k).state;
  s = vimKey(s, "r", true).state;
  assert.deepEqual(s.lines, ["b"]);
});

test("x/X at the edges and on an empty line", () => {
  assert.deepEqual(keys([""], ["x"]).lines, [""]);
  assert.deepEqual(keys(["ab"], ["X"]).lines, ["ab"]);
  assert.deepEqual(keys(["ab"], ["$", "x"]).lines, ["a"]);
});

test("counts are capped (no giant buffers, no freeze)", () => {
  const t0 = Date.now();
  const s = keys(["x"], ["y", "y", ..."99999999999", "p"]);
  assert.ok(s.lines.length <= 1000, String(s.lines.length));
  keys(["a b c"], [..."999999999", "w"]);
  assert.ok(Date.now() - t0 < 1000);
});

test("Vp over the whole buffer leaves no stray line", () => {
  assert.deepEqual(keys(["a", "b"], ["y", "y", "j", "V", "g", "g", "p"]).lines, ["a"]);
  assert.deepEqual(keys(["a", "b", "c"], ["y", "y", "j", "V", "p"]).lines, ["a", "a", "c"]);
  assert.deepEqual(keys(["a", "b", "c"], ["y", "y", "G", "V", "p"]).lines, ["a", "b", "a"]);
});

test(":q is refused after an edit, :q! quits", () => {
  const s = keys(["a"], ["d", "d", ":", "q", "Enter"]);
  assert.match(s.msg, /E37/);
  let t = openBuffer("a.txt", ["a"]);
  for (const k of ["d", "d", ":", "q", "!"]) t = vimKey(t, k).state;
  assert.equal(vimKey(t, "Enter").quit, true);
});
