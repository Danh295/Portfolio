# Portfolio

Personal portfolio built with Next.js App Router and deployed as a static export to GitHub Pages.

## Structure

```text
src/
  app/                    # Routes, layout, and global styling
  components/
    navigation/           # Shared navigation UI
    ui/                   # Reusable presentational UI
  config/                 # Shared app configuration
  features/
    projects/             # Project-specific components and logic
public/                   # Static assets
```

## Current State

- `src/app` contains the actual route tree for the site.
- `src/components/navigation` contains shared site navigation used across routes.
- `src/components/ui` contains reusable presentational components.
- `src/features/projects` holds project-specific components that are not part of the route tree itself.
- Some project feature components are still unfinished and are not wired into the live `projects` page yet.

## Scripts

- `npm run dev` starts the local Next.js dev server
- `npm run build` creates the static export build
- `npm run deploy` publishes `out/` to GitHub Pages
