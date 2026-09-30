// Build-time GitHub snapshot, so visitors never call the GitHub API (no rate limits,
// fully static pages). Runs before `next build` and `next dev` (package.json).
//
// Writes src/data/github.generated.json (gitignored):
//   { syncedAt, user, repos: { "owner/name": { pushedAt, stars, language, url } },
//     activity: { kind: "contributions" | "pushes", weeks: [12 numbers] } | null }
//
// - Repos are the GitHub links found in src/data/projects.js.
// - Activity uses the GraphQL contribution calendar when GITHUB_TOKEN is set (CI), and
//   falls back to counting public PushEvents otherwise.
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
  for (const m of src.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?["/]/g))
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

// Last 12 weeks, oldest first.
async function contributions() {
  const q = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{contributionCount}}}}}}`;
  const r = await api("/graphql", {
    method: "POST",
    body: JSON.stringify({ query: q, variables: { login: USER } }),
  });
  const weeks = r.data.user.contributionsCollection.contributionCalendar.weeks;
  return weeks
    .slice(-12)
    .map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0));
}

async function pushes() {
  const events = await api(`/users/${USER}/events/public?per_page=100`),
    now = Date.now(),
    w = new Array(12).fill(0);
  for (const e of events) {
    if (e.type !== "PushEvent") continue;
    const i = Math.max(0, Math.floor((now - Date.parse(e.created_at)) / WEEK_MS));
    if (i < 12) w[11 - i] += 1;
  }
  return w;
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
