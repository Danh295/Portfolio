// Where a full-screen app should sit on a phone, from what the browser reports (no DOM, so
// it's tested in node: test/viewportFrame.test.mjs). `useVisualViewportFrame` reads the
// browser and applies the result.
//
// What a real iPhone (Safari, iOS 26) does when the keyboard opens in terminal mode, from the
// phone's own telemetry: first `visualViewport.height` drops (695 -> 358) while
// `window.innerHeight` stays 695; then the layout viewport itself shrinks and the page
// scrolls (innerHeight 358, visualViewport.offsetTop 337). So `innerHeight - visualViewport
// .height` is 337 in step one and 0 in step two: it can't tell a keyboard from nothing. What
// stays true is the height the screen had before: a keyboard is up while something editable
// has focus AND the visible area is far shorter than the tallest height seen (Safari's own
// toolbar moving only changes it by ~110px; a keyboard by 200px or more).

/** How much shorter than the baseline (px) the visible area must be to be a keyboard. */
const KEYBOARD_MIN = 150;

/**
 * The tallest visible height seen in this orientation. Feed it every reading; a turn of the
 * phone starts it over.
 * @param {{ height: number, orientation: string } | null} prev
 * @param {{ innerHeight: number, vvHeight: number, orientation: string }} now
 */
export function nextBaseline(prev, { innerHeight, vvHeight, orientation }) {
  const seen = Math.max(innerHeight, vvHeight);
  if (!prev || prev.orientation !== orientation) return { height: seen, orientation };
  return { height: Math.max(prev.height, seen), orientation };
}

/**
 * @param {{ baselineHeight: number, vvHeight: number, vvOffsetTop: number, vvScale: number,
 *   editableFocused: boolean }} v
 * @returns {{ top: number, height: number, keyboard: boolean } | null}
 *   the visible area to fill (null while the page is pinch-zoomed: nothing to follow).
 */
export function frameFor({ baselineHeight, vvHeight, vvOffsetTop, vvScale, editableFocused }) {
  if (vvScale > 1.01) return null;
  return {
    top: Math.round(vvOffsetTop),
    height: Math.round(vvHeight),
    keyboard: editableFocused && baselineHeight - vvHeight > KEYBOARD_MIN,
  };
}
