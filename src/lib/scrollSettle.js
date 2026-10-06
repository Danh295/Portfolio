// Section settle, the pure part (src/lib/useSectionSettle.js measures the page and moves
// it). Scrolling is free inside a section; when a scroll stops with a section boundary on
// screen, the page settles in the direction it was going: past one section's end onto the
// next header, or back up onto the previous section's end.

/** px a scroll must travel into a gap before it commits to the section beyond. */
export const DEAD_ZONE = 40;

/**
 * Where to settle a scroll that stopped at `y`, moving `dir` (1 down, -1 up, 0 unknown).
 * `rests` are each section's free scrollY range [lo, hi], in order: lo parks its header
 * under the nav, hi shows its end at the bottom of the screen (= lo when it fits; the last
 * section's hi is Infinity). Returns a scrollY, or null to leave the page where it is.
 */
export function settleTarget({ y, dir, rests, dead = DEAD_ZONE }) {
  if (rests.some(([lo, hi]) => y >= lo - 1 && y <= hi + 1)) return null;
  for (let i = 0; i < rests.length - 1; i++) {
    const top = rests[i][1],
      bottom = rests[i + 1][0];
    if (y < top || y > bottom) continue;
    if (bottom <= top) return null;
    if (dir > 0) return y - top >= dead ? bottom : top;
    if (dir < 0) return bottom - y >= dead ? top : bottom;
    return y - top <= bottom - y ? top : bottom;
  }
  return null;
}

/** ms for a settle over `distance` px: short and decisive, longer for longer moves. */
export const settleDuration = (distance) => Math.min(300, Math.max(160, 140 + distance * 0.3));

/** Cubic ease-out: starts at speed, lands without overshoot. */
export const easeOut = (t) => 1 - (1 - t) ** 3;
