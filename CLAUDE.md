# Project Instructions

Personal portfolio site for Danny Hu. Next.js 16 (App Router) + React 19, JavaScript (no TypeScript), CSS Modules, static-exported to GitHub Pages at `/Portfolio/`.

## Architecture

**Single-page model.** Everything lives on `/`. The home page (`src/app/page.js`) imports the timeline/explorer components from sibling route folders and renders all four sections (`#home`, `#projects`, `#experience`, `#skills`) stacked. Navigation uses anchor links (`/#projects` etc.), not route transitions.

- `src/app/projects/page.js`, `src/app/experience/page.js`, `src/app/skills/page.js` are stub server components that call `redirect()` to the corresponding anchor. They exist mainly so the routes are addressable.
- `*Timeline.jsx` / `SkillExplorer.jsx` files live under their route folder but are imported into `app/page.js`. Their `page.module.css` siblings are the styles for those components — the leftover `.page` / `.hero` / `.title` / `.lead` rules in each are dead.
- `src/app/section-page.module.css` is unused (orphan from earlier layout).
- `src/app/page.module.css` owns the cross-section layout (`.sectionPage`, `.sectionTitle`, `.divider`).

**Static export.** `next.config.mjs` sets `output: "export"`, `images.unoptimized: true`, and `basePath: "/Portfolio"` in production. Consequences:

- No server runtime — no API routes, no middleware, no runtime `redirect()`. The `redirect()` calls in the sub-route pages produce `__next_error__` HTML pages at build, not actual redirects. Anyone hitting `/Portfolio/projects/` directly lands on a broken page. Same for `/experience/` and `/sitemap.xml` advertises these as indexable URLs.
- Always use `next/image` with the existing `unoptimized` setup. Image `src` paths should be root-relative (`/pfp.jpg`); Next prepends `basePath` automatically.
- For asset URLs outside `next/image` (PDF, mailto-style hrefs), pull from `src/config/site.js` (`site.resume` already incorporates `basePath`).

## Conventions

- **Path alias**: `@/*` → `src/*` (see `jsconfig.json`).
- **Client components** are marked `"use client"`. Most interactive components (timelines, explorer, hooks consumers) need it.
- **Styling**: CSS Modules per component. Global tokens (colors, radii, spacing, z-index) live in `:root` in `src/app/globals.css`. Prefer existing custom properties (`--secondary`, `--radius-md`, `--space-card-*`) over hard-coded values.
- **Data**: All content (projects, experience, home copy, site metadata) is hand-authored under `src/data/` and `src/config/`. There is no CMS.
- **Skills model**: `src/lib/skills.js` derives the orbit/cluster data from `src/data/projects.js` tags. Two registries must stay in sync when adding a new tag:
  1. `SKILL_CATEGORY_MAP` in `src/lib/skills.js` — assigns the tag to one of `Frontend / Backend / AI / ML / Computer Vision / OCR / Tooling / Infra`. Unmapped tags silently fall back to `Tooling / Infra`.
  2. `siMap` / `faMap` in `src/components/ui/TechTag.jsx` — picks the icon. Unmapped tags render a generic gear icon.
- **Section anchors are the canonical URLs.** Cross-section links (e.g. SkillExplorer → ProjectsTimeline) navigate by setting `window.location.hash` and dispatching `hashchange`; ProjectsTimeline listens for `hashchange` to scroll its inner viewport to the matching project `slug`.
- **Reduced motion**: `src/lib/useReducedMotion.js` is the source of truth. Honour it in any new animation/wheel-hijack code.

## Commands

```
npm run dev           # local dev server
npm run lint          # eslint .
npm run format        # prettier --write .
npm run format:check  # prettier --check . (NOT in CI)
npm run build         # next build → out/
npm run deploy        # publish out/ to gh-pages
```

CI (`.github/workflows/ci.yml`) runs `lint` + `build` on push/PR to `main`. It does not run `format:check`, so formatting drift is not caught automatically.

## Git Commits

- Never include a `Co-Authored-By` line in commit messages. Do not credit Claude or any AI as a co-author.
