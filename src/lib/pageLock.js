// The page lock (`html.locked`, globals.css): while a keyboard is up in the embedded shell, or in
// terminal mode, the body is `position: fixed`, so nothing but the app's own scroll boxes moves.
// A fixed body has no document scroll: `scrollY` reads 0 and the document is one screen tall.
// So the scroll position is kept here and the body is shifted up by it (nothing jumps behind the
// shell); it is put back on unlock; and the page can still be moved while locked (the shell's
// `cd` and `./egg` scroll it behind the open shell): `pageScrollY`, `pageMaxScroll` and
// `scrollPageTo` are `scrollY`, the document's furthest scroll and `scrollTo` for a page that is
// either scrolled or locked. DOM-touching, so not with the pure libs.

let lockedY = null; // the scroll position the locked page is shifted to; null while unlocked
let lockedInner = 0; // the layout viewport's height when the lock began, before a keyboard shrank it

// Shift the locked page's body so the page shows scrolled to `y`.
function shiftTo(y) {
  lockedY = y;
  document.body.style.top = -y + "px";
}

const locked = () => lockedY !== null && document.documentElement.classList.contains("locked");

/** Lock or unlock the page. Idempotent. */
export function setPageLocked(on) {
  const root = document.documentElement;
  if (on === root.classList.contains("locked")) return;
  if (on) {
    // Read both before the class goes on: a fixed body makes `scrollY` read 0.
    const y = window.scrollY;
    lockedInner = window.innerHeight;
    root.classList.add("locked");
    shiftTo(y);
    return;
  }
  root.classList.remove("locked");
  document.body.style.top = "";
  if (lockedY !== null) window.scrollTo({ top: lockedY, behavior: "instant" });
  lockedY = null;
}

/** Where the page is scrolled to (a locked page: where it is shifted to). */
export const pageScrollY = () => (locked() ? lockedY : window.scrollY);

/** The furthest the page can scroll. A locked page measures against the screen as it was before
 *  the keyboard: iOS shrinks `innerHeight` itself once the keyboard is fully up. */
export const pageMaxScroll = () =>
  Math.max(
    0,
    locked()
      ? document.body.scrollHeight - Math.max(lockedInner, window.innerHeight)
      : document.documentElement.scrollHeight - window.innerHeight,
  );

/** Scroll the page to `top`; a locked page can't animate, so it just moves. */
export function scrollPageTo(top, behavior = "auto") {
  if (locked()) shiftTo(top);
  else window.scrollTo({ top, behavior });
}
