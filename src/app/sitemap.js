import { site } from "@/config/site";

export const dynamic = "force-static";

export default function sitemap() {
  const lastModified = new Date();
  const routes = ["/", "/projects/", "/experience/", "/skills/"];

  return routes.map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
