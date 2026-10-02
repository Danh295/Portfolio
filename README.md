# Portfolio

Danny Hu's personal portfolio: a terminal-styled site with a gui and a shell mode, an egg-cooking minigame, and a rolling-egg 404. Next.js 16 (App Router) + React 19, JavaScript, CSS Modules, static-exported to GitHub Pages.

Live: https://danh295.github.io/Portfolio/

## Develop

```text
npm install
npm run dev           # local dev server
npm run lint          # eslint .
npm run format        # prettier --write .
npm run format:check  # prettier --check . (runs in CI)
npm test              # unit tests (node:test)
npm run build         # static export to out/
npm run sync          # refresh the build-time GitHub snapshot
```

Needs Node 22 or newer (CI uses the version in `.nvmrc`). Content lives in `src/data/` and `src/config/`; there is no CMS.

## Layout

```text
src/
  app/            # layout, global styles, fonts, the 404, redirect stubs
  components/     # App.jsx (the single client root) and its parts: egg, frame, header,
                  # notfound, overlay, shell, skills, work, experience
  config/         # site.js, ui.js
  data/           # projects, experience, home, egg content
  lib/            # pure helpers: shell, vim, ascii renderers, egg physics and game
scripts/          # sync-github.mjs (build-time GitHub data)
test/             # node:test suites + the loader that resolves @/ imports
public/           # the resume PDF
```

`CLAUDE.md` has the full architecture and conventions.

## Deploying

Every push to `main` is checked (lint, format, tests, build) and deployed to GitHub Pages by `.github/workflows/pages.yml`, which also runs daily to refresh the build-time GitHub snapshot and can be started by hand (`gh workflow run pages.yml`). Pull requests get the same checks from `.github/workflows/ci.yml`.
