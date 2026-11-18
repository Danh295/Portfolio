// What the page's head says for a route, pure: the project pages' generateMetadata and the
// client (App.jsx, which moves between projects without a reload) both read it, so the head a
// visitor copies after opening or stepping matches the one a crawler gets from that URL.

import { site } from "@/config/site";
import { projects } from "@/data/projects";
import { projPath } from "@/lib/urls";

/** { title, description, url, type } for a project slug, or the home page for none/unknown. */
export function pageHead(slug) {
  const p = slug && projects.find((x) => x.slug === slug);
  if (!p)
    return {
      title: site.title,
      description: site.description,
      url: `${site.url}/`,
      type: "website",
    };
  return {
    title: `${p.title} | ${site.name}`,
    description: p.purpose,
    url: site.url + projPath(p.slug),
    type: "article",
  };
}

/** The head tags that carry it, as [selector, attribute, value]; the title is set separately. */
export function headTags(h) {
  return [
    ['link[rel="canonical"]', "href", h.url],
    ['meta[name="description"]', "content", h.description],
    ['meta[property="og:url"]', "content", h.url],
    ['meta[property="og:type"]', "content", h.type],
    ['meta[property="og:title"]', "content", h.title],
    ['meta[property="og:description"]', "content", h.description],
    ['meta[name="twitter:title"]', "content", h.title],
    ['meta[name="twitter:description"]', "content", h.description],
  ];
}

/** Writes a route's head into a document: the title and every tag the page already has. */
export function applyHead(doc, h) {
  doc.title = h.title;
  for (const [sel, attr, value] of headTags(h)) doc.querySelector(sel)?.setAttribute(attr, value);
}
