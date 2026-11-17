// In-app links: a real <a href> that the app handles itself on a plain click (no DOM, no
// React). A modified click (a new tab, a download, a new window) and any non-left button stay
// the browser's, so the address works as an address; the app's state (shell sessions, the egg,
// the selection) is kept by not letting the browser navigate for a plain one.

/** A plain left click: no button other than the main one, no modifier key. */
export const isPlainClick = (e) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;

/** An onClick for an <a href>: `go()` on a plain click (the browser's own navigation stops). */
export const inApp = (go) => (e) => {
  if (!isPlainClick(e)) return;
  e.preventDefault();
  go();
};
