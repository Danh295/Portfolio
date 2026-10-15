// How the egg block fits the visible area on a touch phone (terminal mode's inline ./egg).
// Pure, so it's tested in node (test/eggFit.test.mjs); the component reads the browser (the
// area's height, whether this is a touch phone) and applies the result.

/** The pot never shrinks below this share of its frame: smaller isn't playable. */
export const MIN_SCALE = 0.5;

/**
 * @param {{ areaPx: number, framePx: number, reservePx: number, touchPhone: boolean }} p
 *   `areaPx`: the height the block may take (the visible output area, less what lies under it); `framePx`: the pot frame's natural height;
 *   `reservePx`: what the block needs under the pot (status lines at their tallest, the
 *   buttons, gaps and padding), so the pot never resizes between stages.
 * @returns {{ fill: number, scale: number }} `fill`: the block's height (0 = leave it be);
 *   `scale`: the pot's scale, from MIN_SCALE to 1.
 */
export function eggFit({ areaPx, framePx, reservePx, touchPhone }) {
  if (!touchPhone || areaPx <= 0) return { fill: 0, scale: 1 };
  const scale = Math.max(MIN_SCALE, Math.min(1, (areaPx - reservePx) / framePx));
  return { fill: areaPx, scale };
}
