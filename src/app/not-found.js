import NotFound from "@/components/notfound/NotFound";
import { site } from "@/config/site";

export const metadata = {
  title: `404 | ${site.name}`,
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFound />;
}
