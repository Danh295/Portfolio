// ASCII renderer for the rolling egg (see src/lib/egg/roll.js for the motion). Pure: a
// time in, a string out. The egg is drawn as a shaded solid of revolution turning about
// the view axis; the camera follows its centre of mass sideways, so the egg stays put
// while the ground scrolls back under it, at exactly the rate the shell rolls along it.
// The constants are tuned by eye, so change them only while looking at the output.

import { rollPose, eggCentre, eggWidth, eggWidthSlope } from "../egg/roll.js";

// A character cell is 0.6 as wide as it is tall (the font's advance).
const ASPECT = 0.6;
// The frame height this is tuned for: the upright egg just fits above the ground, with a
// few ground rows below. SCALE (rows per egg half-length) and GROUND (the first ground
// row) are fractions of it, so callers should pass ROLL_ROWS as H.
export const ROLL_ROWS = 28;
const SCALE = 0.375,
  GROUND = 0.857;

// Shading ramp, dark to light (never blank inside the egg, so it stays a solid shape).
const RAMP = ".:-=+*#%@";
const LIGHT = (() => {
  const v = [-0.45, 0.65, 0.75],
    n = Math.hypot(...v);
  return v.map((x) => x / n);
})();
// 2×2 samples per cell: partial coverage softens the silhouette.
const SUB = [0.25, 0.75];

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const mod = (a, n) => ((a % n) + n) % n;

/**
 * The frame at time `t` (seconds), `W` columns by `H` rows. The same `t` always gives the
 * same frame, so a fixed `t` (e.g. restTime()) is a still picture.
 */
export function rollArt(t, W, H) {
  const { theta, h, x } = rollPose(t),
    uc = eggCentre(),
    c = Math.cos(theta),
    s = Math.sin(theta);
  const ky = SCALE * H, // rows per unit
    kx = ky / ASPECT, // columns per unit
    gy = Math.round(GROUND * H), // first ground row
    cx = W / 2,
    scroll = Math.round(x * kx);
  const out = [];
  for (let r = 0; r < H; r++) {
    let line = "";
    for (let col = 0; col < W; col++) {
      if (r >= gy) {
        // Ground: marks fixed to it, so they move left as the egg rolls right.
        const k = r - gy,
          i = col + scroll;
        line +=
          k === 0
            ? mod(i, 12) === 0
              ? "+"
              : "="
            : k === 1
              ? hash(i, 1) < 0.16
                ? ":"
                : hash(i, 2) < 0.2
                  ? "."
                  : " "
              : k === 2 && hash(i, 3) < 0.1
                ? "."
                : " ";
        continue;
      }
      let hit = 0,
        lum = 0;
      for (const sy of SUB)
        for (const sx of SUB) {
          // World position relative to the centre of mass (x right, y up), then into
          // the egg's own frame (the body turns clockwise by theta).
          const wx = (col + sx - cx) / kx,
            wy = (gy - (r + sy)) / ky;
          if (wy < 0) continue;
          const dy = wy - h,
            bx = wx * c - dy * s,
            by = wx * s + dy * c,
            u = bx + uc;
          if (u <= -1 || u >= 1) continue;
          const w = eggWidth(u);
          if (Math.abs(by) >= w) continue;
          // Surface normal of the solid of revolution (body frame), turned to world.
          const z = Math.sqrt(w * w - by * by),
            nl = Math.hypot(eggWidthSlope(u), by, z),
            nbx = -eggWidthSlope(u) / nl,
            nby = by / nl,
            nz = z / nl,
            nx = nbx * c + nby * s,
            ny = -nbx * s + nby * c;
          const l = 0.2 + 0.8 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          hit++;
          lum += l;
        }
      if (!hit) {
        line += " ";
        continue;
      }
      // Gamma below 1 of the ramp (l^1.6) keeps the lit side from saturating at "@".
      const l = Math.pow((lum / hit) * (0.6 + 0.4 * (hit / 4)), 1.6);
      line += RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(l * RAMP.length)))];
    }
    out.push(line);
  }
  return out.join("\n");
}
