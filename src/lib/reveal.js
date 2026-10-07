// When a section that hasn't typed in yet should start (src/lib/useTextFx.js measures the
// facts; this decides). The split is how the page got there, not the input device: any
// scroll the user makes (wheel, trackpad, touch, scrollbar, Space/PageDown) reveals a
// section the moment any of it shows, so nothing on screen sits blank; a jump in flight
// (nav buttons, 1–4, h, j/k, the shell; html[data-jump], src/lib/nav.js) reveals only its
// target, once its header is fully on screen, so the sections it flies past keep their
// type-in for when they're actually seen.

/**
 * `jumping`: a jump is in flight. `visible`: any of the section shows between the nav and
 * the bottom bar. `active`: it's the active section. `labelShown`: its header is fully on
 * screen. `focused`: keyboard focus is inside it (never leave focus on invisible text).
 */
export function shouldReveal({ jumping, visible, active, labelShown, focused }) {
  if (focused) return true;
  if (!jumping) return visible;
  return active && labelShown;
}
