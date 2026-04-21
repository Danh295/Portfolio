import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import NavbarMobile from "@/components/navigation/NavbarMobile";
import Footer from "@/components/layout/Footer";
import { site } from "@/config/site";

const OG_IMAGE = `${site.url}/pfp.jpg`;

export const metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
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
    site.name,
    "projects",
    "skills",
    "experience",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: {
    canonical: `${site.url}/`,
  },
  openGraph: {
    type: "website",
    url: `${site.url}/`,
    siteName: site.title,
    title: site.title,
    description: site.description,
    locale: "en_US",
    images: [{ url: OG_IMAGE, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
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
