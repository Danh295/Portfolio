// The site's URLs, pure (testable under node): a project is a real page,
// /Portfolio/projects/<slug>/ (pre-rendered by app/projects/[slug]/page.js, so it can be
// indexed and shared); sections are hashes on the home page, /Portfolio/#experience.

import { site } from "@/config/site";
import { projects } from "@/data/projects";

export const SECTION_IDS = ["home", "projects", "experience", "skills"];

const HOME_URL = site.basePath + "/";
export const secUrl = (n) => HOME_URL + "#" + SECTION_IDS[n];
/** A project page's path without the basePath (for site.url + …); projUrl adds it. */
export const projPath = (slug) => "/projects/" + slug + "/";
export const projUrl = (slug) => site.basePath + projPath(slug);

const isSlug = (s) => projects.some((p) => p.slug === s);

/** "#projects" → { sec: 1 }; "#projects/recall" or the older "#recall" → { slug }. */
export function parseHash(hash) {
  const h = hash.replace(/^#\/?/, "");
  const [head, slug] = h.split("/");
  if (head === "projects" && slug && isSlug(slug)) return { slug };
  if (!slug && isSlug(head)) return { slug: head };
  const sec = SECTION_IDS.indexOf(head);
  return { sec: sec < 0 ? 0 : sec };
}

/** What a URL points at: { slug } for a project page, else parseHash's answer. */
export function parsePath(pathname, hash) {
  const m = pathname.match(/\/projects\/([^/]+)\/?$/);
  if (m && isSlug(m[1])) return { slug: m[1] };
  return parseHash(hash);
}
