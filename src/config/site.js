const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/Portfolio" : "";

export const site = {
  name: "Danny Hu",
  title: "Danny Hu | Portfolio",
  description:
    "Personal portfolio of Danny Hu — student and full-stack developer. Explore projects, skills, and experience across web development, machine learning, and image processing.",
  url: "https://danh295.github.io/Portfolio",
  basePath,
  github: {
    username: "Danh295",
    profile: "https://github.com/Danh295",
  },
  linkedin: "https://www.linkedin.com/in/danny-hu-395380225/",
  email: "hudanny295@gmail.com",
  resume: `${basePath}/Danny_s_Resume.pdf`,
};

export const withBasePath = (path) => `${basePath}${path}`;
