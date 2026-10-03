import NotFound from "@/components/notfound/NotFound";

export const metadata = { title: "404 · danny hu", robots: { index: false, follow: true } };

export default function NotFoundPage() {
  return <NotFound />;
}
