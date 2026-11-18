import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { mediaItems, mediaKey } from "@/lib/media";
import { projects } from "@/data/projects";
import grids from "@/data/media-grids.json" with { type: "json" };

const G = {
  "p/a": { w: 1600, h: 1000, widths: [800, 1600], cols: 4, rows: 2, cells: "01239876" },
  "p/b": { w: 720, h: 272, widths: [720], cols: 4, rows: 1, cells: "0123" },
};

test("mediaKey: the one place the slug/file key is made (the grids, the page and the shell use it)", () => {
  assert.equal(mediaKey("crapos", "boot"), "crapos/boot");
  const [m] = mediaItems(
    { slug: "p", media: [{ file: "a", alt: "x", caption: "y" }] },
    { [mediaKey("p", "a")]: G["p/a"] },
    "",
  );
  assert.equal(m.key, mediaKey("p", "a"));
});

test("mediaItems: no media field, no items", () => {
  assert.deepEqual(mediaItems({ slug: "p" }, G, "/Portfolio"), []);
  assert.deepEqual(mediaItems({ slug: "p", media: [] }, G, "/Portfolio"), []);
});

test("mediaItems: an image becomes a picture's sources, size and cover grid", () => {
  const [m] = mediaItems(
    { slug: "p", media: [{ file: "a", alt: "the page", caption: "a caption" }] },
    G,
    "/Portfolio",
  );
  assert.equal(m.kind, "image");
  assert.equal(m.key, "p/a");
  assert.equal(m.alt, "the page");
  assert.equal(m.caption, "a caption");
  assert.equal(m.w, 1600);
  assert.equal(m.h, 1000);
  assert.deepEqual(m.grid, { cols: 4, rows: 2, cells: "01239876" });
  assert.equal(m.src, "/Portfolio/media/p/a-1600.webp");
  assert.deepEqual(m.sources, [
    {
      type: "image/avif",
      srcSet: "/Portfolio/media/p/a-800.avif 800w, /Portfolio/media/p/a-1600.avif 1600w",
    },
    {
      type: "image/webp",
      srcSet: "/Portfolio/media/p/a-800.webp 800w, /Portfolio/media/p/a-1600.webp 1600w",
    },
  ]);
});

test("mediaItems: a source smaller than 800 keeps its own width", () => {
  const [m] = mediaItems({ slug: "p", media: [{ file: "b", alt: "x", caption: "y" }] }, G, "");
  assert.equal(m.src, "/media/p/b-720.webp");
  assert.equal(m.sources[1].srcSet, "/media/p/b-720.webp 720w");
});

test("mediaItems: a private project is one placeholder with its reason", () => {
  const items = mediaItems({ slug: "p", media: [{ private: "an internal tool" }] }, G, "");
  assert.deepEqual(items, [{ kind: "private", caption: "an internal tool" }]);
});

test("mediaItems: a file the build never made is an error, not a blank", () => {
  assert.throws(
    () => mediaItems({ slug: "p", media: [{ file: "nope", alt: "x", caption: "y" }] }, G, ""),
    /p\/nope/,
  );
});

// The real data: what the page will draw has to exist.
test("projects' media: at most 3, files and grids exist, text is stored as displayed", () => {
  for (const p of projects) {
    const media = p.media ?? [];
    assert.ok(media.length <= 3, p.slug + " has more than 3");
    const priv = media.filter((m) => m.private);
    if (priv.length) assert.equal(media.length, 1, p.slug + ": a private placeholder stands alone");
    for (const m of media) {
      if (m.private) {
        assert.match(m.private, /^[a-z0-9]/, p.slug + " reason starts lowercase");
        continue;
      }
      const key = `${p.slug}/${m.file}`,
        g = grids[key];
      assert.ok(g, key + " has no grid (run scripts/make-media.mjs)");
      assert.ok(m.alt?.trim(), key + " needs alt text");
      assert.match(m.caption ?? "", /^[a-z0-9]/, key + " caption starts lowercase");
      assert.equal(g.cells.length, g.cols * g.rows, key + " grid size");
      assert.ok(/^\d+$/.test(g.cells), key + " grid is digits");
      assert.ok(g.w > 0 && g.h > 0, key);
      for (const w of g.widths)
        for (const ext of ["avif", "webp"])
          assert.ok(
            existsSync(join("public", "media", p.slug, `${m.file}-${w}.${ext}`)),
            `${key} missing ${w}.${ext}`,
          );
    }
  }
});

test("every grid in media-grids.json is used by a project (no strays)", () => {
  const used = new Set(
    projects.flatMap((p) =>
      (p.media ?? []).filter((m) => m.file).map((m) => `${p.slug}/${m.file}`),
    ),
  );
  for (const key of Object.keys(grids)) assert.ok(used.has(key), key + " is unused");
});
