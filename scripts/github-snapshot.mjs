// The pure parts of sync-github.mjs (no network, no files), so they can be tested.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "owner/name" for every GitHub repo linked from projects.js's source text. */
export function reposIn(src, user) {
  const repos = new Set();
  for (const m of src.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?["/#?]/g))
    repos.add(`${m[1]}/${m[2]}`);
  for (const m of src.matchAll(/repoUrl\("([\w.-]+)"\)/g)) repos.add(`${user}/${m[1]}`);
  return [...repos];
}

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
 * The new `repos` map from one fetch per repo in `list` (Promise.allSettled results, in
 * order). A repo GitHub answers 404 for (deleted, renamed away, private) drops out; any
 * other failure (rate limit, network) keeps its entry from the previous snapshot.
 */
export function mergeRepos(list, results, prev = {}) {
  const repos = {};
  let failed = 0;
  results.forEach((r, i) => {
    const full = list[i];
    if (r.status === "fulfilled") {
      repos[full] = r.value;
      return;
    }
    failed++;
    if (r.reason?.status !== 404 && prev?.[full]) repos[full] = prev[full];
  });
  return { repos, failed };
}
