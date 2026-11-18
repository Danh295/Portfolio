// A project's media, resolved for drawing (pure: data in, plain objects out). `project.media` lists
// `{ file, alt, caption }` for a picture (`file` names what scripts/make-media.mjs built:
// public/media/<slug>/<file>-<width>.{avif,webp} and the cover grid in src/data/media-grids.json)
// or a single `{ private: "<why>" }` for a project that can't show anything (it gets the redacted
// placeholder). A name the build never made throws, so a typo fails the build instead of
// leaving a blank.

const TYPES = [
  ["image/avif", "avif"],
  ["image/webp", "webp"],
];

/** The key a picture goes by in media-grids.json and on the page: `<project slug>/<file>`. */
export const mediaKey = (slug, file) => `${slug}/${file}`;

/** `grids` is src/data/media-grids.json; `base` the site's basePath ("" in dev). */
export function mediaItems(project, grids, base) {
  return (project.media ?? []).map((m) => {
    if (m.private) return { kind: "private", caption: m.private };
    const key = mediaKey(project.slug, m.file),
      g = grids[key];
    if (!g) throw new Error(`no media grid for ${key} (run scripts/make-media.mjs)`);
    const url = (w, ext) => `${base}/media/${project.slug}/${m.file}-${w}.${ext}`;
    return {
      kind: "image",
      key,
      alt: m.alt,
      caption: m.caption,
      w: g.w,
      h: g.h,
      grid: { cols: g.cols, rows: g.rows, cells: g.cells },
      src: url(g.widths[g.widths.length - 1], "webp"),
      sources: TYPES.map(([type, ext]) => ({
        type,
        srcSet: g.widths.map((w) => `${url(w, ext)} ${w}w`).join(", "),
      })),
    };
  });
}
