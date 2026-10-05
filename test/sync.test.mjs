import { test } from "node:test";
import assert from "node:assert/strict";
import { buckets, mergeRepos, reposIn } from "../scripts/github-snapshot.mjs";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5);

test("buckets: 12 rolling weeks ending now, oldest first", () => {
  const w = buckets(
    [
      [NOW - 1000, 2], // this week
      [NOW - WEEK - 1000, 1], // last week
      [NOW - 11 * WEEK - 1000, 5], // the oldest window
      [NOW - 12 * WEEK - 1000, 9], // too old
      [NOW + 1000, 9], // the future
    ],
    NOW,
  );
  assert.deepEqual(w, [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2]);
});

test("reposIn finds every linked GitHub repo once", () => {
  const src = `
    { github: "https://github.com/Danh295/Portfolio" },
    { links: ["https://github.com/someone/thing.git#readme", "https://github.com/Danh295/Portfolio/"] },
    { repo: repoUrl("recall") },`;
  assert.deepEqual(reposIn(src, "Danh295").sort(), [
    "Danh295/Portfolio",
    "Danh295/recall",
    "someone/thing",
  ]);
});

// A repo that's gone (404: deleted, or private) drops out; any other failure (rate limit,
// network) keeps the previous snapshot's entry. A fetched one always replaces it.
test("mergeRepos drops a repo GitHub says is gone and keeps others on errors", () => {
  const prev = { "a/gone": { stars: 1 }, "a/flaky": { stars: 2 }, "a/ok": { stars: 3 } };
  const gone = Object.assign(new Error("404"), { status: 404 });
  const limited = Object.assign(new Error("403"), { status: 403 });
  const { repos, failed } = mergeRepos(
    ["a/gone", "a/flaky", "a/ok", "a/new"],
    [
      { status: "rejected", reason: gone },
      { status: "rejected", reason: limited },
      { status: "fulfilled", value: { stars: 4 } },
      { status: "rejected", reason: new Error("timeout") },
    ],
    prev,
  );
  assert.deepEqual(repos, { "a/flaky": { stars: 2 }, "a/ok": { stars: 4 } });
  assert.equal(failed, 3);
});
