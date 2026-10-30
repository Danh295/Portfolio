import Redirect from "@/components/Redirect";

// Old URL: the section lives on the home page (see components/Redirect.jsx). The empty `alternates`
// drops the layout's home canonical, and null `openGraph` and `twitter` its home preview, which a
// page that isn't home must not claim.
export const metadata = {
  robots: { index: false, follow: true },
  alternates: {},
  openGraph: null,
  twitter: null,
};

export default function Page() {
  return <Redirect section="skills" />;
}
