// The page lock (`html.locked`, globals.css): while a keyboard is up in the embedded shell, or in
// terminal mode, the body is `position: fixed`, so nothing but the app's own scroll boxes moves.
// A fixed body has no document scroll: `scrollY` reads 0 and the document is one screen tall.
// So the scroll position is kept here (and the body is shifted up by it, so the page doesn't
// jump behind the shell), put back on unlock, and a jump asked for while locked (the shell's
// `cd`, `./egg`) waits for the unlock and then scrolls from where the page is, with its target
// measured on the real, unlocked page. DOM-touching, so not with the pure libs.

let lockedY = null; // the scroll position to come back to; null while unlocked
const pending = [];

export const isPageLocked = () => document.documentElement.classList.contains("locked");

/** Lock or unlock the page. Idempotent. */
export function setPageLocked(on) {
  const root = document.documentElement;
  if (on === isPageLocked()) return;
  if (on) {
    lockedY = window.scrollY;
    root.classList.add("locked");
    document.body.style.top = -lockedY + "px";
    return;
  }
  root.classList.remove("locked");
  document.body.style.top = "";
  if (lockedY !== null) window.scrollTo({ top: lockedY, behavior: "instant" });
  lockedY = null;
  for (const fn of pending.splice(0)) fn();
}

/** Run `fn` now, or when the page is unlocked (and its scroll position restored). */
export function afterUnlock(fn) {
  if (isPageLocked()) pending.push(fn);
  else fn();
}
