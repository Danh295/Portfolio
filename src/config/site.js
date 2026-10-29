const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/Portfolio" : "";

export const site = {
  name: "danny hu",
  title: "danny hu | portfolio",
  description:
    "personal portfolio of danny hu — student and full-stack developer. explore projects, skills, and experience across web development, machine learning, and image processing",
  url: "https://danh295.github.io/Portfolio",
  basePath,
  // The link-preview card (public/og-card.png, drawn by scripts/make-icons.mjs). An absolute URL
  // on purpose: Next's own opengraph-image file under basePath doubles it (/Portfolio/Portfolio/),
  // and the pages that set their own openGraph would lose it.
  ogImage: {
    url: "https://danh295.github.io/Portfolio/og-card.png",
    width: 1200,
    height: 630,
    alt: "danny hu: a terminal window showing $ whoami, the name danny hu, student and full-stack developer, and an ASCII egg",
  },
  github: {
    username: "Danh295",
    profile: "https://github.com/Danh295",
  },
  linkedin: "https://www.linkedin.com/in/danny-hu-395380225/",
  email: "hudanny295@gmail.com",
  // The resume page (a viewer, opened in a new tab) and the PDF file it draws and offers to
  // download. The file carries no phone number or school email (test/resume.test.mjs).
  resume: `${basePath}/resume/`,
  resumePdf: `${basePath}/Danny_s_Resume.pdf`,
};
