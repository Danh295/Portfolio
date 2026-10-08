// When a section that hasn't typed in yet should start (src/lib/useTextFx.js measures the
// facts; this decides). The split is how the page got there (src/lib/jump.js), not the
// input device:
// - "none": the user scrolled (wheel, trackpad, touch, scrollbar, Space/PageDown) or
//   clicked. A section starts once enough of it shows (REVEAL_PX in useTextFx), so
//   nothing on screen sits blank for long and the type-in happens where it's seen.
// - "moving" / "landed": a jump (nav buttons, 1–4, h, j/k, the shell) is scrolling, or has
//   settled. Only its target (the active section) starts, the moment its header is fully
//   on screen, mid-scroll included, so arriving never waits on the jump to settle. Once
//   landed, enough of it showing also counts (layout moved under the jump and left its
//   header under the nav). The sections it flies past, and one peeking below it, wait to
//   be selected or scrolled to.
// Focus moving into a waiting section (Tab, a click, a script) starts it at once, so a
// focused element is never invisible text.

/**
 * `jump`: "none" | "moving" | "landed". `visible`: enough of the section shows between the
 * nav and the bottom bar. `active`: it's the active section. `labelShown`: its header is
 * fully on screen. `focused`: focus is inside it.
 */
export function shouldStart({ jump, visible, active, labelShown, focused }) {
  if (focused) return true;
  if (jump === "none") return visible;
  if (!active) return false;
  return labelShown || (jump === "landed" && visible);
}
