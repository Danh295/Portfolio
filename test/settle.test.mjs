import { test } from "node:test";
import assert from "node:assert/strict";
import { settleTarget, settleDuration, DEAD_ZONE } from "@/lib/scrollSettle";

// Short sections that each fit the screen (hi = lo), then a tall one, then the last.
const rests = [
  [0, 0],
  [700, 700],
  [1400, 1900],
  [2600, Infinity],
];
const at = (y, dir) => settleTarget({ y, dir, rests });

test("a rest position stays put", () => {
  assert.equal(at(0, 1), null);
  assert.equal(at(700, -1), null);
  assert.equal(at(700.5, 1), null, "sub-pixel slack");
  assert.equal(at(1650, 1), null, "inside a tall section scrolls freely");
  assert.equal(at(1900, -1), null);
  assert.equal(at(5000, 1), null, "below the last header");
});

test("past a section's end, the next header", () => {
  assert.equal(at(300, 1), 700);
  assert.equal(at(690, 1), 700);
  assert.equal(at(1900 + DEAD_ZONE, 1), 2600, "from a tall section's end");
});

test("back up past a header, the previous section's end", () => {
  assert.equal(at(400, -1), 0);
  assert.equal(at(2400, -1), 1900, "a tall section lands on its end, not its header");
});

test("a nudge inside the dead zone goes back where it came from", () => {
  assert.equal(at(DEAD_ZONE - 1, 1), 0);
  assert.equal(at(700 - (DEAD_ZONE - 1), -1), 700);
  assert.equal(at(1900 + DEAD_ZONE - 1, 1), 1900);
});

test("no direction: the nearer side", () => {
  assert.equal(at(200, 0), 0);
  assert.equal(at(500, 0), 700);
});

test("an empty or inverted gap leaves the page alone", () => {
  assert.equal(
    settleTarget({
      y: 650,
      dir: 1,
      rests: [
        [0, 700],
        [600, Infinity],
      ],
    }),
    null,
  );
});

test("settle duration is short and bounded", () => {
  assert.equal(settleDuration(0), 160);
  assert.equal(settleDuration(100000), 300);
  assert.ok(settleDuration(300) > 160 && settleDuration(300) < 300);
});
