import App from "@/components/App";
import { site } from "@/config/site";
import { projects } from "@/data/projects";
import { pageHead } from "@/lib/pageHead";

// One pre-rendered page per project, so each can be indexed and shared:
// /Portfolio/projects/<slug>/. It's the same app, opened on that project; moving around
// inside it doesn't reload (App.jsx keeps the address bar in sync with pushState).
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { title, description, url } = pageHead(slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: site.name,
      images: [site.ogImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [site.ogImage] },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  return <App initialView={slug} />;
}
