// The repo check: compares the public repos Danny owns or has contributed to with the repos
// src/data/projects.js links, and exits 1 on drift (a repo missing from the site, or a linked
// one renamed, archived or gone), so CI turns red and GitHub emails the owner. It runs in its
// own workflow (.github/workflows/repo-check.yml), never in the deploy, so it can't block one.
//
// - Owned repos: the user's public non-fork repos (GET /users/{user}/repos).
// - Contributed repos: public repos the user contributed to but doesn't own (GraphQL
//   repositoriesContributedTo, which needs a token; without GITHUB_TOKEN this half is skipped
//   with a notice). GitHub's docs only say "recently"; one run showed about the last year, so
//   a repo that drops out of the list is not drift (a per-run observation, not a guarantee).
//   It pages through them (100 at a time, up to 10 pages); a list it could not read to the end
//   is reported as incomplete and fails the run, since the repos it missed could be the drift.
// - Repos chosen to stay off the site go in the "ignore" map of scripts/repo-check.json
//   ("owner/name": reason). The decision logic is the pure repoDrift in github-snapshot.mjs.
//
// Usage: node scripts/check-repos.mjs   (GITHUB_TOKEN=... for the contributed half)

import { readFileSync } from "node:fs";
import { collectPages, driftReport, repoDrift } from "./github-snapshot.mjs";
import { linkedRepos } from "../src/lib/githubUrl.mjs";
import { loadProjects } from "./load-projects.mjs";

const { user: USER, ignore } = JSON.parse(
  readFileSync(new URL("./repo-check.json", import.meta.url), "utf8"),
);
const TIMEOUT_MS = 10_000;

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "danh295-portfolio-repo-check",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// A 404 or a refused token won't change on a retry; a timeout or a 5xx might, and one flaky
// reply should not turn a push or the daily run red like real drift does.
async function api(path, init = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch("https://api.github.com" + path, {
        ...init,
        headers: { ...headers, ...(init.headers || {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) {
        // A 403 is a refused token or a rate limit (GitHub answers both that way), so say both.
        const refused =
          r.status === 401
            ? " (GitHub refused the token)"
            : r.status === 403 || r.status === 429
              ? " (forbidden or rate limited)"
              : "";
        throw Object.assign(new Error(`${path}: ${r.status}${refused}`), { status: r.status });
      }
      return await r.json();
    } catch (e) {
      const final = e.status && e.status < 500;
      if (final || attempt === 3) throw e;
      await sleep(attempt * 1000);
    }
  }
}

async function ownedRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
    repos.push(...batch.map((r) => ({ full_name: r.full_name, fork: r.fork })));
    if (batch.length < 100) return repos;
  }
}

async function contributedRepos() {
  const q = `query($login:String!,$after:String){user(login:$login){repositoriesContributedTo(
    first:100, after:$after, privacy:PUBLIC, includeUserRepositories:false,
    contributionTypes:[COMMIT,PULL_REQUEST,PULL_REQUEST_REVIEW,ISSUE])
    {pageInfo{hasNextPage endCursor} nodes{nameWithOwner isFork}}}}`;
  // If the token isn't allowed to read this, say so: the failure would otherwise look like drift.
  const why = "the list of repos you contributed to could not be read (is the token allowed to?)";
  const { nodes, complete } = await collectPages(async (after) => {
    let r;
    try {
      r = await api("/graphql", {
        method: "POST",
        body: JSON.stringify({ query: q, variables: { login: USER, after } }),
      });
    } catch (e) {
      throw new Error(`${why}: ${e.message}`);
    }
    const list = r.data?.user?.repositoriesContributedTo;
    if (r.errors?.length || !list?.nodes)
      throw new Error(`${why}: ${r.errors?.[0]?.message ?? "no repositories in the reply"}`);
    return {
      nodes: list.nodes.filter(Boolean),
      hasNextPage: Boolean(list.pageInfo?.hasNextPage),
      endCursor: list.pageInfo?.endCursor,
    };
  });
  return { repos: nodes.map((n) => ({ full_name: n.nameWithOwner, fork: n.isFork })), complete };
}

// GitHub follows a renamed repo's old name to the new one, so full_name shows the rename.
async function resolve(full) {
  try {
    const r = await api(`/repos/${full}`);
    return { full_name: r.full_name, archived: r.archived };
  } catch (e) {
    if (e.status === 404) return { gone: true };
    throw e;
  }
}

async function main() {
  const linked = linkedRepos(await loadProjects());
  const [owned, contribution, answers] = await Promise.all([
    ownedRepos(),
    token ? contributedRepos() : { repos: [], complete: true },
    Promise.all(linked.map(resolve)),
  ]);
  if (!token) console.warn("repo check: no GITHUB_TOKEN, so repos you contributed to are skipped");
  const resolved = Object.fromEntries(linked.map((full, i) => [full, answers[i]]));
  const drift = repoDrift({
    linked,
    owned,
    contributed: contribution.repos,
    resolved,
    ignore,
    complete: contribution.complete,
  });
  if (drift.ok) {
    console.log(`repo check: ${linked.length} linked repos, nothing missing or changed`);
    return;
  }
  for (const line of driftReport(drift)) console.error("repo check: " + line);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error("repo check could not finish: " + e.message);
  process.exitCode = 1;
});
