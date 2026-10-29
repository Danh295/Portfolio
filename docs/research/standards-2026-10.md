# Standards check: security, SEO, accessibility and performance (2026-10-29)

How the site measures against current standards, what was fixed this round, and what is deferred. Primary sources only. **[inference]** marks reasoning that isn't from a source; **[unconfirmed]** marks claims no primary source I found states. Live checks are `curl` runs from 2026-10-29. Commit hashes come from the task brief.

## What's live today

- `https://danh295.github.io/Portfolio/` returns 200. `/Portfolio/icon.png` and `/Portfolio/robots.txt` return 200. `/Portfolio/og-image.png` returns 404 (the card is `og-card.png`). An unknown path (`/Portfolio/nope/`) returns 404.
- The home head carries one `<meta name="robots" content="index, follow">`, one `<link rel="canonical" href="https://danh295.github.io/Portfolio/">`, `og:site_name` = `danny hu`, and no keywords meta.
- `og:image` and `twitter:image` are both the absolute URL `https://danh295.github.io/Portfolio/og-card.png?v=1`, with `og:image:width` 1200, `og:image:height` 630, alt text, and `twitter:card` = `summary_large_image`.

## 1. Security (fixed this round: 51ee5fb)

### next 16.3.8 -> 16.4.1

All three advisories list 16.4.1 as patched, and 16.3.8 sits inside each affected range.

| Advisory            | Title                                                                 | Severity           | Affected                                       | Patched            |
| ------------------- | --------------------------------------------------------------------- | ------------------ | ---------------------------------------------- | ------------------ |
| GHSA-2464-fhr4-w9xw | Unauthenticated RCE in Image Optimization API when SVG files are used | Critical, CVSS 9.5 | >= 10.0.0, <= 15.5.27 and >= 16.0.0, <= 16.4.0 | 15.5.28 and 16.4.1 |
| GHSA-p3m5-59mp-jv5r | Denial of Service in App Router using Server Actions                  | High, CVSS 8.2     | >= 13.0.0, <= 15.5.27 and >= 16.0.0, <= 16.4.0 | 15.5.28 and 16.4.1 |
| GHSA-673q-mjm6-r5xr | Unauthenticated RCE in `use cache` functions returning typed arrays   | Critical, CVSS 9.5 | >= 16.0.0, <= 16.4.0                           | 16.4.1             |

Sources: https://github.com/advisories/GHSA-2464-fhr4-w9xw, https://github.com/advisories/GHSA-p3m5-59mp-jv5r, https://github.com/advisories/GHSA-673q-mjm6-r5xr

- **Correction to the brief: none of the three advisory pages mentions static export or the dev server.** The "exposure was mostly dev-time" reading is not in the advisory text, so it is **[inference]**.
- What each advisory does say about exposure:
  - Image Optimization: "when Next.js runs on glibc-based Linux"; workaround: sharp >= 0.35.5. https://github.com/advisories/GHSA-2464-fhr4-w9xw
  - Server Actions: "using App Router with at least one Server Action"; "Applications using Pages Router or not using Server Actions are not vulnerable"; no workaround. https://github.com/advisories/GHSA-p3m5-59mp-jv5r
  - `use cache`: "The application needs to have a `use cache` function that returns multiple typed arrays"; "You should upgrade immediately even if your application does not have similar functions." https://github.com/advisories/GHSA-673q-mjm6-r5xr
- Next's static export guide lists "Image Optimization with the default `loader`" and "Server Actions" among the features that are not supported with `output: "export"`. Source: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`. **[inference]** With no server in production and `images.unoptimized: true`, the shipped site ran none of the three vulnerable paths. The risk was in `next dev` and the build toolchain. The bump is still right: the third advisory says to upgrade regardless.

### GitHub Actions hardening

- **SHA pinning.** "Pin references to actions to a commit SHA in your workflow files", to mitigate a backdoor added to the action's repository. https://docs.github.com/en/actions/reference/security/secure-use
- **Token scope.** "make sure that the `GITHUB_TOKEN` is granted the minimum required permissions"; set the default read-only and raise it per job. Same page. Passing the token only to the sync step follows that idea **[inference]**.
- **`persist-credentials: false`** (set in `pages.yml`): the secure-use page does not mention `persist-credentials` **[unconfirmed]** in that page. The setting is an input of the checkout action, not covered by a GitHub Docs page I fetched.
- **Job timeouts** (`timeout-minutes: 15` and `10` in `pages.yml`): the workflow-syntax page states the step-level maximum ("Maximum: 360 for both GitHub-hosted and self-hosted runners"). The job-level default **[unconfirmed]** (my fetches truncated before that section). https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

### Dependabot and rulesets

- **Alerts vs security updates vs version updates.**
  - Alerts "notify you about vulnerable dependencies so you can upgrade to secure versions". https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
  - Security updates are "automated pull requests that help you update dependencies with known vulnerabilities", triggered by alerts. Version updates "keep your dependencies updated, even when they don't have any vulnerabilities". They are kept separate. https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates
  - Version updates are enabled by checking a `dependabot.yml` into the repo; a new release waits a default 3-day cooldown, which "does not apply to security updates". https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates
  - This repo: alerts on, no security-update PRs, version updates for the `github-actions` ecosystem only (CLAUDE.md). Whether the page's ecosystem name for Actions is exactly `github-actions` is **[unconfirmed]** (the page doesn't name the identifier).
- **Rulesets.** "Restrict deletions": only users with bypass permissions can delete matching branches or tags. "Block force pushes": "You can prevent users from force pushing to the targeted branches or tags." https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

## 2. SEO (fixed this round: 694fb00, 3bde65b, bee2a15, 158e37e)

- **Canonical on redirect stubs.**
  - Google: put a canonical `<link>` "in the code for all duplicate pages, pointing to the canonical page", plus a self-referencing one on the canonical page; "Don't specify different URLs as canonical for the same page using different canonicalization techniques"; the element is only accepted in `<head>`. https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
  - **[inference]** A stub that inherited home's canonical declared the stub's content to be the home page and contradicted its own redirect target, so the stubs now claim none (694fb00). The page doesn't discuss redirect stubs.
- **Robots meta.** "In the case of conflicting `robots` (or `googlebot`) `meta` tags, the more restrictive tag applies." https://developers.google.com/search/docs/crawling-indexing/special-tags and https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag ("Google applies the more restrictive rule"). Two robots tags are therefore not an error, but the most restrictive wins, so a stray `noindex` beside `index, follow` would win. One tag stays (694fb00).
- **`og:site_name`.** "If your object is part of a larger web site, the name which should be displayed for the overall site." So it is the site name, not the page title. https://ogp.me/
- **Keywords meta.** "The meta-keyword tag is not used by Google Search, and it has no effect on indexing and ranking at all." Removed. https://developers.google.com/search/docs/crawling-indexing/special-tags
- **`og:image`.**
  - ogp.me: "An image URL which should represent your object". It does not state that the URL must be absolute (every example is), and it recommends no size. It says "If the page specifies an og:image it should specify og:image:alt". https://ogp.me/
  - Facebook: "at least 1200 x 630 pixels for the best display on high resolution devices"; 600 x 315 is the minimum for large link-post images. https://developers.facebook.com/docs/sharing/webmasters/images/
  - **X card docs: [unconfirmed].** The developer.x.com page returned HTTP 402 and docs.x.com returned 404 for me, so `summary_large_image`, its image ratio and its absolute-URL rule are not verified from a primary source here.
- **Previews are cached by URL.**
  - Facebook: "We cache all images referenced based on each image's URL"; use a new URL for a replacement, or the Sharing Debugger / Graph API re-scrape. Same Facebook page. This is why the card carries `?v=1` (158e37e). Whether a query string counts as a new URL is **[inference]** (the Facebook page says "URL" only).
  - X and LinkedIn caching: **[unconfirmed]**. The LinkedIn help page I fetched (https://www.linkedin.com/help/linkedin/answer/a521928) says nothing about caching.
- **Next.js metadata merging.** Metadata objects from multiple segments "are **shallowly** merged ... Duplicate keys are **replaced**" (`generate-metadata.md`, line 1346). "File-based metadata has the higher priority and will override the `metadata` object and `generateMetadata` function" (line 114). Both in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`. `metadataBase` composes a relative path into a fully qualified URL (same file, line 391).
- **Local observation (not a source claim).** With `basePath: "/Portfolio"`, a file-based `opengraph-image` in this repo produced a doubled `/Portfolio/Portfolio/` image URL, so the card is a plain file under `public/` referenced from `site.url` (bee2a15, 158e37e). The docs I read say nothing about basePath for `opengraph-image.md` **[unconfirmed]**.
- **CI pin.** `check:head` pins the built heads (694fb00, 3bde65b, bee2a15, 158e37e).

## 3. Accessibility and performance (deferred, measure first)

**Nothing was measured: no Lighthouse run, no CrUX data, no screen-reader pass, no target-size audit.** Everything below is what the standards say, not how the site scores. This whole section is a deferred item.

- **Target size.**
  - 2.5.8 Target Size (Minimum), Level AA: "at least 24 by 24 CSS pixels", with exceptions for spacing, an equivalent control, inline targets, user-agent controls and essential presentation. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
  - 2.5.5 Target Size (Enhanced), Level AAA: "at least 44 by 44 CSS pixels" with similar exceptions. https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
  - **[inference]** AA is the realistic bar. Dense terminal-style text links may fall under the inline exception.
- **2.2.2 Pause, Stop, Hide (Level A).** For "moving, blinking or scrolling information that (1) starts automatically, (2) lasts more than five seconds, and (3) is presented in parallel with other content, there is a mechanism for the user to pause, stop, or hide it unless the movement ... is part of an activity where it is essential." Auto-updating content has no five-second exception. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - **[inference]** The 404 egg animation starts automatically and has no pause control, so it needs a decision on whether it lasts over five seconds, runs in parallel with other content, or is an essential activity. The site already holds one still frame under reduced motion (CLAUDE.md). Not assessed.
- **2.1.4 Character Key Shortcuts (Level A).** Single-character shortcuts need one of: "A mechanism is available to turn the shortcut off", remap, or active only on focus. https://www.w3.org/TR/WCAG22/#character-key-shortcuts **[inference]** The site's shortcuts-off setting is the "turn off" option.
- **Reduced motion.** Technique C39 uses `prefers-reduced-motion` "to allow users to prevent animations"; it is Sufficient for 2.3.3 Animation from Interactions (Level AAA, "Motion animation triggered by interaction can be disabled, unless the animation is essential"). https://www.w3.org/WAI/WCAG22/Techniques/css/C39 and https://www.w3.org/TR/WCAG22/#animation-from-interactions
- **Core Web Vitals (good thresholds, at the 75th percentile).** LCP within 2.5 s; INP 200 ms or less; CLS 0.1 or less. https://web.dev/articles/vitals

## 4. Decided (earlier suggestions that stay as decided)

Recorded as decisions, not findings; both are in the repo's CLAUDE.md.

- **No `scroll-padding-top`.** The site avoids scroll snap and lands section jumps explicitly.
- **Reduced motion: reduce, don't remove.** Only what moves across the screen honours the preference.

## 5. Summary table

| Item                                                                     | Status                  | Commit or pointer                       |
| ------------------------------------------------------------------------ | ----------------------- | --------------------------------------- |
| next 16.3.8 -> 16.4.1 (three advisories)                                 | fixed this round        | 51ee5fb                                 |
| Actions pinned to SHAs, checkout without persisted credentials, timeouts | fixed this round        | 51ee5fb                                 |
| Dependabot version updates for github-actions                            | fixed this round        | 51ee5fb                                 |
| Redirect stubs and 404 carry no home canonical or link preview           | fixed this round        | 694fb00, 3bde65b                        |
| Single robots meta, `og:site_name`, keywords meta removed                | fixed this round        | 694fb00                                 |
| `check:head` CI step pinning built heads                                 | fixed this round        | 694fb00, 3bde65b                        |
| 1200x630 link-preview card, `summary_large_image`, versioned URL         | fixed this round        | bee2a15, 158e37e                        |
| X card and X/LinkedIn cache claims                                       | deferred (unverified)   | no commit; re-check when docs reachable |
| Target size audit (2.5.8)                                                | deferred, measure first | TODO.MD                                 |
| 404 egg pause control (2.2.2)                                            | deferred, measure first | TODO.MD                                 |
| Lighthouse / CrUX (LCP, INP, CLS)                                        | deferred, measure first | TODO.MD                                 |
| No `scroll-padding-top`                                                  | decided                 | CLAUDE.md                               |
| Reduced motion: reduce, don't remove                                     | decided                 | CLAUDE.md                               |
