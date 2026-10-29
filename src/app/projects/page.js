import Redirect from "@/components/Redirect";

// Old URL: the section lives on the home page (see components/Redirect.jsx). The empty
// `alternates` drops the layout's home canonical, which a page that isn't home must not claim.
export const metadata = { robots: { index: false, follow: true }, alternates: {} };

export default function Page() {
  return <Redirect section="projects" />;
}
