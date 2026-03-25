import ProjectsTimeline from "./ProjectsTimeline";
import styles from "./page.module.css";

const projects = [
  {
    title: "AniFriend",
    role: "Full-stack Developer",
    context: "Personal Project / Waterloo, ON",
    timeline: "2025 - Present",
    bullets: [
      "Built a social discovery platform around pet matching, onboarding flows, and richer profile interactions.",
      "Designed and implemented the full-stack application structure with a focus on fast iteration and maintainable UI patterns.",
      "Integrated authentication, responsive layouts, and cleaner data organization to support future feature growth.",
    ],
    tags: ["Next.js", "React", "TypeScript", "Supabase"],
    github: "https://github.com/Danh295/AniFriend",
    demo: "https://github.com/Danh295/AniFriend",
    images: [
      { src: "/pfp2.jpg", alt: "AniFriend project preview" },
      { src: "/pfp1.png", alt: "AniFriend matching interface" },
    ],
  },
  {
    title: "OCR Document Pipeline",
    role: "ML / Software Developer",
    context: "Research + Applied Work / Ontario",
    timeline: "2024 - Present",
    bullets: [
      "Worked on OCR-focused preprocessing flows for noisy documents with an emphasis on extraction quality and consistency.",
      "Explored computer vision and image processing techniques for denoising, segmentation, and downstream parsing accuracy.",
      "Structured experiments and utilities so the pipeline could be iterated on more easily across multiple datasets.",
    ],
    tags: ["Python", "OpenCV", "OCR", "Image Processing"],
    github: "https://github.com/Danh295",
  },
  {
    title: "Personal Portfolio",
    role: "Designer / Developer",
    context: "Personal Brand / Web",
    timeline: "2024 - Present",
    bullets: [
      "Designed and built a portfolio that balances direct communication, strong visual hierarchy, and reusable page structure.",
      "Refined navigation, responsive behavior, and content organization to better present projects, skills, and career growth.",
      "Used a lightweight static export approach while still supporting dynamic GitHub content on the home page.",
    ],
    tags: ["Next.js", "CSS Modules", "Responsive Design", "GitHub API"],
    github: "https://github.com/Danh295/Portfolio",
    demo: "https://github.com/Danh295/Portfolio",
    images: [
      { src: "/pfp1.png", alt: "Portfolio project preview" },
      { src: "/pfp2.jpg", alt: "Portfolio home page" },
      { src: "/temp.jpg", alt: "Portfolio projects page" },
    ],
  },
  {
    title: "Real-time Chat App",
    role: "Full-stack Developer",
    context: "Side Project / Collaborative",
    timeline: "2024",
    bullets: [
      "Built a WebSocket-powered chat application with rooms, typing indicators, and message persistence.",
      "Implemented JWT-based authentication and role-based access for moderated channels.",
      "Designed a responsive UI with lazy-loaded message history and optimistic updates for low-latency feel.",
    ],
    tags: ["React", "TypeScript", "Supabase"],
    github: "https://github.com/Danh295",
    demo: "https://github.com/Danh295",
    images: [
      { src: "/pfp2.jpg", alt: "Chat app interface" },
      { src: "/temp.jpg", alt: "Chat rooms view" },
    ],
  },
  {
    title: "Budget Tracker CLI",
    role: "Developer",
    context: "Utility / Personal Use",
    timeline: "2023 - 2024",
    bullets: [
      "Created a command-line budgeting tool with CSV import, category tagging, and monthly summaries.",
      "Added interactive prompts for quick entry and a simple SQLite backend for local persistence.",
      "Built charting output using terminal graphics for at-a-glance spending breakdowns.",
    ],
    tags: ["Python", "JavaScript", "HTML"],
    github: "https://github.com/Danh295",
    demo: "https://github.com/Danh295",
    images: [
      { src: "/temp.jpg", alt: "Budget tracker output" },
    ],
  },
];

export default function ProjectsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Projects</h1>
        <p className={styles.lead}>
          Recent work including full-stack builds, hackathon submissions, computer vision and OCR pipelines.
        </p>
      </section>

      <ProjectsTimeline projects={projects} />
    </main>
  );
}
