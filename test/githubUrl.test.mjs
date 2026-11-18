import { test } from "node:test";
import assert from "node:assert/strict";
import { findRepo, linkedRepos, parseGithubRepo } from "@/lib/githubUrl.mjs";
import { projects } from "@/data/projects";

const key = (href) => parseGithubRepo(href)?.key ?? null;

test("parseGithubRepo: owner/name from any form of a repo link", () => {
  assert.equal(key("https://github.com/Me/Thing"), "Me/Thing");
  assert.equal(key("https://github.com/Me/Thing/"), "Me/Thing");
  assert.equal(key("https://github.com/Me/Thing.git"), "Me/Thing");
  assert.equal(key("https://www.github.com/Me/Thing?tab=readme#top"), "Me/Thing");
  assert.equal(key("http://github.com/me/dots.and-dashes_1"), "me/dots.and-dashes_1");
});

test("parseGithubRepo: a path under the repo still names the repo", () => {
  assert.equal(key("https://github.com/Me/Thing/tree/main/src/lib"), "Me/Thing");
  assert.equal(key("https://github.com/Me/Thing/issues/3#c1"), "Me/Thing");
  assert.deepEqual(parseGithubRepo("https://github.com/Me/Thing/pulls"), {
    owner: "Me",
    name: "Thing",
    key: "Me/Thing",
  });
});

test("parseGithubRepo: not a repo page gives null", () => {
  assert.equal(key("https://github.com/Me"), null); // a profile
  assert.equal(key("https://github.com/"), null);
  assert.equal(key("https://gist.github.com/Me/abc123"), null);
  assert.equal(key("https://github.com.example.org/Me/Thing"), null);
  assert.equal(key("https://example.com/github.com/Me/Thing"), null);
  assert.equal(key("https://gitlab.com/Me/Thing"), null);
  assert.equal(key("ftp://github.com/Me/Thing"), null);
  assert.equal(key("mailto:me@example.com"), null);
  assert.equal(key("github.com/Me/Thing"), null); // no scheme
  assert.equal(key(undefined), null);
  assert.equal(key(""), null);
});

test("linkedRepos: reads links as data, once per repo whatever the case", () => {
  const list = linkedRepos([
    { links: [{ href: "https://github.com/Me/Thing" }, { href: "https://example.com/x" }] },
    { links: [{ href: "https://github.com/me/thing/tree/main" }] },
    { links: [{ href: "https://gist.github.com/Me/abc" }, { href: "https://github.com/Me" }] },
    {},
    { links: [{ href: "https://github.com/Other/Repo.git" }] },
  ]);
  assert.deepEqual(list, ["Me/Thing", "Other/Repo"]);
});

test("linkedRepos: a computed link counts (the real projects)", () => {
  const list = linkedRepos(projects);
  assert.ok(list.length > 0);
  for (const r of list) assert.match(r, /^[\w.-]+\/[\w.-]+$/);
  // every project's GitHub link is covered
  for (const p of projects)
    for (const l of p.links || []) {
      const r = parseGithubRepo(l.href);
      if (r)
        assert.ok(
          list.some((x) => x.toLowerCase() === r.key.toLowerCase()),
          l.href,
        );
    }
});

test("findRepo: exact key first, then any case", () => {
  const repos = { "Me/Thing": { stars: 1 }, "a/b": { stars: 2 } };
  assert.equal(findRepo(repos, "Me/Thing").stars, 1);
  assert.equal(findRepo(repos, "me/thing").stars, 1);
  assert.equal(findRepo(repos, "x/y"), undefined);
});
