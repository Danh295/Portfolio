// Navigation helpers for App.jsx (DOM): where the page's URL points, the scroll lock that
// keeps the scroll spy out of keyboard jumps, and quiet focus moves. The URLs themselves
// are pure, in src/lib/urls.js.

import { setJump } from "@/lib/jump";
import { parsePath } from "@/lib/urls";

export const parseLocation = () => parsePath(window.location.pathname, window.location.hash);

// Keyboard/programmatic navigation owns activeSec while its scroll is in flight.
// `hold` locks the scroll spy for `ms` (extended by each scroll event, so it lasts until
// the scroll settles); `free` hands control back at once (user wheel/touch/keys).
// Without it, the spy's "at the page bottom → last section" rule steals j/k when the
// last sections are shorter than the viewport.
// `target` is the scrollY a programmatic scroll is heading to, so a follow-up
// ensureVisible can measure against where the page will land, not where it is mid-flight.
// The lock also tells src/lib/jump.js how the page got here: a jump is "moving" while
// held, "landed" when the lock times out, and over ("none") once the user takes over.
export function holdNav(lock, ms, target) {
  lock.current.on = true;
  setJump("moving");
  if (target !== undefined) lock.current.target = target;
  clearTimeout(lock.current.t);
  lock.current.t = setTimeout(() => {
    lock.current.on = false;
    lock.current.target = null;
    setJump("landed");
  }, ms);
}

/** The user took over (wheel, touch, scroll keys, a click). `quiet`: no JUMP_CHANGED. */
export function freeNav(lock, quiet = false) {
  lock.current.on = false;
  lock.current.target = null;
  clearTimeout(lock.current.t);
  setJump("none", !quiet);
}

/** scrollY that parks `el` just under the nav (its scroll-margin-top), within page bounds. */
export function alignTarget(el) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0,
    max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - margin));
}

// Moves focus for screen readers without scrolling or a focus ring (keyboard users still
// see the inverted selection).
export const focusQuiet = (el) => el?.focus({ preventScroll: true, focusVisible: false });
