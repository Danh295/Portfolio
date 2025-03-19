import "./globals.css";
import Navbar from "./components/Navbar";
import NavbarMobile from "./components/NavbarMobile";

export const metadata = {
  title: "Danny Hu | Portfolio",
  description: "Welcome to my personal portfolio! I'm a student and developer with experience in full stack web development. Feel free to explore my projects, skills, and career journey here!",
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
    "career",
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
        <div className="NavbarMobile">
          <NavbarMobile />
        </div>
      </body>
    </html>
  );
}
