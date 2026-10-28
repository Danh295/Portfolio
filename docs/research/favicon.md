# Favicon research (2026-10-28)

Why Google Search shows a globe for https://danh295.github.io/Portfolio/, and what would fix it. Primary sources only. **[inference]** marks reasoning that isn't from a source; **[unconfirmed]** marks claims no primary source I found states. Live checks are `curl` runs from 2026-10-28.

## What's live today

- `https://danh295.github.io/`, `/favicon.ico` and `/robots.txt` all return 404 (GitHub's "Site not found" page). `/Portfolio/`, `/Portfolio/favicon.ico` (`image/vnd.microsoft.icon`, frames of 16, 32 and 48px), `/Portfolio/icon.png` (192px), `/Portfolio/icon.svg` (91 KB), `/Portfolio/robots.txt` and `/Portfolio/sitemap.xml` return 200 with `cache-control: max-age=600`.
- `/Portfolio/` declares, in this order: `favicon.ico` (48x48), `icon.png` (192x192), `favicon-dark.ico` and `icon-dark.png` (both `media="(prefers-color-scheme: dark)"`), `icon.svg`, and `apple-touch-icon` → `apple-icon.png` (180px).
- `https://github.com/Danh295/danh295.github.io` and `api.github.com/repos/Danh295/danh295.github.io` both answer 301 → `Danh295/Portfolio`. **[inference]** The Portfolio repo used to be the user-site repo and was renamed. When it was renamed, the host root stopped serving a page.

## 1. How Google Search picks a favicon

All of this is from https://developers.google.com/search/docs/appearance/favicon-in-search (last updated 2026-10-27):

- **One favicon per hostname.** "Google Search only supports one favicon per site, where a site is defined by the hostname." The page's examples: `https://example.com` and `https://news.example.com` are supported. `https://example.com/news` is "Not supported (this is a subdirectory-level home page)". So `/Portfolio/` can never have its own favicon on `danh295.github.io`. Google reads the favicon from the host's home page, `https://danh295.github.io/`, which 404s. That is the cause of the globe.
- **Where the link goes.** "Add a `<link>` tag to the header of your home page." Supported `rel` values: `icon`, `shortcut icon`, `apple-touch-icon` and `apple-touch-icon-precomposed`. The `href` can be relative or absolute, and "the URL doesn't need to be hosted on your site". A root page can therefore point at `/Portfolio/icon.png`.
- **Redirects.** "Googlebot must be able to crawl the home page, follow any redirects from there to the page where the favicon is specified." The page doesn't say which kinds of redirect count. Whether an instant meta refresh counts is **[unconfirmed]**.
- **Crawlability.** "Googlebot-Image must be able to crawl the favicon file." Neither the home page nor the icon may be "blocked from crawling by a robots.txt file or by other means."
- **Size.** It must be square and "at least 8x8px", and Google recommends "larger than 48x48px". **The current page has no "multiples of 48px" rule.**
- **Formats.** "BMP, GIF, ICO, PNG, JPEG, PPM, and TIFF". **SVG is not listed.**
- **Multiple icons, `media`, dark mode.** The page doesn't say how Google chooses among several `rel=icon` links, and it doesn't mention `media` or dark mode **[unconfirmed]**.
- **A stable URL.** "The favicon URL must be stable (don't change the URL frequently)."
- **Content.** "Google won't show any favicon that it deems inappropriate."
- **Timing.** "crawling can take anywhere from several days to several weeks". "A favicon isn't guaranteed to appear in Google Search results, even if all guidelines are met."
- **Tools.** The page names only URL Inspection, to request indexing of the home page. It names no favicon-specific Search Console report.

### Search Console on github.io

- A Domain property "requires you to verify ownership using DNS record verification", which isn't possible on `github.io`. A URL-prefix property "includes only URLs with the specified prefix" and may include a path (`https://example.com/pets/`). https://support.google.com/webmasters/answer/34592
- HTML-file verification needs a file "in the root directory of your website". HTML-tag verification needs a tag "into the `<head>` tag on your homepage". Child paths of a verified parent are auto-verified. https://support.google.com/webmasters/answer/9008080 **[inference]** To inspect `https://danh295.github.io/` itself, Danny needs a page he controls at the root, which means a user-site repo. Whether a path-only `/Portfolio/` property can be verified with a tag on `/Portfolio/` is **[unconfirmed]** (the page doesn't say).

## 2. A user-site repo `Danh295/danh295.github.io`

### Does it fix the favicon?

- **[inference]** Yes. That repo becomes the host's home page, which is the only place Google reads the favicon. It needs a root `index.html` with `rel=icon` links that Googlebot and Googlebot-Image can crawl. https://developers.google.com/search/docs/appearance/favicon-in-search
- A user site is served at `<owner>.github.io` from a repo named `<owner>.github.io`, one per account. Project sites stay at `<owner>.github.io/<repositoryname>`. https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- **Precedence is [unconfirmed].** No GitHub doc says what happens if the user repo also has a `Portfolio/` folder. Keep the user repo free of a `Portfolio/` path.
- **[unconfirmed]** It's also undocumented which `404.html` GitHub serves for unknown paths under `/Portfolio/` once a user site exists. Today the project's own one shows.

### Side effect: the old repo-name redirect stops

- If you create a new repository with the renamed repository's original name, "redirects to the renamed repository will no longer work." Project site URLs are never redirected after a rename. https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository
- Creating `danh295.github.io` therefore breaks `github.com/Danh295/danh295.github.io` → `Danh295/Portfolio`. Old clones and links that use the old name would hit the new repo instead. The local remote already uses `Danh295/Portfolio.git`, and nothing in the Portfolio source links to the old repo name (checked with grep).

### Redirect, plain link, or a real page

- An instant `meta refresh` is read as a permanent redirect, and a delayed one as temporary. JavaScript `location` redirects should be used "only … if you can't do server-side or meta refresh redirects", and Google "might never see it if rendering … failed". GitHub Pages can't do server-side redirects. A permanent redirect makes the target canonical, so Google shows `/Portfolio/` in results. https://developers.google.com/search/docs/crawling-indexing/301-redirects
- **[inference]** The safest root page carries the icon links itself **and** redirects. If Google treats the refresh as a redirect, it follows it to `/Portfolio/`, which also declares the icons. If it reads the root page as a page, the icons are right there. Add `<link rel="canonical" href="https://danh295.github.io/Portfolio/">` and a visible link to `/Portfolio/` for visitors without the refresh. The root then can't compete with `/Portfolio/` as a duplicate.
- A bare page with only a link, and no redirect, would be indexed as its own thin page **[inference]**.

### robots.txt and sitemap

- robots.txt must sit "in the top-level directory of a site". `https://example.com/folder/robots.txt` is "not a valid robots.txt file", and "crawlers don't check for robots.txt files in subdirectories". Its rules apply only to that host, protocol and port. Google treats any 4xx except 429 "as if a valid robots.txt file didn't exist". https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- **This corrects the task's framing.** GitHub Pages does serve `/Portfolio/robots.txt` (200 today). Google ignores it because it isn't at the host root. Crawling is unrestricted today because the root robots.txt 404s, so the `Sitemap:` line in `/Portfolio/robots.txt` is never read.
- A sitemap "affects only descendants of the parent directory". Sitemaps submitted through Search Console are exempt. `/Portfolio/sitemap.xml` covers everything under `/Portfolio/`, which is all the site has. A root robots.txt can name it with `Sitemap: https://danh295.github.io/Portfolio/sitemap.xml` (the value must be a fully qualified URL). https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

## 3. Alternatives

- **Nothing inside `/Portfolio/` can fix it.** Google says subdirectory home pages aren't supported. https://developers.google.com/search/docs/appearance/favicon-in-search
- **A custom domain.** It makes the site's home page a hostname of its own, the supported case.
  - A custom domain set on the **user** repo is used "for all project sites owned by the same account", so the project would move to `<domain>/Portfolio`. https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
  - A custom domain set on the **Portfolio** repo (an override) serves it at that domain's root. Then `basePath: "/Portfolio"` (`next.config.mjs`) and `site.url` (`src/config/site.js`) must become `""` and the new origin.
  - GitHub recommends a `www` subdomain and verifying the domain (verification "prevents other GitHub users from using your domain"). https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
  - Whether the old `github.io/Portfolio/` URLs then redirect to the domain isn't stated in those pages **[unconfirmed]**. A domain move is a site move: permanent redirects kept "generally at least 1 year", and "a few weeks for most pages to move". https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
  - Costs: a yearly domain fee and DNS to maintain.
- **A subdomain of github.io** (like `danny.github.io`) isn't available. Every account has exactly one `<owner>.github.io`.

## 4. Browser tabs in 2026

- **Spec.** The user agent "must select the most appropriate icon according to the type, media, and sizes attributes", and on a tie uses the last one in tree order. If an icon is unusable it moves to the next. `sizes="any"` means a scalable (SVG) icon. Only "in the absence of a link with the icon keyword" may a browser fetch `/favicon.ico`, resolved against the document's URL, which here means the host root, not `/Portfolio/`. https://html.spec.whatwg.org/multipage/links.html#rel-icon
- **MDN** says the same and adds that iOS uses `apple-touch-icon`, not `rel=icon`, for web clips. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel
- **Firefox**
  - Supports SVG favicons (bug 366324, fixed 2015): https://bugzilla.mozilla.org/show_bug.cgi?id=366324
  - **Ignores `media` on `rel=icon`** (bug 1603885, still NEW on 2026-10-25): https://bugzilla.mozilla.org/show_bug.cgi?id=1603885
  - The MDN compat data notes the same: https://github.com/mdn/browser-compat-data/blob/main/html/elements/link.json
- **Chrome and Edge**
  - Basic SVG favicon support landed in November 2019 (comment in https://issues.chromium.org/issues/41234608).
  - "SVG favicons allowing inline media queries are supported in Firefox and Chromium based browsers" (2022). https://web.dev/articles/building/an-adaptive-favicon
  - Whether Chromium honours `media` on `rel=icon` links: **[unconfirmed]**, no primary source found.
  - `prefers-color-scheme` follows the OS or the website-appearance setting, not the tab strip's colour, so a dark icon can vanish on a dark tab bar. https://issues.chromium.org/issues/40116544
- **Safari**
  - "Safari 26.0 now supports the SVG file format for icons everyplace there are icons in the interface, including favicons." https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
  - Support for `media` on icons: **[unconfirmed]**.
  - MDN's compat notes ("will ALWAYS use ICO", iOS "does not use favicons at all") are copied from caniuse and predate Safari 26. They may be stale.
- **apple-touch-icon.** Use `<link rel="apple-touch-icon" href=…>` with optional `sizes`. With no link, iOS searches "the website root directory" for `apple-touch-icon….png`, which for a project site means the host root. https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- **Manifest icons.** These only matter for installing. Chromium needs at least 192px and 512px icons, plus `"purpose": "any maskable"` for maskable ones. https://web.dev/articles/add-manifest **[inference]** The site isn't an app, so it doesn't need a manifest.
- **Is `/favicon.ico` still fetched by default?** Only when a page has no icon link: the spec's "may" fallback, and https://issues.chromium.org/issues/40374731 for Chrome. `/Portfolio/` declares icons, so modern browsers shouldn't ask the root. Pages that don't use the root layout (any non-Next file, a raw PDF) would still ask, and get a 404 until a user site exists **[inference]**.
- **What this means for the current head [inference].**
  - The `media`-tagged pairs only help in browsers that honour `media`, which excludes Firefox. Browsers that support SVG and pick the last matching icon land on `icon.svg`, which switches by itself.
  - The ICO and PNG files remain the fallback, and Google needs them because it doesn't accept SVG.
  - `icon.svg` is 91 KB, large for a favicon.

## Recommendation for this site

1. **Create the user-site repo `Danh295/danh295.github.io`.** First accept that it ends the old-name redirect to `Danh295/Portfolio`. It holds:
   - An `index.html` with the following, and no `Portfolio/` folder:
     - `<meta http-equiv="refresh" content="0; url=/Portfolio/">`
     - `<link rel="canonical" href="https://danh295.github.io/Portfolio/">`
     - `<link rel="icon" href="/Portfolio/icon.png" sizes="192x192" type="image/png">` and `<link rel="icon" href="/Portfolio/favicon.ico" sizes="48x48">`, with no `media` variants and no SVG, since Google takes neither.
     - A visible link to `/Portfolio/`.
   - A `robots.txt` with `User-agent: *`, `Allow: /` and `Sitemap: https://danh295.github.io/Portfolio/sitemap.xml`.
   - Optionally a copy of `favicon.ico` at the root, for pages without icon links.
2. **Keep the icon URLs stable.** Leave `/Portfolio/icon.png` and `/Portfolio/favicon.ico` where they are. If an icon changes, change its content, not its path.
3. **Pick an icon that reads on both of Google's backgrounds [inference].** The unmarked icons are dark ink on a transparent ground (`e275c5c`), which can disappear on Google's dark theme. A solid tile like the earlier `b1478fa` design reads on light and dark results pages. This is Danny's call.
4. **Search Console.**
   - Verify a URL-prefix property for `https://danh295.github.io/` with an HTML file or tag in the new repo.
   - Submit `/Portfolio/sitemap.xml`.
   - Use URL Inspection to request indexing of the root and of `/Portfolio/`.
   - Expect days to weeks, with no guarantee.
5. **Browser tabs need no change for this.** Optionally shrink `icon.svg`.
6. **A custom domain is the cleaner long-term fix.** It costs money and DNS work, and needs `basePath`/`site.url` changes and a site move, so it only makes sense if Danny wants a domain anyway.
