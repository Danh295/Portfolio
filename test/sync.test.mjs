import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buckets,
  driftReport,
  mergeRepos,
  repoDrift,
  reposIn,
} from "../scripts/github-snapshot.mjs";

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

// repoDrift: what the repo check reports. `owned` and `contributed` are what GitHub lists for
// the user, `linked` the repos projects.js links, `resolved` what GitHub answers for each linked
// repo, and `ignore` the repos chosen to stay off the site.
const drift = (o) =>
  repoDrift({ linked: [], owned: [], contributed: [], resolved: {}, ignore: {}, ...o });

test("repoDrift: a public repo that is not linked is missing, unless a fork or ignored", () => {
  const d = drift({
    linked: ["me/shown"],
    owned: [
      { full_name: "me/shown" },
      { full_name: "me/new" },
      { full_name: "me/forked", fork: true },
      { full_name: "me/skipped" },
    ],
    contributed: [{ full_name: "them/team-project" }],
    ignore: { skipped: "coursework" },
  });
  assert.deepEqual(d.missing, ["me/new", "them/team-project"]);
  assert.equal(d.ok, false);
});

test("repoDrift: a linked repo that was renamed, archived or deleted is reported", () => {
  const d = drift({
    linked: ["me/old-name", "me/Same", "me/frozen", "me/deleted", "me/fine"],
    owned: [{ full_name: "me/new-name" }, { full_name: "me/same" }, { full_name: "me/frozen" }],
    resolved: {
      "me/old-name": { full_name: "me/new-name" },
      "me/Same": { full_name: "me/same" }, // a case-only change is not a rename
      "me/frozen": { full_name: "me/frozen", archived: true },
      "me/deleted": { gone: true },
      "me/fine": { full_name: "me/fine" },
    },
  });
  assert.deepEqual(d.renamed, [{ from: "me/old-name", to: "me/new-name" }]);
  assert.deepEqual(d.archived, ["me/frozen"]);
  assert.deepEqual(d.gone, ["me/deleted"]);
  // the renamed repo counts as shown under its new name, so it isn't also "missing"
  assert.deepEqual(d.missing, []);
  assert.equal(d.ok, false);
});

test("repoDrift: nothing to report when every repo is linked and current", () => {
  const d = drift({
    linked: ["me/a"],
    owned: [{ full_name: "me/a" }],
    resolved: { "me/a": { full_name: "me/a" } },
  });
  assert.deepEqual(d, { missing: [], renamed: [], archived: [], gone: [], ok: true });
});

test("driftReport: one line per kind of drift, each saying what to do", () => {
  const lines = driftReport({
    missing: ["me/new", "them/team"],
    renamed: [{ from: "me/a", to: "me/b" }],
    archived: ["me/c"],
    gone: ["me/d"],
    ok: false,
  });
  assert.equal(lines.length, 4);
  assert.match(lines[0], /me\/new, them\/team/);
  assert.match(lines[0], /ignore/);
  assert.match(lines[1], /me\/a .*me\/b/);
  assert.match(lines[2], /me\/c/);
  assert.match(lines[3], /me\/d/);
  assert.deepEqual(driftReport({ missing: [], renamed: [], archived: [], gone: [], ok: true }), []);
});
