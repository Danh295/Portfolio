import App from "@/components/App";
import { site } from "@/config/site";
import { projects } from "@/data/projects";
import { projPath } from "@/lib/urls";

// One pre-rendered page per project, so each can be indexed and shared:
// /Portfolio/projects/<slug>/. It's the same app, opened on that project; moving around
// inside it doesn't reload (App.jsx keeps the address bar in sync with pushState).
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  const url = site.url + projPath(slug);
  const title = `${p.title} | ${site.name}`;
  return {
    title,
    description: p.purpose,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description: p.purpose, siteName: site.title },
    twitter: { card: "summary", title, description: p.purpose },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  return <App initialView={slug} />;
}
