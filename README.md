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
npm run build         # static export to out/
npm run sync          # refresh the build-time GitHub snapshot
npm run deploy        # build and publish out/ to the gh-pages branch by hand
```

Needs Node 22 or newer (CI uses 24). Content lives in `src/data/` and `src/config/`; there is no CMS.

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
public/           # the resume PDF
```

`CLAUDE.md` has the full architecture and conventions.

## Deploying

The site is served from the `gh-pages` branch (root), not `main`. The Deploy workflow (`.github/workflows/deploy.yml`) builds `main` and publishes `out/` there daily and on manual dispatch (Actions → Deploy → Run workflow, or `gh workflow run deploy.yml --ref main`). CI (`.github/workflows/ci.yml`) runs lint, format check and build on every push and PR to `main`.
