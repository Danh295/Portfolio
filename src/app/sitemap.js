const SITE_URL = "https://danh295.github.io/Portfolio";

export const dynamic = "force-static";

export default function sitemap() {
  const lastModified = new Date();
  const routes = ["/", "/projects/", "/experience/", "/skills/"];

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
