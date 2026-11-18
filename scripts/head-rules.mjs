// The rules scripts/check-head.mjs applies to the built pages, pure so test/headRules.test.mjs
// can feed them a missing project or a missing description. No file or DOM access here.

/** The sitemap against the exact routes the site has: home, the resume, one page per project. */
export function routeProblems({ sitemap, slugs, exported, origin }) {
  const want = [origin, origin + "resume/", ...slugs.map((s) => `${origin}projects/${s}/`)];
  const out = [];
  for (const u of want) if (!sitemap.includes(u)) out.push(`the sitemap is missing ${u}`);
  for (const u of sitemap) {
    if (!want.includes(u)) out.push(`the sitemap lists ${u}, which is not a route`);
    if (sitemap.indexOf(u) !== sitemap.lastIndexOf(u)) out.push(`the sitemap lists ${u} twice`);
  }
  for (const s of exported) {
    if (!slugs.includes(s)) out.push(`out/ has a project page for ${s}, which is not in the data`);
  }
  for (const s of slugs) {
    if (!exported.includes(s)) out.push(`no exported page for the project ${s}`);
  }
  return [...new Set(out)];
}

/**
 * One page's title and description against the tags a crawler or link preview reads.
 * `title` is the <title> text; `meta(key, attr)` returns the content of the first such tag.
 */
export function copyProblems({ title, meta }) {
  const out = [];
  const description = meta("description", "name");
  if (!title) out.push("no <title>");
  if (!description) out.push("no description meta");
  for (const [key, attr, want, label] of [
    ["og:title", "property", title, "the title"],
    ["twitter:title", "name", title, "the title"],
    ["og:description", "property", description, "the description"],
    ["twitter:description", "name", description, "the description"],
  ]) {
    const got = meta(key, attr);
    if (!got) out.push(`no ${key}`);
    else if (want && got !== want) out.push(`${key} is not ${label}: ${JSON.stringify(got)}`);
  }
  return out;
}

/** Titles and descriptions that two pages share, so a project can't carry the home page's. */
export function duplicateProblems(pages) {
  const out = [];
  for (const field of ["title", "description"]) {
    const seen = new Map();
    for (const [url, p] of Object.entries(pages)) {
      const v = p[field];
      if (!v) continue;
      if (seen.has(v)) out.push(`${seen.get(v)} and ${url} share one ${field}`);
      else seen.set(v, url);
    }
  }
  return out;
}
