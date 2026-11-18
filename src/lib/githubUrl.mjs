// The one GitHub URL parser: the sync, the repo check and the project page all read a repo
// out of a link with it. Pure, and a .mjs so the build scripts can import it under plain node.

const HOSTS = new Set(["github.com", "www.github.com"]);

/**
 * The repo a link points at, { owner, name, key: "owner/name" } as the link spells it, or null
 * when it isn't a GitHub repo page: another host (gist.github.com, github.com.example.org), a
 * profile link, or no URL at all. A path under the repo (/tree/main/src, /issues/3), a `.git`
 * suffix, a query or a hash still name the repo.
 */
export function parseGithubRepo(href) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || !HOSTS.has(u.hostname)) return null;
  const [owner, rest] = u.pathname.split("/").filter(Boolean);
  const name = rest?.replace(/\.git$/, "");
  if (!owner || !name || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;
  return { owner, name, key: `${owner}/${name}` };
}

/**
 * "owner/name" for every GitHub repo the projects link (`projects[].links[].href`), once each
 * however it is cased, in the order first linked.
 */
export function linkedRepos(projects) {
  const seen = new Map();
  for (const p of projects)
    for (const l of p.links || []) {
      const r = parseGithubRepo(l.href);
      if (r && !seen.has(r.key.toLowerCase())) seen.set(r.key.toLowerCase(), r.key);
    }
  return [...seen.values()];
}

/** A snapshot's `repos` entry for a repo key, found whatever the case. */
export function findRepo(repos, key) {
  if (repos[key]) return repos[key];
  const k = key.toLowerCase();
  const hit = Object.keys(repos).find((r) => r.toLowerCase() === k);
  return hit ? repos[hit] : undefined;
}
