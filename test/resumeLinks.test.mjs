import { test } from "node:test";
import assert from "node:assert/strict";
import { linkBoxes } from "@/lib/resumeLinks";

// A US-letter page: 612 × 792 pt, origin at the bottom-left; the screen's is at the top-left.
const LETTER = [0, 0, 612, 792];
const link = (rect, url = "https://github.com/Danh295") => ({ subtype: "Link", rect, url });

test("a link's rectangle becomes a box from the page's top-left, scaled", () => {
  // 100pt wide, 20pt tall, its top edge 72pt below the page top (792 - 720).
  assert.deepEqual(linkBoxes([link([100, 700, 200, 720])], LETTER, 1), [
    { href: "https://github.com/Danh295", left: 100, top: 72, width: 100, height: 20 },
  ]);
  // The same link on a page drawn twice as large.
  assert.deepEqual(linkBoxes([link([100, 700, 200, 720])], LETTER, 2), [
    { href: "https://github.com/Danh295", left: 200, top: 144, width: 200, height: 40 },
  ]);
});

test("a page whose box doesn't start at 0,0 is measured from its own corner", () => {
  const view = [10, 20, 622, 812];
  assert.deepEqual(linkBoxes([link([110, 720, 210, 740])], view, 1), [
    { href: "https://github.com/Danh295", left: 100, top: 72, width: 100, height: 20 },
  ]);
});

test("a rectangle given corner to corner the other way round is the same box", () => {
  assert.deepEqual(
    linkBoxes([link([200, 720, 100, 700])], LETTER, 1),
    linkBoxes([link([100, 700, 200, 720])], LETTER, 1),
  );
});

test("only web and mail links get a box", () => {
  const r = [100, 700, 200, 720];
  const boxes = linkBoxes(
    [
      link(r, "https://example.com/a"),
      link(r, "http://example.com/b"),
      link(r, "mailto:a@example.com"),
      link(r, "javascript:alert(1)"),
      link(r, "data:text/html,hi"),
      link(r, "file:///etc/passwd"),
      link(r, null), // an internal jump has no address
      { subtype: "Widget", rect: r, url: "https://example.com/widget" },
    ],
    LETTER,
    1,
  );
  assert.deepEqual(
    boxes.map((b) => b.href),
    ["https://example.com/a", "http://example.com/b", "mailto:a@example.com"],
  );
});
