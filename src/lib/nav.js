// Navigation helpers for App.jsx (DOM): where the page's URL points, the scroll lock that
// keeps the scroll spy out of keyboard jumps, and quiet focus moves. The URLs themselves
// are pure, in src/lib/urls.js.

import { setJump } from "@/lib/jump";
import { parsePath } from "@/lib/urls";
import { pageMaxScroll, pageScrollY, scrollPageTo } from "@/lib/pageLock";

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
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return Math.max(
    0,
    Math.min(pageMaxScroll(), el.getBoundingClientRect().top + pageScrollY() - margin),
  );
}

/**
 * For a moment after a scroll parks `el` (alignTarget), keep it parked. The page above it can
 * still settle after it lands (measured on a loaded machine: the hero grew 40px and went back),
 * and the browser's scroll anchoring answers the growth by moving the scroll the same way but
 * not the shrink, which leaves `el` off by the difference. So while the page or the section
 * around `el` changes size, and on a short ladder of timers, `el` is re-parked, until the
 * visitor scrolls or presses something (an event that began before the park doesn't count: the
 * key press that asked for it can still be on its way to `window`) or `ms` pass.
 * `smooth`: the park is a smooth scroll in flight, left alone for its first 500ms so the first
 * re-park doesn't cut it short. Returns a function that stops it (call it before a new park).
 */
export function keepAligned(el, { smooth = false, ms = 1500 } = {}) {
  const parkedAt = performance.now();
  const quietUntil = smooth ? parkedAt + 500 : 0;
  const repark = () => {
    if (performance.now() < quietUntil) return;
    const want = alignTarget(el);
    if (Math.abs(pageScrollY() - want) > 1) scrollPageTo(want);
  };
  const ro = new ResizeObserver(repark);
  const frame = el.closest("[data-sec]");
  if (frame) ro.observe(frame);
  ro.observe(document.body);
  const timers = [150, 400, 600, 800, 1200].map((t) => setTimeout(repark, t));
  const USER = ["wheel", "touchstart", "pointerdown", "keydown"];
  const stop = () => {
    ro.disconnect();
    timers.forEach(clearTimeout);
    clearTimeout(end);
    for (const ev of USER) window.removeEventListener(ev, takeover);
  };
  const takeover = (e) => {
    if (e.timeStamp > parkedAt) stop();
  };
  const end = setTimeout(stop, ms);
  for (const ev of USER) window.addEventListener(ev, takeover, { passive: true });
  return stop;
}

// Moves focus for screen readers without scrolling or a focus ring (keyboard users still
// see the inverted selection).
export const focusQuiet = (el) => el?.focus({ preventScroll: true, focusVisible: false });
