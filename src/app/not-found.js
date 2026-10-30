import NotFound from "@/components/notfound/NotFound";
import { site } from "@/config/site";

// Metadata merges shallowly: an empty `alternates` drops the home page's canonical, which a page
// that isn't home must not claim. `robots: null` drops the layout's "index, follow" too: Next adds
// its own `noindex` to the 404, and ours made a second meta. Null `openGraph` and `twitter` drop
// the home preview.
export const metadata = {
  title: `404 | ${site.name}`,
  alternates: {},
  robots: null,
  openGraph: null,
  twitter: null,
};

export default function NotFoundPage() {
  return <NotFound />;
}
