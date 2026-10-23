import ResumeViewer from "@/components/resume/ResumeViewer";
import { site } from "@/config/site";

// The resume as a page of its own: a small viewer that draws public/Danny_s_Resume.pdf (not
// the whole app, like the 404). Every "resume ↗" link opens it in a new tab.
const url = `${site.url}/resume/`;
const title = `resume | ${site.name}`;
const description = `${site.name}'s resume: education, experience, projects and skills. View it here or download the PDF.`;

export const metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { type: "profile", url, title, description, siteName: site.title },
  twitter: { card: "summary", title, description },
};

export default function ResumePage() {
  return <ResumeViewer />;
}
