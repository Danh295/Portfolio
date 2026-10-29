// Head-tag check: reads the built HTML in out/ the way a crawler does (no browser) and fails on
// a head that tells crawlers or link previews the wrong thing. Run after `npm run build`; CI runs
// it right after `next build`, so a bad head turns main red and nothing deploys.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
    const rel = src.startsWith(ORIGIN) ? src.slice(ORIGIN.length) : null;
    const png =
      rel && !rel.includes("Portfolio/") && existsSync(join(OUT, rel))
        ? readFileSync(join(OUT, rel))
        : null;
    const size = png && png.length > 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : null;
    check(
      `${file}: ${key} is an absolute 1200×630 image in the build`,
      size?.[0] === 1200 && size?.[1] === 630,
      { src, size },
    );
  }
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

console.log(failed ? `\n${failed} check(s) failed` : "\nall head checks passed");
process.exit(failed ? 1 : 0);
