import Redirect from "@/components/Redirect";

// Old URL: the section lives on the home page (see components/Redirect.jsx).
export const metadata = { robots: { index: false, follow: true } };

export default function Page() {
  return <Redirect section="projects" />;
}
