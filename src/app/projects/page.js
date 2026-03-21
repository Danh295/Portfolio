import Image from "next/image";
import styles from "../section-page.module.css";

const featuredProject = {
  title: "SynthOS Dashboard",
  meta: "Lead Developer • Nova Systems • San Francisco",
  summary: [
    "Engineered a real-time data visualization engine processing 50k+ events/sec.",
    "Reduced bundle size by 40% through rigorous tree-shaking and lazy loading.",
    "Implemented a custom component library using Tailwind CSS and Radix UI.",
  ],
  stack: ["React", "TypeScript", "Node.js", "D3.js"],
};

const projectCards = [
  {
    title: "VaultKey Auth",
    meta: "Open Source Project • Global",
    description:
      "End-to-end encrypted authentication provider for small business apps with passkey-first sign-in flows.",
    stack: ["Next.js", "Prisma", "WebAuthn"],
    link: "View Code →",
    image: "/pfp2.jpg",
  },
  {
    title: "FlowGrid CMS",
    meta: "Contract • Studio X • Berlin",
    description:
      "Headless CMS backend built for extreme developer flexibility with fast content modeling and clean API ergonomics.",
    stack: ["Go", "PostgreSQL", "GraphQL"],
    link: "Live Demo →",
    image: "/temp.jpg",
  },
];

export default function ProjectsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Projects</span>
        <h1 className={styles.title}>
          Selected <span className={styles.titleAccent}>Projects</span>
        </h1>
        <p className={styles.lead}>
          A showcase of digital architecture and full-stack execution. From
          developer tools to immersive user experiences, these projects reflect a
          commitment to performance, accessibility, and clean code.
        </p>
      </section>

      <section className={styles.content}>
        <article className={styles.featureCard}>
          <div className={styles.featureCopy}>
            <div className={styles.cardHeader}>
              <h2>{featuredProject.title}</h2>
              <span className={styles.meta}>{featuredProject.meta}</span>
            </div>
            <ul className={styles.bulletList}>
              {featuredProject.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.chipRow}>
              {featuredProject.stack.map((item) => (
                <span key={item} className={styles.chip}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.visualCard}>
            <Image
              src="/temp.jpg"
              alt="Featured project preview"
              fill
              className={styles.visualImage}
            />
          </div>
        </article>

        <section className={styles.twoColumn}>
          {projectCards.map((project) => (
            <article key={project.title} className={styles.card}>
              <div className={styles.cardVisual}>
                <Image
                  src={project.image}
                  alt={`${project.title} project preview`}
                  fill
                  className={styles.cardImage}
                />
              </div>
              <div className={styles.cardHeader}>
                <h2>{project.title}</h2>
                <span className={styles.meta}>{project.meta}</span>
              </div>
              <p className={styles.cardBody}>{project.description}</p>
              <div className={styles.chipRow}>
                {project.stack.map((item) => (
                  <span key={item} className={styles.chip}>
                    {item}
                  </span>
                ))}
              </div>
              <a href="#" className={styles.cardLink}>
                {project.link}
              </a>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
