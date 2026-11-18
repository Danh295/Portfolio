// Builds the project media from still images: `node --no-warnings scripts/make-media.mjs`
// (the flag only hides Node's "module type" notice for src/lib/ascii/image.js, which this
// imports so the build and the page share one ASCII mapping). Run by hand when an image is
// added or changed, then commit the result.
//
// For each source below it writes
//   public/media/<slug>/<file>-<width>.{avif,webp}  the picture, at 800 and 1600 wide (never
//                                                   enlarged: a smaller source keeps its width)
//   src/data/media-grids.json                       the ASCII cover: a COLS-wide grid of ramp
//                                                   digits per image (structureLevels), plus the
//                                                   source's size and the widths written
// The picture is hand-written as <picture> by components/work/ProjectMedia.jsx (static export,
// images.unoptimized), so nothing here depends on Next's image pipeline.
//
// Sources live outside the repo (SOURCES_DIR, default ~/Documents/portfolio-media-drafts, one
// folder per project with a SOURCES.md saying where each file came from). Everything is checked
// and rendered into a temp folder first; the published files are replaced only if all of it
// worked.
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import sharp from "sharp";
import { structureLevels } from "../src/lib/ascii/image.js";
import { mediaKey } from "../src/lib/media.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES_DIR = process.env.MEDIA_SRC || join(homedir(), "Documents", "portfolio-media-drafts");

// slug (a project's slug) / file (the name the page uses) / from (under SOURCES_DIR).
const SOURCES = [
  { slug: "crapos", file: "boot", from: "crapos/crapos.png" },
  { slug: "anifriend", file: "companions", from: "anifriend/live-home.png" },
  { slug: "anifriend", file: "pipeline", from: "anifriend/pipeline.png" },
  { slug: "operaid", file: "landing", from: "operaid/live-home.png" },
];

const COLS = 150; // the stored grid's width; the page resamples it (gridRows)
const CELL = 0.6; // a character cell is 0.6 as wide as it is tall (the font's advance)
const WIDTHS = [800, 1600];

// Prerequisites first: fail before rendering anything.
const missing = SOURCES.filter((s) => !existsSync(join(SOURCES_DIR, s.from)));
if (missing.length) {
  console.error(`missing source images under ${SOURCES_DIR}:`);
  for (const s of missing) console.error("  " + s.from);
  process.exit(1);
}

const stage = mkdtempSync(join(tmpdir(), "make-media-"));
try {
  const grids = {};
  for (const { slug, file, from } of SOURCES) {
    const src = join(SOURCES_DIR, from);
    const meta = await sharp(src).metadata();
    // The size as shown: a photo's EXIF orientation 5–8 turns it a quarter, swapping its sides
    // (every pipeline below starts with .rotate(), which applies it).
    const turned = meta.orientation >= 5 && meta.orientation <= 8;
    const width = turned ? meta.height : meta.width,
      height = turned ? meta.width : meta.height;
    const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, 1600)])].sort(
      (a, b) => a - b,
    );
    mkdirSync(join(stage, "public", slug), { recursive: true });
    for (const w of widths) {
      const img = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
      await img
        .clone()
        .webp({ quality: 82 })
        .toFile(join(stage, "public", slug, `${file}-${w}.webp`));
      await img
        .clone()
        .avif({ quality: 55 })
        .toFile(join(stage, "public", slug, `${file}-${w}.avif`));
    }
    const rows = Math.max(4, Math.round(((COLS * height) / width) * CELL));
    const { data } = await sharp(src)
      .rotate()
      .flatten({ background: "#000" })
      .greyscale()
      .resize(COLS, rows, { fit: "fill", kernel: "lanczos3" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    grids[mediaKey(slug, file)] = {
      w: width,
      h: height,
      widths,
      cols: COLS,
      rows,
      cells: Array.from(structureLevels(data)).join(""),
    };
    console.log(
      `${slug}/${file}: ${width}×${height}, widths ${widths.join("+")}, grid ${COLS}×${rows}`,
    );
  }
  // Written as Prettier formats it, so `npm run format:check` stays green without a second step.
  const json = await format(JSON.stringify(grids), { parser: "json" });
  writeFileSync(join(stage, "media-grids.json"), json);

  // All rendered: replace what is published.
  for (const slug of new Set(SOURCES.map((s) => s.slug))) {
    rmSync(join(ROOT, "public", "media", slug), { recursive: true, force: true });
    cpSync(join(stage, "public", slug), join(ROOT, "public", "media", slug), { recursive: true });
  }
  cpSync(join(stage, "media-grids.json"), join(ROOT, "src", "data", "media-grids.json"));
} finally {
  rmSync(stage, { recursive: true, force: true });
}
