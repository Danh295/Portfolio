// Navigation helpers for App.jsx: URLs, the scroll lock that keeps the scroll spy out of
// keyboard jumps, and quiet focus moves. URL parsing is pure (testable under node).

import { site } from "@/config/site";
import { projects } from "@/data/projects";

export const SECTION_IDS = ["home", "projects", "experience", "skills"];

// URLs: a project is a real page, /Portfolio/projects/<slug>/ (pre-rendered by
// app/projects/[slug]/page.js, so it can be indexed and shared); sections are hashes on
// the home page, /Portfolio/#experience.
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

export const parseLocation = () => parsePath(window.location.pathname, window.location.hash);

// Keyboard/programmatic navigation owns activeSec while its scroll is in flight.
// `hold` locks the scroll spy for `ms` (extended by each scroll event, so it lasts until
// the scroll settles); `free` hands control back at once (user wheel/touch/keys).
// Without it, the spy's "at the page bottom → last section" rule steals j/k when the
// last sections are shorter than the viewport.
// `target` is the scrollY a programmatic scroll is heading to, so a follow-up
// ensureVisible can measure against where the page will land, not where it is mid-flight.
// While the lock is on, <html data-jump> says a jump is in flight (src/lib/reveal.js: the
// sections it flies past keep their type-in); NAV_SETTLED fires when it lands or the user
// takes over, so they can look again.
export const NAV_SETTLED = "danny:navsettled";
export const isJumping = () => document.documentElement.hasAttribute("data-jump");

const settle = (lock) => {
  lock.current.on = false;
  lock.current.target = null;
  if (!isJumping()) return;
  delete document.documentElement.dataset.jump;
  window.dispatchEvent(new Event(NAV_SETTLED));
};

export function holdNav(lock, ms, target) {
  lock.current.on = true;
  document.documentElement.dataset.jump = "";
  if (target !== undefined) lock.current.target = target;
  clearTimeout(lock.current.t);
  lock.current.t = setTimeout(() => settle(lock), ms);
}

export function freeNav(lock) {
  clearTimeout(lock.current.t);
  settle(lock);
}

/** scrollY that parks `el` just under the nav (its scroll-margin-top), within page bounds. */
export function alignTarget(el) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0,
    max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - margin));
}

// Moves focus for screen readers without scrolling or a focus ring (keyboard users still
// see the inverted selection).
export const focusQuiet = (el) => el?.focus({ preventScroll: true, focusVisible: false });
