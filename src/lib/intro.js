// Once-per-session intro. The decision is made on first call (client only) and
// cached, so the intro overlay and the heading effects agree on the delay.

const KEY = "danny-intro";

// Boot intro timing: one log line per LINE_MS, then a 24-cell progress bar at CELL_MS a
// cell, a short hold, then the page is revealed line by line over REVEAL_MS.
export const BOOT = {
  LINE_MS: 240,
  LINES: 7,
  CELL_MS: 60,
  CELLS: 24,
  HOLD_MS: 250,
  REVEAL_MS: 1100,
};
export const BOOT_END_MS = BOOT.LINE_MS * BOOT.LINES + BOOT.CELL_MS * BOOT.CELLS + BOOT.HOLD_MS;
let plan = null;

/**
 * Returns { fx: "boot" | "wipe" | "none", delay: ms before load headings start, at }.
 * `at` is when the plan was made; use introWait() for the delay still outstanding.
 */
export function introPlan(fx, reduce) {
  if (plan) return plan;
  let seen = false;
  try {
    seen = sessionStorage.getItem(KEY) === "1";
  } catch {
    // storage blocked: treat as unseen
  }
  // Query the media directly: during hydration useReducedMotion still reports the
  // server value (false), and this plan is cached on first call.
  const still = reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fx === "none" || still || seen) {
    plan = { fx: "none", delay: 0, at: performance.now() };
    return plan;
  }
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
  // Load headings start typing once the boot screen has gone.
  plan = { fx, delay: fx === "boot" ? BOOT_END_MS + 250 : 700, at: performance.now() };
  return plan;
}

/** Milliseconds left before the intro is over (0 once it has played, e.g. on remounts). */
export function introWait(fx, reduce) {
  const p = introPlan(fx, reduce);
  return Math.max(0, p.at + p.delay - performance.now());
}

// The intro is over (played out or skipped by a click): introWait() is 0 from now on,
// and anything waiting on it (the hero heading) hears "danny:intro-end".
export const INTRO_END = "danny:intro-end";
export function endIntro() {
  if (plan) plan.delay = Math.max(0, performance.now() - plan.at);
  window.dispatchEvent(new Event(INTRO_END));
}
