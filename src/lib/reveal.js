// When a section that hasn't typed in yet should start (src/lib/useTextFx.js measures the
// facts; this decides). The split is how the page got there (src/lib/jump.js), not the
// input device:
// - "none": the user scrolled (wheel, trackpad, touch, scrollbar, Space/PageDown) or
//   clicked. A section starts once enough of it shows (REVEAL_PX in useTextFx), so
//   nothing on screen sits blank for long and the type-in happens where it's seen.
// - "moving": a jump (nav buttons, 1–4, h, j/k, the shell) is scrolling. Nothing starts,
//   so the target types in once it's parked and the sections it flies past keep theirs.
// - "landed": the jump has settled. Only the active section starts, once its header is
//   fully on screen; a section peeking below it waits to be selected or scrolled to.
// Focus moving into a waiting section (Tab, a click, a script) starts it at once, so a
// focused element is never invisible text.

/**
 * `jump`: "none" | "moving" | "landed". `visible`: enough of the section shows between the
 * nav and the bottom bar. `active`: it's the active section. `labelShown`: its header is
 * fully on screen. `focused`: focus is inside it.
 */
export function shouldReveal({ jump, visible, active, labelShown, focused }) {
  if (focused) return true;
  if (jump === "none") return visible;
  if (jump === "moving") return false;
  return active && labelShown;
}
