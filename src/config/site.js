const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/Portfolio" : "";

export const site = {
  name: "danny hu",
  title: "danny hu | portfolio",
  description:
    "personal portfolio of danny hu — student and full-stack developer. explore projects, skills, and experience across web development, machine learning, and image processing",
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
