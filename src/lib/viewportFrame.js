// Where a full-screen app should sit on a phone, from what the browser reports (no DOM, so
// it's tested in node: test/viewportFrame.test.mjs). `useVisualViewportFrame` reads the
// browser and applies the result.
//
// iOS reports `window.innerHeight` and `visualViewport` at different moments (Safari's
// toolbar collapsing, a keyboard opening or closing), so the size difference alone isn't a
// keyboard: a keyboard is up only while something editable has focus AND the visible area
// is much shorter than the window. A real iPhone in terminal mode with the keyboard up:
// innerHeight 695, visualViewport.height 358, offsetTop 0.

/** The size difference (px) that counts as a keyboard rather than a toolbar moving. */
const KEYBOARD_MIN = 80;

/**
 * @param {{ innerHeight: number, vvHeight: number, vvOffsetTop: number, vvScale: number,
 *   editableFocused: boolean }} v
 * @returns {{ top: number, height: number, keyboard: boolean } | null}
 *   the visible area to fill (null while the page is pinch-zoomed: nothing to follow).
 */
export function frameFor({ innerHeight, vvHeight, vvOffsetTop, vvScale, editableFocused }) {
  if (vvScale > 1.01) return null;
  return {
    top: Math.round(vvOffsetTop),
    height: Math.round(vvHeight),
    keyboard: editableFocused && innerHeight - vvHeight - vvOffsetTop > KEYBOARD_MIN,
  };
}
