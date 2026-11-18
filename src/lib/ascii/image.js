// ASCII for project media (pure: numbers in, strings out; no DOM, no canvas). An image becomes
// a grid of ramp indices 0..9 at build time (scripts/make-media.mjs, `structureLevels`), the
// grid is stored with the project's data, and at runtime `gridRows` fits it to a width. The
// reveal (which cells uncover the picture, and when) and the private placeholder's scramble
// are decided here too, so the component only draws them.
//
// The ramp is plain ASCII on purpose: it is all in IBM Plex Mono, so no fallback font
// changes a cell's width (the 0.6em advance the grid assumes).

// Blank first, then light to dense.
export const RAMP = " .:-=+*#%@";

// The structure map: a cell is inked by how far its grey level is from the image's median
// level, not by how bright it is. A flat or softly shaded background stays blank whether the
// image is light or dark, and text, edges and shapes show. (Brightness mapping turned a light
// screenshot into a wall of `@` and lost thin light text on black.)
const FLOOR = 14, // deviations (of 255) below this are noise: a soft gradient stays blank
  MIN_STRETCH = 48, // never stretch a near-flat image's tiny differences up to full ink
  PERCENTILE = 0.97, // the deviation that maps to the densest character
  GAMMA = 0.55; // lifts faint detail (thin text) towards visible

/** Grey levels (0..255, any array-like, row by row) → ramp indices 0..RAMP.length-1. */
export function structureLevels(grey) {
  const n = grey.length;
  const sorted = Array.from(grey).sort((a, b) => a - b);
  const med = sorted[n >> 1];
  const dev = Array.from(grey, (v) => Math.abs(v - med));
  const q = dev.slice().sort((a, b) => a - b)[Math.min(n - 1, Math.floor(n * PERCENTILE))];
  const top = Math.max(q, MIN_STRETCH);
  const last = RAMP.length - 1;
  return Uint8Array.from(dev, (d) => {
    if (d < FLOOR) return 0;
    const t = Math.min(1, d / top);
    return Math.min(last, Math.max(1, Math.floor(Math.pow(t, GAMMA) * RAMP.length)));
  });
}

/**
 * A stored grid `{ cols, rows, cells }` (`cells`: one digit per cell, row by row) fitted to
 * `cols` columns, as an array of row strings. Rows scale with columns, so the picture keeps its
 * shape (a cell is the same shape at every width). Going narrower takes the densest cell of
 * each block, so thin text survives; going wider repeats cells.
 */
export function gridRows(grid, cols) {
  const rows = Math.max(1, Math.round((grid.rows * cols) / grid.cols));
  const out = [];
  for (let r = 0; r < rows; r++) {
    const r0 = Math.floor((r * grid.rows) / rows),
      r1 = Math.max(r0 + 1, Math.ceil(((r + 1) * grid.rows) / rows));
    let line = "";
    for (let c = 0; c < cols; c++) {
      const c0 = Math.floor((c * grid.cols) / cols),
        c1 = Math.max(c0 + 1, Math.ceil(((c + 1) * grid.cols) / cols));
      let m = 0;
      for (let y = r0; y < Math.min(r1, grid.rows); y++)
        for (let x = c0; x < Math.min(c1, grid.cols); x++) {
          const v = +grid.cells[y * grid.cols + x];
          if (v > m) m = v;
        }
      line += RAMP[m];
    }
    out.push(line);
  }
  return out;
}

const lcg = (seed) => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

/** The order cells uncover the picture in: a seeded shuffle of 0..n-1 (the same every time). */
export function revealOrder(n, seed) {
  const rand = lcg(seed | 0),
    order = Uint32Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * How many of `n` cells are uncovered `elapsed` ms into a reveal of `ms` in `steps` equal steps
 * (stepped, no easing: nothing moves between steps; reduced motion uses 3 steps).
 */
export function revealCount(elapsed, { ms, steps }, n) {
  const step = Math.min(steps, Math.max(0, Math.floor(elapsed / (ms / steps))));
  return Math.round((step / steps) * n);
}

// The private placeholder: a block of junk that settles on this line.
export const LOCKED = "[ access denied: proprietary ]";
const JUNK = "#%@&$*+=:.01<>/\\|";

/** The placeholder block (w×h) at scramble `step` of `steps`: junk, then the locked message. */
export function scrambleFrame(step, steps, w, h, seed) {
  const rand = lcg(seed * 1009 + Math.min(step, steps) * 7919 + 1);
  const mid = Math.floor(h / 2),
    left = Math.max(0, Math.floor((w - LOCKED.length) / 2));
  const rows = [];
  for (let r = 0; r < h; r++) {
    if (step >= steps) {
      rows.push(r === mid ? (" ".repeat(left) + LOCKED).padEnd(w, " ") : " ".repeat(w));
      continue;
    }
    let line = "";
    for (let c = 0; c < w; c++) line += JUNK[Math.floor(rand() * JUNK.length)];
    rows.push(line);
  }
  return rows.join("\n");
}
