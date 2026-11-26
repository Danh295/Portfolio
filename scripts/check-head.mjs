// Head-tag check: reads the built HTML in out/ the way a crawler does (no browser) and fails on
// a head that tells crawlers or link previews the wrong thing. Run after `npm run build`; CI runs
// it right after `next build`, so a bad head turns main red and nothing deploys.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { copyProblems, duplicateProblems, routeProblems } from "./head-rules.mjs";
import { loadProjects } from "./load-projects.mjs";

const OUT = new URL("../out/", import.meta.url).pathname;
if (!existsSync(join(OUT, "index.html"))) {
  console.error("out/ has no build: run `npm run build` first.");
  process.exit(1);
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}`,
    ok || detail === undefined ? "" : JSON.stringify(detail),
  );
};

// The `<head>` of a built page: every `<link>` and `<meta>` tag, as attribute maps.
const head = (file) => {
  const html = readFileSync(join(OUT, file), "utf8");
  const tags = [...html.matchAll(/<(?:link|meta)\b[^>]*>/g)].map((m) => m[0]);
  return tags.map((t) => ({
    tag: t.startsWith("<link") ? "link" : "meta",
    ...Object.fromEntries([...t.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
  }));
};

// Pages that belong in the index: every URL in the sitemap, as the built file it maps to. The
// expected values below are pinned here, not read from the layout's metadata, so a wrong layout
// can't agree with its own check.
const SITE_NAME = "danny hu";
const ORIGIN = "https://danh295.github.io/Portfolio/";
const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
const INDEXABLE = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const fileOf = (url) => url.replace(/^https:\/\/[^/]+\/Portfolio\//, "") + "index.html";
check(
  "the sitemap lists home, the resume and the projects",
  INDEXABLE.length >= 3 &&
    [".../Portfolio/", "/resume/"].every((u) =>
      INDEXABLE.some((l) => l.endsWith(u.replace("...", ""))),
    ),
  INDEXABLE,
);

for (const url of INDEXABLE) {
  const file = fileOf(url),
    tags = head(file),
    meta = (key, attr = "name") => tags.filter((t) => t.tag === "meta" && t[attr] === key);
  const canonical = tags.filter((t) => t.tag === "link" && t.rel === "canonical");
  check(
    `${file}: one canonical, the sitemap's URL`,
    canonical.length === 1 && canonical[0].href === url,
    canonical,
  );
  check(
    `${file}: og:url is the same URL`,
    meta("og:url", "property")[0]?.content === url,
    meta("og:url", "property"),
  );
  const robots = meta("robots");
  check(
    `${file}: one robots meta, index, follow`,
    robots.length === 1 && robots[0].content === "index, follow",
    robots,
  );
  check(
    `${file}: og:site_name is the site, not the title`,
    meta("og:site_name", "property")[0]?.content === SITE_NAME,
    meta("og:site_name", "property"),
  );
  check(`${file}: no keywords meta`, meta("keywords").length === 0, meta("keywords"));

  // The link preview: an absolute image under the site, once (no doubled base path), that exists
  // in the build and is the 1200×630 a large card needs, on both og and twitter.
  check(
    `${file}: twitter:card is summary_large_image`,
    meta("twitter:card")[0]?.content === "summary_large_image",
    meta("twitter:card"),
  );
  for (const [key, attr] of [
    ["og:image", "property"],
    ["twitter:image", "name"],
  ]) {
    const src = meta(key, attr)[0]?.content ?? "";
    // The query is the card's version (site.ogImage): the file is the path before it.
    const rel = src.startsWith(ORIGIN) ? src.slice(ORIGIN.length).split("?")[0] : null;
    const png =
      rel && !rel.includes("Portfolio/") && existsSync(join(OUT, rel))
        ? readFileSync(join(OUT, rel))
        : null;
    // A PNG's IHDR: width and height are the big-endian words at bytes 16 and 20.
    const size = png && png.length > 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : null;
    check(
      `${file}: ${key} is an absolute 1200×630 image in the build`,
      size?.[0] === 1200 && size?.[1] === 630,
      { src, size },
    );
  }
}

// Routes and copy (rules in head-rules.mjs, pinned by test/headRules.test.mjs): the sitemap is the
// exact set of routes (home, the resume, one page per project in the data, read through the same
// loader the sync uses, not through the app), each has an exported file, and every page's title
// and description agree with its og and twitter tags and with no other page's.
{
  const slugs = (await loadProjects()).map((p) => p.slug);
  const projectsDir = join(OUT, "projects");
  const exported = readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(projectsDir, d.name, "index.html")))
    .map((d) => d.name);
  const routes = routeProblems({ sitemap: INDEXABLE, slugs, exported, origin: ORIGIN });
  check("the sitemap is exactly the site's routes, each exported", routes.length === 0, routes);
  const pages = {};
  for (const url of INDEXABLE) {
    const file = fileOf(url);
    if (!existsSync(join(OUT, file))) continue;
    const title = readFileSync(join(OUT, file), "utf8").match(/<title>([^<]*)<\/title>/)?.[1];
    const tags = head(file);
    const meta = (key, attr = "name") =>
      tags.find((t) => t.tag === "meta" && t[attr] === key)?.content;
    const problems = copyProblems({ title, meta });
    check(`${file}: title and description agree with og and twitter`, !problems.length, problems);
    pages[url] = { title, description: meta("description") };
  }
  const dupes = duplicateProblems(pages);
  check("no two pages share a title or a description", dupes.length === 0, dupes);
}

// Pages that must stay out of the index: the old section URLs (they redirect home) and the 404.
const NOINDEX = [
  "projects/index.html",
  "experience/index.html",
  "skills/index.html",
  "404.html",
  "404/index.html",
  "_not-found/index.html",
];
check(
  "the noindex page set is not empty",
  NOINDEX.every((f) => existsSync(join(OUT, f))),
  NOINDEX,
);

for (const file of NOINDEX) {
  const tags = head(file);
  const canonical = tags.filter((t) => t.tag === "link" && t.rel === "canonical");
  check(`${file}: no canonical (it isn't home)`, canonical.length === 0, canonical);
  const og = tags.filter(
    (t) => t.tag === "meta" && /^(og|twitter):/.test(t.property ?? t.name ?? ""),
  );
  check(
    `${file}: no link-preview tags (it isn't home)`,
    og.length === 0,
    og.map((t) => t.property ?? t.name),
  );
  const robots = tags.filter((t) => t.tag === "meta" && t.name === "robots");
  check(
    `${file}: one robots meta, and it says noindex`,
    robots.length === 1 && /noindex/.test(robots[0].content),
    robots,
  );
}

// Project media: the exported page names its pictures (so a crawler and a visitor without script
// get them), and every file it names is in the build. The pages that have media are those with a
// grid in src/data/media-grids.json (made with the pictures, keyed `<slug>/<file>`), so a build
// that quietly stops rendering them can't pass by having nothing to check, and a new project
// with media needs no edit here.
const GRIDS = JSON.parse(
  readFileSync(new URL("../src/data/media-grids.json", import.meta.url), "utf8"),
);
const WITH_MEDIA = [...new Set(Object.keys(GRIDS).map((key) => key.split("/")[0]))];
for (const slug of readdirSync(join(OUT, "projects"))) {
  const file = join("projects", slug, "index.html");
  if (!statSync(join(OUT, "projects", slug)).isDirectory() || !existsSync(join(OUT, file)))
    continue;
  const html = readFileSync(join(OUT, file), "utf8");
  const urls = [...new Set(html.match(/\/Portfolio\/media\/[^"\s,]+/g) ?? [])];
  // Each picture the grids say this project has: the page names both formats at every width
  // (one missing picture can't hide behind another's files), and its <img> carries the size the
  // grid recorded (no layout shift, and a wrong size is caught).
  for (const [key, g] of Object.entries(GRIDS).filter(([k]) => k.startsWith(`${slug}/`))) {
    const pic = key.slice(slug.length + 1);
    const absent = g.widths
      .flatMap((w) => ["avif", "webp"].map((ext) => `/Portfolio/media/${slug}/${pic}-${w}.${ext}`))
      .filter((u) => !urls.includes(u));
    check(`${key}: the page names both formats at every width`, absent.length === 0, absent);
    const img =
      html.match(/<img\b[^>]*>/g)?.find((t) => t.includes(`/media/${slug}/${pic}-`)) ?? "";
    check(
      `${key}: its <img> has the grid's size, ${g.w}×${g.h} (no layout shift)`,
      img.includes(`width="${g.w}"`) && img.includes(`height="${g.h}"`),
      img,
    );
  }
  const missing = urls.filter((u) => !existsSync(join(OUT, u.replace(/^\/Portfolio\//, ""))));
  check(`${file}: every media file it names is in the build`, missing.length === 0, missing);
}
check("some page has media", WITH_MEDIA.length > 0, WITH_MEDIA);
check(
  "the pages with media are all pages of the build",
  WITH_MEDIA.every((s) => existsSync(join(OUT, "projects", s, "index.html"))),
  WITH_MEDIA,
);

console.log(failed ? `\n${failed} check(s) failed` : "\nall head checks passed");
process.exit(failed ? 1 : 0);
