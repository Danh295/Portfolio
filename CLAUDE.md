# Project Instructions

Personal portfolio site for Danny Hu. Next.js 16 (App Router) + React 19, JavaScript (no TypeScript), CSS Modules, static-exported to GitHub Pages at `/Portfolio/`.

## Architecture

**v4 design: terminal-style, one client app.** `src/app/page.js` renders `src/components/App.jsx`, the single `"use client"` root that holds all UI state (theme, gui/terminal mode, project filter/selection, open project, experience accordion, shell sessions, vim, help). The design reference lives in `design_handoff_portfolio_v4/` (README + prototype HTML); it is ignored by eslint and prettier.

- **GUI mode**: `Header`, four `SectionFrame`s (`#home` hero + egg, `#projects`, `#experience`, `#skills`), `BottomBar`. Open project = `ProjectDetail` (state, mirrored to `#projects/<slug>` via `history.pushState`; `popstate` restores it).
- **Keyboard model**: each section's header is its first stop and the only thing with the blinking cursor; j/k then move through its elements (hero: `more…`, the egg; work/experience: rows), which show as inverted with no cursor. ←/→ move like k/j on the main page (on a project page they step between projects). Enter or Space activates the selected element (Space scrolls when nothing is selected); `m` opens more…. Every activation, by mouse or key (including shortcuts with a visible `data-key` button), flashes the element via `src/lib/pressFx.js`. The egg is played only through its buttons (the centre start box, then one button under the pot that the "start!" callout turns into); clicking the pot itself only pans.
- **Section headers** (`src/lib/useTextFx.js`, trigger `"active"`) are blank until their section is first active _and_ the header is on screen, then type once per page load. A header counts as played as soon as it starts and always runs to the end, so it never replays. Everything else in the frame types in with it (`SectionFrame` + `src/lib/typeIn.js`, which blanks text nodes to same-width spaces before first paint).
- **Terminal Enter**: a focused button or link handles its own Enter (e.g. `[exit] back to gui`, links from `cat contact.vcf`); otherwise Enter runs the prompt. In the gui, typing while the embedded shell is open but unfocused goes back to its prompt instead of firing shortcuts.
- **Section jumps** park frames at `--nav-offset` = the measured nav height (`--nav-h`, App.jsx) + 26px; section labels are `<h2>`s that name their `<section>`.
- **Keyboard mode** (`html.kbd`, set by any keypress, cleared by a real mouse move or any click) pauses hover styling: every `:hover` rule is written as `html:not(.kbd) … :hover` (`:global(...)` in modules). Don't use `pointer-events: none` for this; it swallows clicks.
- **Cursor** (`components/overlay/Cursor.jsx`): one state machine (arrow/pointer/text/busy/pan), two sets: square blocks in gui mode that morph between shapes with a short ease-out (~0.14s, no trailing; difference-blended; the pointer square and the pan outline spin steadily, the pan one round a fixed centre dot), the retro pixel glyphs in terminal mode.
- **Terminal mode** (`./app --mode terminal`): `components/shell/Terminal.jsx` + `Vim.jsx`. The embedded shell (`` ` `` key) is `MiniShell.jsx`. Both render output with `TermLines.jsx`.
- **Egg minigame**: `components/egg/useEggGame.js` runs one rAF loop that draws into the hero `<pre>` or the terminal's inline one. Per-frame state stays in refs, never React state; only stage/result/stats are state. During a round (stages 1–4) the game logic runs every frame whether or not the pot is on screen (only the raster is skipped); at rest (stage 0 or 5) the loop idles while the pot is off screen or the tab hidden, or once a reduced-motion frame is painted, and any scroll, resize, key, pointer, popstate, stage or mode change wakes it. Every per-frame step is scaled by elapsed time, so speed doesn't depend on the display's refresh rate. The character grid (resolution) comes from `ui.eggFontPx` via `src/lib/egg/grid.js`; smaller font = more cells in the same frame.
- `src/app/{projects,experience,skills}/page.js` are client redirect stubs to the matching anchor (static export has no server redirects).
- **404**: `src/app/not-found.js` → `components/notfound/NotFound.jsx`, which the static export writes to `404.html` (GitHub Pages serves it for every unknown URL, so the shown path comes from `window.location`, not props: basePath stripped and decoded, `~/café`). It prints a failed `cd` in the shell's voice over `RollingEgg`: one egg rolling right forever, the ground scrolling back under it (physics in `src/lib/egg/roll.js`, frames from `src/lib/ascii/roll.js`). One still frame under reduced motion. Enter goes home.

**Pure libs (no DOM):**

- `src/lib/ascii/egg.js` — `potArt` renderer + confetti. Ported verbatim from the prototype; tune only while looking at output.
- `src/lib/ascii/banner.js` — ANSI Shadow "DANNY HU".
- `src/lib/shell/{fs,spec,exec}.js` — virtual FS, `SPEC` table, `createShell(data)` → `{ exec, runLine, complete }`. Takes content as an argument (no `@/` imports), so it runs under plain node. `src/lib/shell/index.js` wires in the real data.
- `src/lib/vim.js` — terminal-mode vim as a pure state machine (`openBuffer`, `vimKey(state, key, ctrl)` → next state + effects): normal/visual/visual-line/command-line/search modes, motions, `d`/`y` operators, registers, put, undo/redo. Edits stay in memory.
- `src/lib/format.js` (`pad`, `lc`, `joinParagraphs`), `src/lib/useStickToBottom.js` (both shells pin output to the latest prompt).
- **GitHub data is build-time only.** `scripts/sync-github.mjs` runs as `prebuild` / `predev` and writes `src/data/github.generated.json` (gitignored): repo metadata for every GitHub link in `projects.js` plus 12 weeks of activity. `src/lib/github.js` reads it (`spark`, `repoFor`, `syncedAt`). Visitors never call the GitHub API; the sync never fails the build and keeps the previous snapshot on errors.
- `src/lib/egg/paint.js` (DOM helper: writes a `potArt`/`rollArt` frame into a `<pre>` plus colour layers; used by the minigame and the 404), `src/lib/egg/roll.js` (rolling-egg physics: a solid egg rolling without slipping or energy loss; energy gives ω(θ), one integration gives a time table, runtime is a lookup, so the ends dwell longer than the sides), `src/lib/ascii/roll.js` (its renderer, time in → string out), `src/lib/egg/game.js` (clock, grading, stats), `src/lib/egg/counter.js` (abacus counter + localStorage fallback), `src/lib/github.js` (reads the build-time snapshot: `spark`, `repoFor`, `syncedAt`, date formatting; no runtime API calls), `src/lib/skills.js` (share-of-projects bars).

**Static export.** `next.config.mjs` sets `output: "export"`, `images.unoptimized: true`, and `basePath: "/Portfolio"` in production. No server runtime. For asset URLs use `src/config/site.js` (`site.resume` already includes `basePath`).

## Conventions

- **Path alias**: `@/*` → `src/*` (see `jsconfig.json`).
- **Styling**: CSS Modules per component. Five theme tokens (`--bg --fg --mid --line --soft`) in `src/app/globals.css`, switched by `<html data-theme>` via `src/lib/useTheme.js`; default is dark (ink). Radius 0, no shadows except the shell/help overlays. Font is IBM Plex Mono, self-hosted from `src/app/fonts/plex/` via `next/font/local` (`--font-plex`), with JetBrains Mono Regular as a per-glyph fallback for the few symbols Plex lacks (■ □ ●); both have a 0.6em advance, which the ASCII art and egg grid assume. `--mono` is the stack. Two weights only: 400 and 500 (headings); there is no bold, and `font-synthesis: none` stops the browser faking one. Don't use Google-hosted fonts: their subsets drop the box-drawing/block glyphs (U+2500–259F). Plex has no ↵ or ★, so use ↲ for Enter. **Casing is stored exactly as displayed** (no `text-transform`, no JS case changes), so the gui and terminal always match: the site's voice is lowercase, including Danny's name, his own project names, job titles, dates and locations ("waterloo, on"); external entities keep their normal casing (companies, schools, events, products and tech: IESO, City of Waterloo, UofTHacks, GitHub, Next.js) as do acronyms (OCR, AI, BBA, UTC).
- **Lint rules**: eslint-config-next 16 enables the React Compiler hook rules (`refs`, `set-state-in-effect`, `immutability`, `purity`). Pass refs as top-level `*Ref` props (not nested in objects), and set state from callbacks, not synchronously in effect bodies.
- **Data**: All content is hand-authored in `src/data/` (`projects.js`, `experience.js`, `home.js`, `egg.js`) and `src/config/` (`site.js`, `ui.js` for design options + shortcuts). There is no CMS.
- **Skills**: `coreTechStack` in `src/data/home.js`. A skill's bar = share of projects whose `tags` include it (exact or prefix word). Skills used by no project show `coursework`; list the courses in that item's `courses` array.
- **Reduced motion**: `src/lib/useReducedMotion.js` is the source of truth. It skips the intro and heading effects and freezes the egg orbit.

## Commands

```
npm run dev           # local dev server
npm run lint          # eslint .
npm run format        # prettier --write .
npm run format:check  # prettier --check . (runs in CI)
npm run build         # next build → out/
npm run sync          # refresh the build-time GitHub snapshot
npm run deploy        # publish out/ to gh-pages
```

CI (`.github/workflows/ci.yml`) runs `lint`, `format:check` and `build` on push/PR to `main`. `.github/workflows/deploy.yml` builds and publishes `out/` to `gh-pages` daily (refreshing the GitHub snapshot) and on manual dispatch; `npm run deploy` still works for manual deploys.

**Pages must serve the `gh-pages` branch (root), not `main`.** With Pages pointed at `main`, GitHub builds the repo source with Jekyll and serves a stub "Portfolio" page instead of the site. The site is live only after (1) Settings → Pages → Source = branch `gh-pages` / root, and (2) the Deploy workflow has run at least once (Actions → Deploy → Run workflow) or `npm run deploy` has been run.

## Git Commits

- Never include a `Co-Authored-By` line in commit messages. Do not credit Claude or any AI as a co-author.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
