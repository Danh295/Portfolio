import { site } from "@/config/site";

export const dynamic = "force-static";

// Only real pages: /projects/, /experience/ and /skills/ are redirect stubs (Search
// Console reports them as "page with redirect"). No lastModified: a build date changes
// on every daily deploy and teaches crawlers to ignore it.
export default function sitemap() {
  return [{ url: `${site.url}/`, changeFrequency: "monthly", priority: 1 }];
}
