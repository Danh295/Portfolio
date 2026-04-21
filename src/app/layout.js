import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import NavbarMobile from "@/components/navigation/NavbarMobile";
import Footer from "@/components/layout/Footer";

const SITE_URL = "https://danh295.github.io/Portfolio";
const SITE_NAME = "Danny Hu";
const SITE_TITLE = "Danny Hu | Portfolio";
const SITE_DESCRIPTION =
  "Welcome to my personal portfolio! I'm a student and developer with experience in full stack web development. Feel free to explore my projects, skills, and experience here!";
const OG_IMAGE = `${SITE_URL}/pfp.jpg`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "portfolio",
    "student",
    "developer",
    "full stack web developer",
    "front-end developer",
    "back-end developer",
    "software developer",
    "web developer",
    "UI/UX designer",
    SITE_NAME,
    "projects",
    "skills",
    "experience",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [{ url: OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="Navbar">
          <Navbar />
        </div>
        {children}
        <Footer />
        <div className="NavbarMobile">
          <NavbarMobile />
        </div>
      </body>
    </html>
  );
}
