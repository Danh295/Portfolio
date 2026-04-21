import { site } from "@/config/site";

export const homeContent = {
  portrait: {
    src: "/pfp.jpg",
    alt: "Portrait of Danny Hu",
    width: 350,
    height: 520,
  },
  intro: {
    greeting: "Hi! I'm",
    name: "Danny!",
    title: "Student and Developer",
    subtitle: "from Ontario, Canada",
    blurb: [
      "Since building my first project in highschool, I've known I wanted to keep building software, learning, and growing alongside this ever-evolving tech landscape.",
      "With a passion for software development and simply building things, most of my experiences lie in web and app development, but I've also been exploring and working with AI, ML, image processing, computer vision, and OCR pipelines.",
    ],
  },
  socialLinks: [
    { icon: "linkedin", label: "LinkedIn", href: site.linkedin },
    { icon: "github", label: "GitHub", href: site.github.profile },
    { icon: "email", label: "Email me!", href: `mailto:${site.email}` },
    { icon: "resume", label: "Check out my resume!", href: site.resume },
  ],
  snapshotItems: [
    { label: "Education", value: "Comp Sci & BBA @ UW & WLU" },
    { label: "Work", value: "Software Developer @ City of Waterloo" },
    { label: "Current Focus", value: "Computer vision, image processing, and OCR pipelines" },
  ],
  coreTechStack: [
    {
      label: "Languages",
      items: ["C", "C++", "Python", "JavaScript", "TypeScript"],
    },
    {
      label: "Frameworks",
      items: ["React", "Next.js", "Tailwind", "FastAPI"],
    },
    {
      label: "Libraries",
      items: ["OpenCV", "NumPy", "Pillow"],
    },
    {
      label: "Tools & Services",
      items: ["Git", "Bash", "Linux", "Uvicorn", "Supabase"],
    },
  ],
};
