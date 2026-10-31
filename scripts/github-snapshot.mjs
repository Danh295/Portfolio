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

const lower = (s) => s.toLowerCase();

/**
 * What the repo check reports. `owned` (the user's public repos) and `contributed` (public
 * repos the user contributed to but doesn't own) are GitHub's lists of { full_name, fork? },
 * `linked` the "owner/name" repos projects.js links, `resolved` GitHub's answer for each
 * linked repo ({ full_name, archived? } or { gone: true } for a 404), and `ignore` a
 * { "owner/name": reason } map of repos chosen to stay off the site (any case; a bare name
 * matches nothing, since it could be a stranger's repo). A renamed repo counts as linked under
 * its new name. Ignoring only filters `missing`: a repo the site links is still checked.
 */
export function repoDrift({
  linked = [],
  owned = [],
  contributed = [],
  resolved = {},
  ignore = {},
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
  const seen = new Set();
  const missing = [...owned, ...contributed]
    .filter((r) => !r.fork)
    .map((r) => r.full_name)
    .filter((full) => !shown.has(lower(full)) && !skipped.has(lower(full)))
    .filter((full) => !seen.has(lower(full)) && seen.add(lower(full)));
  const ok = !missing.length && !renamed.length && !archived.length && !gone.length;
  return { missing, renamed, archived, gone, ok };
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
      `archived: ${d.archived.join(", ")} (read-only now; say so in its project or drop it)`,
    );
  if (d.gone.length)
    lines.push(`gone (404: deleted or made private): ${d.gone.join(", ")} (remove its link)`);
  return lines;
}
