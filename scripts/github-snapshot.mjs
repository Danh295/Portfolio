// The pure parts of sync-github.mjs and check-repos.mjs (no network, no files), so they can be
// tested. Which repos a project links is src/lib/githubUrl.mjs.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 12 rolling 7-day windows ending `now`, oldest first. `items` are [time ms, count]. */
export function buckets(items, now = Date.now()) {
  const w = new Array(12).fill(0);
  for (const [t, n] of items) {
    const i = Math.floor((now - t) / WEEK_MS);
    if (i >= 0 && i < 12) w[11 - i] += n;
  }
  return w;
}

/**
 * The [time, count] items for `buckets` from a contribution calendar's days (`date` is a
 * UTC day, "2026-11-17"). A day counts from its end, but never later than `now`: today's
 * end is still ahead, and an item in the future falls out of every window, which dropped
 * today's contributions from the newest one.
 */
export function dayItems(days, now = Date.now()) {
  return days.map((d) => [Math.min(Date.parse(d.date) + 864e5 - 1, now), d.contributionCount]);
}

/**
 * The new `repos` map from one fetch per repo in `list` (Promise.allSettled results, in
 * order). A fetched repo gets `syncedAt: now`. A repo GitHub answers 404 for (deleted, renamed
 * away, private) drops out; any other failure (rate limit, network) keeps its entry, and its
 * old `syncedAt`, from the previous snapshot.
 */
export function mergeRepos(list, results, prev = {}, now = Date.now()) {
  const repos = {};
  let failed = 0;
  results.forEach((r, i) => {
    const full = list[i];
    if (r.status === "fulfilled") {
      repos[full] = { ...r.value, syncedAt: new Date(now).toISOString() };
      return;
    }
    failed++;
    if (r.reason?.status !== 404 && prev?.[full]) repos[full] = prev[full];
  });
  return { repos, failed };
}

const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isTime = (x) => typeof x === "string" && Number.isFinite(Date.parse(x));
const timeOr = (x) => (isTime(x) ? x : null);
const goodRepo = (r) =>
  isObj(r) &&
  typeof r.url === "string" &&
  Number.isFinite(r.stars) &&
  (r.pushedAt == null || isTime(r.pushedAt));
const goodActivity = (a) =>
  isObj(a) &&
  (a.kind === "contributions" || a.kind === "pushes") &&
  Array.isArray(a.weeks) &&
  a.weeks.length === 12 &&
  a.weeks.every((n) => Number.isFinite(n) && n >= 0);

/** The oldest `syncedAt` among the records: everything shown is at least this fresh. */
const oldest = (repos) => {
  const ts = Object.values(repos).map((r) => Date.parse(r.syncedAt));
  return ts.length && ts.every(Number.isFinite) ? new Date(Math.min(...ts)).toISOString() : null;
};

/**
 * A cached snapshot (read from a file or the actions cache) made safe to reuse, or null when it
 * isn't one: not an object, another user's, or without a `repos` map. Inside, a bad repo record,
 * a bad activity (not 12 finite counts) or a bad time is dropped on its own, so a half-broken
 * cache still keeps what is good. `reposAt` is recomputed from the records, never taken from the
 * file. An old snapshot with one `syncedAt` has no verified times.
 */
export function sanitizeSnapshot(raw, user) {
  if (!isObj(raw) || raw.user !== user || !isObj(raw.repos)) return null;
  const repos = {};
  for (const [k, r] of Object.entries(raw.repos))
    if (goodRepo(r)) repos[k] = { ...r, syncedAt: timeOr(r.syncedAt) };
  return {
    user,
    attemptedAt: timeOr(raw.attemptedAt),
    reposAt: oldest(repos), // derived from the records, never trusted from the file
    activityAt: timeOr(raw.activityAt),
    repos,
    activity: goodActivity(raw.activity) ? raw.activity : null,
  };
}

/**
 * The snapshot to write after a run. `results` are the repo fetches for `list`; `activity` is
 * what was fetched just now ({ kind, weeks }) or null when it failed, in which case the cached
 * one stays. Verified times only move for what was really fetched: `reposAt` is the oldest
 * record (a kept one drags it back), `activityAt` the activity's own fetch; `attemptedAt` is
 * this run, whatever came of it. `prev` must already be sanitized (or null).
 */
export function mergeSnapshot({ prev, user, list, results, activity, now = Date.now() }) {
  const { repos } = mergeRepos(list, results, prev?.repos, now);
  const at = new Date(now).toISOString();
  return {
    user,
    attemptedAt: at,
    reposAt: oldest(repos),
    activityAt: activity ? at : (prev?.activityAt ?? null),
    repos,
    activity: activity ?? prev?.activity ?? null,
  };
}

const STALE_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;

/**
 * Whether `--if-stale` can skip the sync: both the repos and the activity were verified within
 * 6 hours, or a run tried within 15 minutes (so a dead network doesn't make every dev start
 * wait out the timeouts again). A time in the future never counts.
 */
export function isFresh(snap, now = Date.now()) {
  const within = (iso, ms) => {
    const age = now - Date.parse(iso);
    return Number.isFinite(age) && age >= 0 && age < ms;
  };
  if (!snap) return false;
  if (within(snap.attemptedAt, RETRY_MS)) return true;
  return within(snap.reposAt, STALE_MS) && within(snap.activityAt, STALE_MS);
}

/**
 * Every page of a GraphQL connection. `fetchPage(cursor)` returns { nodes, hasNextPage,
 * endCursor }. `complete` is true only when the last page said there was no next one; stopping
 * at `maxPages`, or a next page with no cursor to follow, leaves it false.
 */
export async function collectPages(fetchPage, maxPages = 10) {
  const nodes = [];
  let cursor = null;
  for (let n = 0; n < maxPages; n++) {
    const page = await fetchPage(cursor);
    nodes.push(...page.nodes);
    if (!page.hasNextPage) return { nodes, complete: true };
    if (!page.endCursor) break;
    cursor = page.endCursor;
  }
  return { nodes, complete: false };
}

const lower = (s) => s.toLowerCase();

/**
 * What the repo check reports. `owned` (the user's public repos) and `contributed` (public
 * repos the user contributed to but doesn't own) are GitHub's lists of { full_name, fork? },
 * `linked` the "owner/name" repos projects.js links, `resolved` GitHub's answer for each
 * linked repo ({ full_name, archived? } or { gone: true } for a 404), and `ignore` a
 * { "owner/name": reason } map of repos chosen to stay off the site (any case; a bare name
 * matches nothing, since it could be a stranger's repo). A renamed repo counts as linked under
 * its new name. Ignoring only filters `missing`: a repo the site links is still checked.
 * `complete: false` (a list GitHub paged past what was read) is never ok: a scan that missed
 * part of a list can't say nothing is missing.
 */
export function repoDrift({
  linked = [],
  owned = [],
  contributed = [],
  resolved = {},
  ignore = {},
  complete = true,
}) {
  const shown = new Set(linked.map(lower));
  const renamed = [],
    archived = [],
    gone = [];
  for (const from of linked) {
    const r = resolved[from];
    if (!r) continue;
    if (r.gone) {
      gone.push(from);
      continue;
    }
    if (lower(r.full_name) !== lower(from)) {
      renamed.push({ from, to: r.full_name });
      shown.add(lower(r.full_name));
    }
    if (r.archived) archived.push(from);
  }
  const skipped = new Set(Object.keys(ignore).map(lower));
  // One entry per repo whatever its case, in the order GitHub listed them (first spelling wins).
  const unlinked = new Map();
  for (const { full_name, fork } of [...owned, ...contributed]) {
    const key = lower(full_name);
    if (!fork && !shown.has(key) && !skipped.has(key) && !unlinked.has(key))
      unlinked.set(key, full_name);
  }
  const missing = [...unlinked.values()];
  const incomplete = !complete;
  const ok = !missing.length && !renamed.length && !archived.length && !gone.length && complete;
  return { missing, renamed, archived, gone, incomplete, ok };
}

/** The lines the repo check prints for a `repoDrift` result: one per kind, saying what to do. */
export function driftReport(d) {
  const lines = [];
  if (d.missing.length)
    lines.push(
      `not on the site: ${d.missing.join(", ")} (add a project in src/data/projects.js, or add ` +
        `it to "ignore" in scripts/repo-check.json as owner/name with a reason)`,
    );
  for (const r of d.renamed)
    lines.push(`renamed: ${r.from} is now ${r.to} (update its link in src/data/projects.js)`);
  if (d.archived.length)
    lines.push(
      `archived: ${d.archived.join(", ")} (read-only now; the check stays red until you unlink it or unarchive it)`,
    );
  if (d.gone.length)
    lines.push(`gone (404: deleted or made private): ${d.gone.join(", ")} (remove its link)`);
  if (d.incomplete)
    lines.push(
      "incomplete: not every page of the contributed repos was read, so a repo may be missing " +
        "from this check (raise the page limit in scripts/check-repos.mjs)",
    );
  return lines;
}
