// Press feedback for buttons, shared by mouse and keyboard activation: the element
// flips its colours (invert filter, as the palette's --bg/--fg are near-inverses) and
// drops 1px for a beat, then snaps back (globals.css, [data-pressed]).
// Elements with no background of their own get --bg painted in for the flash, so plain
// text buttons flip to the "selected" look and selected ones flip back to plain.

const MS = 160;
const timers = new WeakMap();

/** Flash `el` (no-op for null). Re-triggering restarts it. */
export function pressFx(el) {
  if (!el || !(el instanceof Element)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  clearTimeout(timers.get(el));
  el.removeAttribute("data-pressed");
  const bg = getComputedStyle(el).backgroundColor;
  const plain = bg === "transparent" || bg === "rgba(0, 0, 0, 0)";
  void el.offsetWidth; // restart the animation
  el.setAttribute("data-pressed", plain ? "plain" : "solid");
  timers.set(
    el,
    setTimeout(() => el.removeAttribute("data-pressed"), MS),
  );
}

/** What a pointer press on `target` should flash: the clickable element it's in. */
export const PRESSABLE = 'a, button:not(:disabled), summary, [role="button"], [data-clickable]';
