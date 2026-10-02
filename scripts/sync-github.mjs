// Build-time GitHub snapshot, so visitors never call the GitHub API (no rate limits,
// fully static pages). Runs before `next build` and `next dev` (package.json).
//
// Writes src/data/github.generated.json (gitignored):
//   { syncedAt, user, repos: { "owner/name": { pushedAt, stars, language, url } },
//     activity: { kind: "contributions" | "pushes", weeks: [12 numbers] } | null }
//
// - Repos are the GitHub links found in src/data/projects.js.
// - Activity uses the GraphQL contribution calendar when GITHUB_TOKEN is set (CI), and
//   falls back to counting public PushEvents otherwise. Both are bucketed the same way:
//   12 rolling 7-day windows ending now (oldest first), so no bar is a partial week.
// - In CI the Pages workflow restores the previous snapshot from the actions cache first,
//   so "keep the previous snapshot" works there too.
// - Never fails the build: on errors the previous snapshot is kept (or an empty one
//   written), and the UI hides whatever is missing. Never fakes data.
//
// Usage: node scripts/sync-github.mjs [--if-stale]   (--if-stale: skip if < 6h old)

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const USER = "Danh295";
const OUT = new URL("../src/data/github.generated.json", import.meta.url);
const PROJECTS = new URL("../src/data/projects.js", import.meta.url);
const STALE_MS = 6 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "danh295-portfolio-sync",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const readSnapshot = () => {
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return null;
  }
};

const write = (snap) => writeFileSync(OUT, JSON.stringify(snap, null, 2) + "\n");

async function api(path, init = {}) {
  const r = await fetch("https://api.github.com" + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

// "owner/name" for every GitHub repo linked from a project.
function projectRepos() {
  const src = readFileSync(PROJECTS, "utf8"),
    repos = new Set();
  for (const m of src.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?["/#?]/g))
    repos.add(`${m[1]}/${m[2]}`);
  for (const m of src.matchAll(/repoUrl\("([\w.-]+)"\)/g)) repos.add(`${USER}/${m[1]}`);
  return [...repos];
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

// 12 rolling 7-day windows ending now, oldest first. `items` are [time ms, count].
function buckets(items, now = Date.now()) {
  const w = new Array(12).fill(0);
  for (const [t, n] of items) {
    const i = Math.floor((now - t) / WEEK_MS);
    if (i >= 0 && i < 12) w[11 - i] += n;
  }
  return w;
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
  // A day counts from its end, so today's contributions land in the newest window.
  return buckets(
    days.map((d) => [Date.parse(d.date) + 864e5 - 1, d.contributionCount]),
    now,
  );
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
  if (process.argv.includes("--if-stale") && prev?.syncedAt) {
    if (Date.now() - Date.parse(prev.syncedAt) < STALE_MS) {
      console.log("github sync: snapshot is fresh, skipping");
      return;
    }
  }

  const repos = {},
    list = projectRepos();
  let failed = 0;
  const results = await Promise.allSettled(list.map(repoInfo));
  results.forEach((r, i) => {
    const full = list[i];
    if (r.status === "fulfilled") repos[full] = r.value;
    else {
      failed++;
      if (prev?.repos?.[full]) repos[full] = prev.repos[full];
      console.warn("github sync: " + full + ": " + r.reason.message);
    }
  });

  let activity = null,
    activityFresh = false;
  try {
    activity = token
      ? { kind: "contributions", weeks: await contributions() }
      : { kind: "pushes", weeks: await pushes() };
    activityFresh = true;
  } catch (e) {
    console.warn("github sync: activity: " + e.message);
    if (token) {
      try {
        activity = { kind: "pushes", weeks: await pushes() };
        activityFresh = true;
      } catch {
        // fall through to the previous snapshot
      }
    }
    activity = activity || prev?.activity || null;
  }

  // Only move the timestamp when something was actually fetched just now.
  const fresh = results.some((r) => r.status === "fulfilled") || activityFresh;
  const snap = {
    syncedAt: fresh ? new Date().toISOString() : (prev?.syncedAt ?? null),
    user: USER,
    repos,
    activity,
  };
  write(snap);
  console.log(
    `github sync: ${Object.keys(repos).length} repos, activity ${activity ? activity.kind : "none"}` +
      (failed ? `, ${failed} failed (kept previous)` : ""),
  );
}

main().catch((e) => {
  console.warn("github sync failed: " + e.message);
  if (!existsSync(OUT)) write({ syncedAt: null, user: USER, repos: {}, activity: null });
});
