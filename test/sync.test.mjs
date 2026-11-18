import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buckets,
  dayItems,
  driftReport,
  collectPages,
  isFresh,
  mergeRepos,
  mergeSnapshot,
  repoDrift,
  sanitizeSnapshot,
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

// DATA-01: today's day ends after `now`, so counting a day from its end put it in the future
// and buckets() dropped it. It counts at `now` instead, in the newest window.
test("dayItems: today's contributions land in the newest window", () => {
  const now = Date.UTC(2026, 10, 17, 15);
  const days = [
    { date: "2026-11-17", contributionCount: 4 }, // today, still going
    { date: "2026-11-16", contributionCount: 2 },
    { date: "2026-08-30", contributionCount: 7 }, // the oldest window
  ];
  const w = buckets(dayItems(days, now), now);
  assert.equal(w[11], 6, "today and yesterday");
  assert.equal(w[0], 7);
  // the old way: today's end is in the future and drops out
  const old = days.map((d) => [Date.parse(d.date) + 864e5 - 1, d.contributionCount]);
  assert.equal(buckets(old, now)[11], 2);
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
    NOW,
  );
  assert.deepEqual(repos, {
    "a/flaky": { stars: 2 },
    "a/ok": { stars: 4, syncedAt: new Date(NOW).toISOString() },
  });
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
    ignore: { "me/skipped": "coursework" },
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
  assert.deepEqual(d, {
    missing: [],
    renamed: [],
    archived: [],
    gone: [],
    incomplete: false,
    ok: true,
  });
});

test("repoDrift: an ignore entry is a full name, so it never silences another owner's repo", () => {
  const d = drift({
    owned: [{ full_name: "me/Notes" }],
    contributed: [{ full_name: "them/notes" }],
    ignore: { "ME/notes": "scratch" },
  });
  assert.deepEqual(d.missing, ["them/notes"]);
  // a bare name is not an owner/name, so it silences nothing (it could match a stranger's repo)
  const bare = drift({
    owned: [{ full_name: "me/Notes" }],
    contributed: [{ full_name: "them/notes" }],
    ignore: { notes: "scratch" },
  });
  assert.deepEqual(bare.missing, ["me/Notes", "them/notes"]);
});

test("repoDrift: a repo listed as both owned and contributed is reported once", () => {
  const d = drift({
    owned: [{ full_name: "me/dup" }],
    contributed: [{ full_name: "Me/Dup" }],
  });
  assert.deepEqual(d.missing, ["me/dup"]);
});

// Ignoring a repo only keeps it off the site; one the site links is still checked.
test("repoDrift: a linked repo is still reported when it is archived, even if ignored", () => {
  const d = drift({
    linked: ["me/shown"],
    resolved: { "me/shown": { full_name: "me/shown", archived: true } },
    ignore: { "me/shown": "mistake" },
  });
  assert.deepEqual(d.archived, ["me/shown"]);
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
  // an archived link keeps the check red until it is unlinked or unarchived, and says so
  assert.match(lines[2], /unlink it or unarchive it/);
  assert.match(lines[3], /me\/d/);
  assert.deepEqual(driftReport({ missing: [], renamed: [], archived: [], gone: [], ok: true }), []);
});

// DATA-02: repo records and activity each carry their own "verified" time; a run that only
// reached one of them moves only that one, and `attemptedAt` says a run happened at all.
const ISO = (t) => new Date(t).toISOString();
const WEEKS = new Array(12).fill(1);
const repo = (t, extra = {}) => ({
  pushedAt: ISO(t),
  stars: 1,
  language: "JS",
  url: "https://github.com/a/b",
  syncedAt: ISO(t),
  ...extra,
});
const OLD = NOW - 30 * 60 * 60 * 1000; // 30h before
const prevSnap = {
  user: "me",
  attemptedAt: ISO(OLD),
  reposAt: ISO(OLD),
  activityAt: ISO(OLD),
  repos: { "me/a": repo(OLD) },
  activity: { kind: "pushes", weeks: WEEKS },
};
const ok = (value) => ({ status: "fulfilled", value });
const bad = (status) => ({ status: "rejected", reason: Object.assign(new Error("x"), { status }) });
const run = (o) =>
  mergeSnapshot({
    prev: prevSnap,
    user: "me",
    list: ["me/a"],
    results: [bad(500)],
    activity: null,
    now: NOW,
    ...o,
  });

test("mergeSnapshot: repos fetched but activity cached moves only the repos' time", () => {
  const s = run({ results: [ok({ stars: 9 })] });
  assert.equal(s.reposAt, ISO(NOW));
  assert.equal(s.activityAt, ISO(OLD), "activity came from the cache");
  assert.equal(s.attemptedAt, ISO(NOW));
  assert.deepEqual(s.activity, prevSnap.activity);
  assert.equal(s.repos["me/a"].stars, 9);
});

test("mergeSnapshot: activity fetched but every repo failed moves only the activity's time", () => {
  const s = run({ activity: { kind: "contributions", weeks: new Array(12).fill(2) } });
  assert.equal(s.activityAt, ISO(NOW));
  assert.equal(s.reposAt, ISO(OLD), "the kept record is as old as it was");
  assert.equal(s.repos["me/a"].syncedAt, ISO(OLD));
  assert.equal(s.activity.kind, "contributions");
});

test("mergeSnapshot: total failure keeps every verified time and records the attempt", () => {
  const s = run({});
  assert.equal(s.reposAt, ISO(OLD));
  assert.equal(s.activityAt, ISO(OLD));
  assert.equal(s.attemptedAt, ISO(NOW));
  assert.deepEqual(s.repos, prevSnap.repos);
  assert.deepEqual(s.activity, prevSnap.activity);
});

test("mergeSnapshot: mixed repos: the stamp is the oldest record, not the newest", () => {
  const prev = { ...prevSnap, repos: { "me/a": repo(OLD), "me/b": repo(OLD) } };
  const s = run({ prev, list: ["me/a", "me/b"], results: [ok({ stars: 2 }), bad(403)] });
  assert.equal(s.repos["me/a"].syncedAt, ISO(NOW));
  assert.equal(s.repos["me/b"].syncedAt, ISO(OLD));
  assert.equal(s.reposAt, ISO(OLD), "one repo is still the old one");
});

test("mergeSnapshot: no previous snapshot and nothing fetched is empty, never invented", () => {
  const s = run({ prev: null });
  assert.deepEqual(s.repos, {});
  assert.equal(s.reposAt, null);
  assert.equal(s.activityAt, null);
  assert.equal(s.activity, null);
  assert.equal(s.attemptedAt, ISO(NOW));
});

test("mergeSnapshot: a repo that left the project list leaves the snapshot", () => {
  const s = run({ list: [], results: [] });
  assert.deepEqual(s.repos, {});
  assert.equal(s.reposAt, null);
});

test("sanitizeSnapshot: a good snapshot passes through", () => {
  assert.deepEqual(sanitizeSnapshot(prevSnap, "me"), prevSnap);
});

test("sanitizeSnapshot: malformed caches are dropped, not trusted", () => {
  for (const bad of [null, undefined, 3, "x", [], { repos: [] }, { user: "other", repos: {} }])
    assert.equal(sanitizeSnapshot(bad, "me"), null, JSON.stringify(bad));
});

test("sanitizeSnapshot: bad records, activity and times are dropped one by one", () => {
  const s = sanitizeSnapshot(
    {
      user: "me",
      attemptedAt: "yesterday-ish",
      reposAt: ISO(OLD),
      activityAt: 5,
      repos: {
        "me/good": repo(OLD),
        "me/nostars": { url: "https://github.com/me/x" },
        "me/null": null,
        "me/str": "x",
      },
      activity: { kind: "pushes", weeks: [1, 2, 3] },
    },
    "me",
  );
  assert.deepEqual(Object.keys(s.repos), ["me/good"]);
  assert.equal(s.activity, null, "12 weeks of finite counts or nothing");
  assert.equal(s.attemptedAt, null);
  assert.equal(s.activityAt, null);
  assert.equal(s.reposAt, ISO(OLD));
  for (const weeks of [new Array(12).fill(-1), new Array(12).fill("1"), new Array(12).fill(NaN)])
    assert.equal(
      sanitizeSnapshot({ user: "me", repos: {}, activity: { kind: "pushes", weeks } }, "me")
        .activity,
      null,
    );
  assert.equal(
    sanitizeSnapshot({ user: "me", repos: {}, activity: { kind: "stars", weeks: WEEKS } }, "me")
      .activity,
    null,
  );
});

test("sanitizeSnapshot: an old snapshot with only syncedAt has no verified times", () => {
  const s = sanitizeSnapshot({ syncedAt: ISO(NOW), user: "me", repos: {}, activity: null }, "me");
  assert.equal(s.reposAt, null);
  assert.equal(s.activityAt, null);
});

test("isFresh: skips only when what is shown was verified recently", () => {
  const HOUR = 60 * 60 * 1000;
  const snap = (rAgo, aAgo, tried) => ({
    reposAt: ISO(NOW - rAgo),
    activityAt: ISO(NOW - aAgo),
    attemptedAt: ISO(NOW - tried),
  });
  assert.equal(isFresh(snap(1 * HOUR, 2 * HOUR, 2 * HOUR), NOW), true);
  assert.equal(isFresh(snap(7 * HOUR, 1 * HOUR, 7 * HOUR), NOW), false, "repos are old");
  assert.equal(isFresh(snap(1 * HOUR, 7 * HOUR, 7 * HOUR), NOW), false, "activity is old");
  // a run just tried and failed: don't hammer the API on every dev start
  assert.equal(isFresh(snap(7 * HOUR, 7 * HOUR, 60 * 1000), NOW), true);
  assert.equal(isFresh({ ...snap(1, 1, 7 * HOUR), reposAt: null }, NOW), false);
  assert.equal(isFresh(null, NOW), false);
  // a stamp from the future is not fresh
  assert.equal(isFresh(snap(-HOUR, -HOUR, -HOUR), NOW), false);
});

// DATA-04: a paged list is only complete when the last page said so.
const pager = (pages) => async (cursor) => {
  const i = cursor == null ? 0 : Number(cursor);
  return pages[i];
};

test("collectPages: follows endCursor until hasNextPage is false", async () => {
  const r = await collectPages(
    pager([
      { nodes: [1, 2], hasNextPage: true, endCursor: "1" },
      { nodes: [3], hasNextPage: false, endCursor: "x" },
    ]),
  );
  assert.deepEqual(r, { nodes: [1, 2, 3], complete: true });
});

test("collectPages: a single page is complete", async () => {
  assert.deepEqual(await collectPages(pager([{ nodes: [1], hasNextPage: false }])), {
    nodes: [1],
    complete: true,
  });
});

test("collectPages: stops at the page limit and says it is incomplete", async () => {
  const r = await collectPages(async () => ({ nodes: [1], hasNextPage: true, endCursor: "c" }), 3);
  assert.deepEqual(r, { nodes: [1, 1, 1], complete: false });
});

test("collectPages: a next page with no cursor is incomplete, not an endless loop", async () => {
  const r = await collectPages(pager([{ nodes: [1], hasNextPage: true, endCursor: null }]));
  assert.deepEqual(r, { nodes: [1], complete: false });
});

test("repoDrift: an incomplete scan is not ok even with nothing else to report", () => {
  const d = drift({ linked: ["me/a"], owned: [{ full_name: "me/a" }], complete: false });
  assert.equal(d.incomplete, true);
  assert.equal(d.ok, false);
  assert.ok(driftReport(d).some((l) => l.startsWith("incomplete")));
  assert.equal(drift({ owned: [] }).incomplete, false);
  assert.equal(drift({ owned: [] }).ok, true);
});
