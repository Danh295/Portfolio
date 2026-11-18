// Build-time GitHub snapshot, so visitors never call the GitHub API (no rate limits,
// fully static pages). Runs before `next build` and `next dev` (package.json).
//
// Writes src/data/github.generated.json (gitignored), atomically (a temp file, then a rename):
//   { user, attemptedAt, reposAt, activityAt,
//     repos: { "owner/name": { pushedAt, stars, language, url, syncedAt } },
//     activity: { kind: "contributions" | "pushes", weeks: [12 numbers] } | null }
// `attemptedAt` is the last run, whatever came of it. `reposAt` (the oldest repo record's
// `syncedAt`) and `activityAt` are when each was last really fetched; a record kept from the
// cache keeps its old time, so the UI and `--if-stale` only call fetched data "synced".
//
// - Repos are the GitHub links in src/data/projects.js, read as data (src/lib/githubUrl.mjs).
// - Activity uses the GraphQL contribution calendar when GITHUB_TOKEN is set (CI), and
//   falls back to counting public PushEvents otherwise. Both are bucketed the same way:
//   12 rolling 7-day windows ending now (oldest first), so no bar is a partial week.
// - In CI the Pages workflow restores the previous snapshot from the actions cache first,
//   so "keep the previous snapshot" works there too. A cached file is checked before it is
//   reused (sanitizeSnapshot): what isn't valid is dropped.
// - Never fails the build: on errors the previous snapshot is kept (or an empty one
//   written), and the UI hides whatever is missing. Never fakes data. A repo GitHub says
//   is gone (404) is dropped instead of kept forever.
//
// Usage: node scripts/sync-github.mjs [--if-stale]   (--if-stale: skip if < 6h old)

import { readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { buckets, dayItems, isFresh, mergeSnapshot, sanitizeSnapshot } from "./github-snapshot.mjs";
import { linkedRepos } from "../src/lib/githubUrl.mjs";
import { loadProjects } from "./load-projects.mjs";

const USER = "Danh295";
const OUT = new URL("../src/data/github.generated.json", import.meta.url);
const TMP = new URL("../src/data/github.generated.json.tmp", import.meta.url);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "danh295-portfolio-sync",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

// The cached snapshot if it is a usable one, else null (missing, unreadable, malformed).
const readSnapshot = () => {
  try {
    return sanitizeSnapshot(JSON.parse(readFileSync(OUT, "utf8")), USER);
  } catch {
    return null;
  }
};

// Write beside the file, then rename over it: a crash leaves the old snapshot, never half of one.
const write = (snap) => {
  try {
    writeFileSync(TMP, JSON.stringify(snap, null, 2) + "\n");
    renameSync(TMP, OUT);
  } catch (e) {
    try {
      unlinkSync(TMP);
    } catch {
      // nothing to remove
    }
    throw e;
  }
};

async function api(path, init = {}) {
  const r = await fetch("https://api.github.com" + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw Object.assign(new Error(`${path}: ${r.status}`), { status: r.status });
  return r.json();
}

async function repoInfo(full) {
  const r = await api(`/repos/${full}`);
  return {
    pushedAt: r.pushed_at,
    stars: r.stargazers_count,
    language: r.language,
    url: r.html_url,
  };
}

// Contribution calendar for just the last 12 weeks (plus a day for the time zone edge).
async function contributions() {
  const now = Date.now(),
    from = new Date(now - 12 * WEEK_MS - 864e5).toISOString(),
    to = new Date(now).toISOString();
  const q = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const r = await api("/graphql", {
    method: "POST",
    body: JSON.stringify({ query: q, variables: { login: USER, from, to } }),
  });
  if (r.errors?.length) throw new Error("graphql: " + r.errors[0].message);
  const days = r.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
    (w) => w.contributionDays,
  );
  // A day counts from its end, capped at now, so today's contributions land in the newest
  // window (today's end is still in the future, which buckets() would drop).
  return buckets(dayItems(days, now), now);
}

// Public push events (no token): up to 3 pages of 100, the API's limit.
async function pushes() {
  const items = [];
  for (let page = 1; page <= 3; page++) {
    const events = await api(`/users/${USER}/events/public?per_page=100&page=${page}`);
    for (const e of events) if (e.type === "PushEvent") items.push([Date.parse(e.created_at), 1]);
    if (events.length < 100) break;
  }
  return buckets(items);
}

async function main() {
  const prev = readSnapshot();
  if (process.argv.includes("--if-stale") && isFresh(prev)) {
    console.log("github sync: snapshot is fresh, skipping");
    return;
  }

  const list = linkedRepos(await loadProjects());
  const results = await Promise.allSettled(list.map(repoInfo));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn("github sync: " + list[i] + ": " + r.reason.message);
  });

  let activity = null;
  try {
    activity = token
      ? { kind: "contributions", weeks: await contributions() }
      : { kind: "pushes", weeks: await pushes() };
  } catch (e) {
    console.warn("github sync: activity: " + e.message);
    if (token) {
      try {
        activity = { kind: "pushes", weeks: await pushes() };
      } catch {
        // fall through to the previous snapshot's activity
      }
    }
  }

  const snap = mergeSnapshot({ prev, user: USER, list, results, activity });
  write(snap);
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(
    `github sync: ${Object.keys(snap.repos).length} repos, activity ` +
      (activity
        ? activity.kind + " (fetched)"
        : snap.activity
          ? snap.activity.kind + " (kept)"
          : "none") +
      (failed ? `, ${failed} failed (kept previous unless gone)` : ""),
  );
}

main().catch((e) => {
  console.warn("github sync failed: " + e.message);
  // The build imports this file: it must exist and parse, even if empty.
  if (!readSnapshot())
    write({
      user: USER,
      attemptedAt: null,
      reposAt: null,
      activityAt: null,
      repos: {},
      activity: null,
    });
});
