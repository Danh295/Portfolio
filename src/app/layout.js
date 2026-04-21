import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import NavbarMobile from "@/components/navigation/NavbarMobile";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Danny Hu | Portfolio",
  description: "Welcome to my personal portfolio! I'm a student and developer with experience in full stack web development. Feel free to explore my projects, skills, and experience here!",
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
    "Danny Hu",
    "projects",
    "skills",
    "experience",
  ],
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
