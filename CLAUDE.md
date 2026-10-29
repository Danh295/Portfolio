# Project Instructions

Personal portfolio site for Danny Hu. Next.js 16 (App Router) + React 19, JavaScript (no TypeScript), CSS Modules, static-exported to GitHub Pages at `/Portfolio/`.

## Architecture

**v4 design: terminal-style, one client app.** `src/app/page.js` renders `src/components/App.jsx`, the single `"use client"` root that holds all UI state (theme, gui/terminal mode, project filter/selection, open project, experience accordion, vim, help; the shell sessions live in `useShell`). The design reference lives in `design_handoff_portfolio_v4/` (README + prototype HTML); it is ignored by eslint and prettier.

- `App.jsx` is the only place UI state lives; it builds its big JSX pieces up front (see React Compiler below).
- Decisions are pure libs in `src/lib/`, each with a test in `test/`: add behaviour there first. Every keydown goes `keyFacts` → `routeKey` (`src/lib/keyRouter.js`) → `applyKey`, which carries a decision out with no conditions of its own.
- Content lives in `src/data/` and `src/config/`. Each project is a real page (`/Portfolio/projects/<slug>/`); sections are hashes on the home page.
- **No scroll snap**: page scrolling is native; only section jumps (nav, `1`–`4`, `h`, j/k) land exactly. Don't reintroduce snapping (the measurements are in `docs/gui.md`).

- **Keyboard mode** (`html.kbd`, set by any keypress, cleared by a real mouse move or any click) pauses hover styling: every `:hover` rule is written as `html:not(.kbd) … :hover` (`:global(...)` in modules). Don't use `pointer-events: none` for this; it swallows clicks.

### Reference docs

Read the one that matches before changing that area; they hold the reasons, measurements and gotchas.

- `docs/keyboard.md`: keys, shortcuts-off, the j/k selection, focus, popups, accessibility.
- `docs/gui.md`: phone bars and hero, project pages and history, section jumps, header type-in, the cursor, App.jsx helpers.
- `docs/terminal.md`: terminal mode, the embedded shell, the phone keyboard.
- `docs/egg.md`: the minigame, on a phone, in the terminal.
- `docs/pages.md`: redirect stubs, the 404, the resume viewer.
- `docs/skills.md`: skill bars and the skill panel.
- `docs/libs.md`: which pure lib owns what (pure libs stay free of DOM and React).
- `docs/browser-check.md`: what each browser-check case pins, and how to write one.
- `docs/known-gaps.md`: things left on purpose.

**Static export.** `next.config.mjs` sets `output: "export"`, `images.unoptimized: true`, and `basePath: "/Portfolio"` in production. No server runtime. For asset URLs use `src/config/site.js` (`site.resume` already includes `basePath`).

## Conventions

- **Path alias**: `@/*` → `src/*` (see `jsconfig.json`).
- **Styling**: CSS Modules per component. Five theme tokens (`--bg --fg --mid --line --soft`) in `src/app/globals.css`, switched by `<html data-theme>` via `src/lib/useTheme.js`; default is dark (ink). Radius 0, no shadows except the embedded shell and the popups. Font is IBM Plex Mono, self-hosted from `src/app/fonts/plex/` via `next/font/local` (`--font-plex`), with JetBrains Mono Regular as a per-glyph fallback for the few symbols Plex lacks (■ □ ●); both have a 0.6em advance, which the ASCII art and egg grid assume. `--mono` is the stack. Two weights only: 400 and 500 (headings); there is no bold, and `font-synthesis: none` stops the browser faking one. Don't use Google-hosted fonts: their subsets drop the box-drawing/block glyphs (U+2500–259F). Plex has no ↵ or ★, so use ↲ for Enter. **Casing is stored exactly as displayed** (no `text-transform`, no JS case changes), so the gui and terminal always match: the site's voice is lowercase, including Danny's name, his own project names, job titles, dates and locations ("waterloo, on"); external entities keep their normal casing (companies, schools, events, products and tech: IESO, City of Waterloo, UofTHacks, GitHub, Next.js) as do acronyms (OCR, AI, BBA, UTC).
- **React Compiler is on** (`reactCompiler: true` in `next.config.mjs`, `babel-plugin-react-compiler`): it memoizes components, hooks and JSX at build time, so an embedded-shell keystroke re-renders only the shell (measured). Keep it effective: build big JSX pieces outside conditionals (App.jsx builds `header`, `hero`, `projectList`… up front; `ProjectDetail` and `Terminal` stay inline because each is a single element that depends on `view`/`mode`), don't read the clock or other impure values during render, and never add an `eslint-disable` for a react-hooks rule (the compiler then skips that whole component or hook).
- **Lint rules**: eslint-config-next 16 enables the React Compiler hook rules (`refs`, `set-state-in-effect`, `immutability`, `purity`). `no-undef` is on too (`eslint.config.mjs`; Next's config leaves it off), so a name a rename left behind fails lint. Pass refs as top-level `*Ref` props (not nested in objects), and set state from callbacks, not synchronously in effect bodies. **ESLint 10 runs with two workarounds in `eslint.config.mjs`** because `eslint-config-next` 16.3.8 and its plugins (`eslint-plugin-react` 7.37.5, `import` 2.32.0, `jsx-a11y` 6.10.2) don't declare ESLint 10 support yet: JS/JSX files use ESLint's own parser (`espree`, a direct devDependency) because Next's bundled Babel parser crashes on ESLint 10, and `settings.react.version` is pinned because `eslint-plugin-react` autodetects it through `context.getFilename()`, which ESLint 10 removed. Remove both once those packages release ESLint 10 support (check `npm view eslint-config-next peerDependencies` and the plugins' peer ranges); a plugin that starts calling another removed API fails loudly (a crash on lint), not silently.
- **Current role**: an experience entry's `now` (the `● now` badge) is derived from its `date` against the build date (`BUILD_DATE`, `env` in `next.config.mjs`), and the hero/whoami `working` fact shows only while its `org` has a current role, so the daily deploy retires both the day after a term ends.
- **Data**: All content is hand-authored in `src/data/` (`projects.js`, `experience.js`, `home.js`, `egg.js`) and `src/config/` (`site.js`, `ui.js` for design options + shortcuts). There is no CMS.
- **Reduced motion** (`CONTEXT.md`): reduce, don't remove. `src/lib/useReducedMotion.js` reads the OS preference, and only what moves across the screen honours it: jumps are instant (`App.jsx` `smooth`), no view fade, no intro reveal sweep (the page is uncovered at once), no cursor morph/spin (`Cursor.module.css`), and the 404 egg holds one still frame. Everything else plays as usual: type-ins (only `ui.headerFx: "none"` turns them off), the intro's boot log, blinking carets, shell auto-typing, the press flash and the egg (a Windows PC with Animation effects off showed a frozen, "stuck" site before). `npm run check:browser` pins both lists.

## Commands

```
npm run dev           # local dev server
npm run lint          # eslint . (fails on any warning)
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm test              # node:test suites in test/ (pure libs + data checks)
npm run build         # next build → out/
npm run sync          # refresh the build-time GitHub snapshot
npm run check:browser # drive out/ in headless Chrome (after npm run build; ONLY=<case> runs one)
```

**Deploys.** `.github/workflows/pages.yml` runs `lint`, `format:check`, `test`, the GitHub sync and `next build` and deploys `out/` with GitHub's Pages artifact actions on every push to `main`, daily at 09:17 UTC (refreshing the GitHub snapshot; the previous snapshot is restored from the actions cache first, so an API failure keeps the last good data) and on `gh workflow run pages.yml`. Settings → Pages → Source must be **GitHub Actions**. A red check on `main` means nothing was deployed. There are no pull-request checks. Every `uses:` line is pinned to a commit SHA with a `# vX.Y.Z` comment, checkout doesn't persist credentials, both jobs have a timeout, and only the `npm run sync` step gets `GITHUB_TOKEN` (the build runs `npx next build`, since `npm run build` would rerun the sync through `prebuild` without the token). `.github/dependabot.yml` opens weekly PRs for the `github-actions` ecosystem only, to move those pins; there is no npm entry, so npm bumps stay by hand (see the lockfile rule below). `main` has a ruleset that blocks force-push and deletion (switch it off in Settings → Rules before rewriting history), and Dependabot alerts are on (no security-update PRs; dismiss the dev-only `zod` alert as not used). GitHub disables scheduled workflows after 60 days with no repo activity, which would silently stop the daily deploy (and the `● now` retirement it drives); `gh workflow enable pages.yml` turns it back on. Node version: `.nvmrc`.

**Tests** (`test/*.test.mjs`) import the app's modules unchanged through `test/hooks.mjs`, which resolves `@/` and extensionless imports like Next does and loads `src/**/*.js` as ESM. Keep the pure libs free of DOM and React so they stay testable. What reads the page or browser storage (the intro plan, the reveal, when sections type in, reduced motion) is pinned by the browser check instead.

**Browser check** (`scripts/browser-check.mjs`, `npm run check:browser`, local only, not in `pages.yml`): serves `out/` at `/Portfolio/` and drives headless Chrome or Brave over the DevTools protocol, no dependencies (`CHROME=` picks another binary). Build first. It takes several minutes: run it in the background. `ONLY=<part of a case title>` runs matching cases. Each case gets a fresh tab and empty local and session storage, `tab.go` always loads fresh (`tab.hash` is the in-page navigation), and any console error fails it. What it pins and how to write a case: `docs/browser-check.md`.

**Lockfile:** write it only with CI's npm (`npx npm@11.19.0 install --package-lock-only`). A local `npm install`/`npm prune` with another npm version drops the `@emnapi/*` entries and `npm ci` then fails in CI.

## Known gaps

Open work is tracked in `TODO.MD` (local). The code-level gaps left on purpose (the egg's fixed heights, `keyFacts` reading the egg's rect, an iPad with a keyboard counting as touch, the resume page's pinch and print) are in `docs/known-gaps.md`.

## Git Commits

- Commit and push straight to `main`; no branches or PRs (personal project). Run `lint`, `format:check`, `test` and `build` first, plus `npm run check:browser` for UI changes.
- Never include a `Co-Authored-By` line in commit messages. Do not credit Claude or any AI as a co-author.
- Before pushing, run `git log origin/main..HEAD --oneline` and tell Danny about every commit going out that you didn't make this session.
- Commit trailers come from the Claude Code `attribution` setting (empty in Danny's user settings); don't add any by hand.

## Agent skills

### Issue tracker

Work is tracked in `TODO.MD` (local and gitignored; no GitHub issues). See `docs/agents/issue-tracker.md`.

### Triage labels

The five roles map to `TODO.MD` sections (`ideas`, `needs danny`, `up next (claude)`, `left on purpose`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root (the site's vocabulary), ADRs in `docs/adr/` when one gets written. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
