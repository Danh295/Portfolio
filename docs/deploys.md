# Deploys

Read before changing `.github/workflows/pages.yml`, `.github/dependabot.yml`, the Pages settings, the `main` ruleset or the Dependabot alerts. Moved from CLAUDE.md and split into bullets, with two updates: `check:head` joined the workflow, and the dev-only `zod` alert (a lint-plugin dependency) was dismissed by GitHub on its own (alert 4, `auto_dismissed`), so there is nothing to dismiss by hand.

- `.github/workflows/pages.yml` runs `lint`, `format:check`, `test`, the GitHub sync, `next build` and `check:head` and deploys `out/` with GitHub's Pages artifact actions on every push to `main`, daily at 09:17 UTC (refreshing the GitHub snapshot; the previous snapshot is restored from the actions cache first, so an API failure keeps the last good data) and on `gh workflow run pages.yml`.
- Settings → Pages → Source must be **GitHub Actions**.
- A red check on `main` means nothing was deployed.
- There are no pull-request checks.
- Every `uses:` line is pinned to a commit SHA with a `# vX.Y.Z` comment, checkout doesn't persist credentials, both jobs have a timeout, and only the `npm run sync` step gets `GITHUB_TOKEN` (the build runs `npx next build`, since `npm run build` would rerun the sync through `prebuild` without the token).
- `.github/dependabot.yml` opens weekly PRs for the `github-actions` ecosystem only, to move those pins; there is no npm entry, so npm bumps stay by hand (see the lockfile rule in CLAUDE.md).
- `main` has a ruleset that blocks force-push and deletion (switch it off in Settings → Rules before rewriting history), and Dependabot alerts are on (no security-update PRs; the dev-only `zod` alert, a lint-plugin dependency, was dismissed by GitHub on its own).
- GitHub disables scheduled workflows after 60 days with no repo activity, which would silently stop the daily deploy (and the `● now` retirement it drives); `gh workflow enable pages.yml` turns it back on.
- Node version: `.nvmrc`.
