import { site } from "@/config/site";
import { projects } from "@/data/projects";

export const dynamic = "force-static";

// Real pages only: home and one page per project. /projects/, /experience/ and /skills/
// are redirect stubs (Search Console reports them as "page with redirect"). No
// lastModified: a build date changes on every daily deploy and teaches crawlers to
// ignore it.
export default function sitemap() {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({
      url: `${site.url}/projects/${p.slug}/`,
      changeFrequency: "yearly",
      priority: 0.7,
    })),
  ];
}
