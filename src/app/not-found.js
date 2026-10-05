import NotFound from "@/components/notfound/NotFound";
import { site } from "@/config/site";

// Metadata merges shallowly: an empty `alternates` drops the home page's canonical,
// which a page that isn't home must not claim.
export const metadata = {
  title: `404 | ${site.name}`,
  robots: { index: false, follow: true },
  alternates: {},
};

export default function NotFoundPage() {
  return <NotFound />;
}
