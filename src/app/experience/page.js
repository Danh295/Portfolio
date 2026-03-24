import ExperienceTimeline from "./ExperienceTimeline";
import styles from "./page.module.css";

const entries = [
  {
    title: "Software Developer Co-op",
    company: "City of Waterloo",
    location: "Ontario, Canada",
    date: "Jan 2025 - Present",
    tags: ["JavaScript", "TypeScript", "ReactJS", "HTML", "CSS", "Vue"],
    summary:
      "Building internal software and contributing to practical web-based tools that support day-to-day workflows and service delivery.",
    details: [
      "Worked across frontend implementation and broader product polish for production-facing internal tools.",
      "Contributed to UI improvements, maintainable components, and cleaner engineering workflows.",
      "Focused on reliable delivery, practical collaboration, and learning through shipped work.",
    ],
    mediaLabel: "City of Waterloo media",
  },
  {
    title: "Web Developer",
    company: "Civiconnect",
    location: "Ontario, Canada",
    date: "2024 - 2025",
    tags: ["HTML", "CSS", "JavaScript", "ReactJS", "TypeScript", "Vue"],
    summary:
      "Worked on website development and digital experiences with a stronger emphasis on frontend delivery and implementation detail.",
    details: [
      "Developed websites and supporting pages across multiple initiatives.",
      "Worked through website builds, JavaScript-heavy frontend work, and Strapi-backed content changes.",
      "Contributed to design-minded implementation and Figma-based UI translation.",
    ],
    mediaLabel: "Civiconnect media",
  },
  {
    title: "Operations Executive Member",
    company: "Opportunify",
    location: "Ontario, Canada",
    date: "2022 - 2023",
    tags: ["HTML", "CSS", "JavaScript", "ReactJS", "TypeScript", "Vue"],
    summary: "Student-run nonprofit experience focused on operations, coordination, and contributing across initiatives in a fast-moving team environment.",
    details: [
      "Supported operations and execution work across student-led initiatives.",
      "Helped keep projects moving through coordination, communication, and practical follow-through.",
      "Gained early experience working in teams with ownership across multiple responsibilities.",
    ],
    mediaLabel: "Opportunify media",
  },
  {
    title: "Chief Operations Officer",
    company: "Untapped Valley",
    location: "Ontario, Canada",
    date: "2022 - 2023",
    tags: ["HTML", "CSS", "JavaScript", "ReactJS", "TypeScript", "Vue"],
    summary: "Student nonprofit leadership role centered on operations, execution, and helping guide initiatives from planning into action.",
    details: [
      "Led operations-focused work within a student-run nonprofit environment.",
      "Balanced organization, coordination, and execution across ongoing initiatives.",
      "Built early leadership experience through accountability, team collaboration, and structured follow-through.",
    ],
    mediaLabel: "Untapped Valley media",
  },
];

export default function ExperiencePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Experience</h1>
      </section>

      <ExperienceTimeline entries={entries} />
    </main>
  );
}
