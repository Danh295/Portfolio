// How the page got where it is, for src/lib/reveal.js. <html data-jump> is "moving" while a
// jump (nav buttons, 1–4, h, j/k, the shell, a deep link, back from a project) scrolls,
// "landed" once it settles, and absent once the user scrolls or clicks (src/lib/nav.js:
// holdNav / its timeout / freeNav). JUMP_CHANGED fires on every change.

export const JUMP_CHANGED = "danny:jump";

/** "none" | "moving" | "landed" */
export const jumpState = () => document.documentElement.dataset.jump ?? "none";

/** Set the state (a no-op when unchanged); `notify: false` skips the event. */
export function setJump(state, notify = true) {
  if (jumpState() === state) return;
  const root = document.documentElement;
  if (state === "none") delete root.dataset.jump;
  else root.dataset.jump = state;
  if (notify) window.dispatchEvent(new Event(JUMP_CHANGED));
}
