// The repo check: compares the public repos Danny owns or has contributed to with the repos
// src/data/projects.js links, and exits 1 on drift (a repo missing from the site, or a linked
// one renamed, archived or gone), so CI turns red and GitHub emails the owner. It runs in its
// own workflow (.github/workflows/repo-check.yml), never in the deploy, so it can't block one.
//
// - Owned repos: the user's public non-fork repos (GET /users/{user}/repos).
// - Contributed repos: public repos the user contributed to but doesn't own (GraphQL
//   repositoriesContributedTo, which GitHub limits to roughly the last year and which needs a
//   token; without GITHUB_TOKEN this half is skipped with a notice).
// - Repos chosen to stay off the site go in the "ignore" map of scripts/repo-check.json, each
//   with its reason. The decision logic is the pure repoDrift in github-snapshot.mjs.
//
// Usage: node scripts/check-repos.mjs   (GITHUB_TOKEN=... for the contributed half)

import { readFileSync } from "node:fs";
import { driftReport, repoDrift, reposIn } from "./github-snapshot.mjs";

const { user: USER, ignore } = JSON.parse(
  readFileSync(new URL("./repo-check.json", import.meta.url), "utf8"),
);
const PROJECTS = new URL("../src/data/projects.js", import.meta.url);
const TIMEOUT_MS = 10_000;

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "danh295-portfolio-repo-check",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

async function ownedRepos() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
    repos.push(...batch.map((r) => ({ full_name: r.full_name, fork: r.fork })));
    if (batch.length < 100) return repos;
  }
}

async function contributedRepos() {
  const q = `query($login:String!){user(login:$login){repositoriesContributedTo(first:100,
    privacy:PUBLIC, includeUserRepositories:false,
    contributionTypes:[COMMIT,PULL_REQUEST,PULL_REQUEST_REVIEW,ISSUE])
    {nodes{nameWithOwner isFork}}}}`;
  const r = await api("/graphql", {
    method: "POST",
    body: JSON.stringify({ query: q, variables: { login: USER } }),
  });
  if (r.errors?.length) throw new Error("graphql: " + r.errors[0].message);
  return r.data.user.repositoriesContributedTo.nodes.map((n) => ({
    full_name: n.nameWithOwner,
    fork: n.isFork,
  }));
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
  const linked = reposIn(readFileSync(PROJECTS, "utf8"), USER);
  const [owned, contributed, answers] = await Promise.all([
    ownedRepos(),
    token ? contributedRepos() : [],
    Promise.all(linked.map(resolve)),
  ]);
  if (!token) console.warn("repo check: no GITHUB_TOKEN, so repos you contributed to are skipped");
  const resolved = Object.fromEntries(linked.map((full, i) => [full, answers[i]]));
  const drift = repoDrift({ linked, owned, contributed, resolved, ignore });
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
