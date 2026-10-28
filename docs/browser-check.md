# The browser check

Read before adding or changing a case in scripts/browser-check.mjs. Moved from CLAUDE.md unchanged, then extended.

**Browser check** (`scripts/browser-check.mjs`, `npm run check:browser`, local only, not in `pages.yml`): serves `out/` at `/Portfolio/` (unknown paths get `404.html`, like Pages) and drives headless Chrome over the DevTools protocol, no dependencies (`CHROME=` picks another binary). It pins what node tests can't: when sections type in (scrolling down and up, the 120px offset, keyboard jumps starting their target at once, sections passed or peeking below a jump waiting, Tab, the shell's `cd`, a wrapped nav at 400px, a phone jump, the phone's one-row bars and menu at 390/360/320), no key labels on a touch screen (and the 16px prompt) and key labels on desktop, the intro (the reveal, Enter skipping it, scrolling during it), a smoke run (project open and back, theme, keys popup, terminal mode, deep link, 404, egg), the skills rows at 390/360/320 and their used-in line on touch, the resume page (the toolbar's layout, Esc and `cd ~` closing a tab the app opened or going home, the opener kept for the app's own tab, every page of the file drawn with ink, text layer, the file's link on top, download, zoom steps, fit, shortcuts off, fitted at 390/320, re-fit on rotation, a pinch on the page zooming the PDF while one in the toolbar is still the browser's, double-tap, Ctrl+wheel, 44px taps, key and touch flash, print through a frame or a tab) and reduced motion; any console error fails it. Each case gets a fresh tab (a hash-only navigation doesn't reload the page).

## Writing a case

- `tab.go(path)` loads `path` fresh, even when only the hash differs (it leaves for `about:blank` first); `tab.hash(path)` is the in-page navigation, when that is what the case tests.
- The browser profile is shared, so `run()` clears the site's local and session storage before each case: a case that sets a preference (shortcuts off, the egg counter) can't leak it into the next.
- `tab.key("Enter")` sends the key with its text (`"\r"`): without it Chrome doesn't turn a press on a focused button into a click. The key table (`KEY`) lists the keys a case can press; add an entry before using a new one.
- `CHROME=` picks the binary; on macOS it falls back to Chrome, then Brave. The script closes its browser on exit and on Ctrl-C.
- A full run takes several minutes: run it in the background, and use `ONLY=` while working on one case.
