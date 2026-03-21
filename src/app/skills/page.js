import styles from "../section-page.module.css";

const skillGroups = [
  {
    title: "Languages",
    items: ["C++", "TypeScript", "Python", "Rust", "SQL"],
  },
  {
    title: "Libraries & Frameworks",
    items: ["React", "Next.js", "Node.js", "PyTorch", "Tailwind CSS"],
  },
  {
    title: "Tools & Software",
    items: ["Git", "Docker", "AWS", "PostgreSQL", "Figma"],
  },
];

const ecosystem = [
  {
    title: "Component Architecture",
    body: "Reusable UI patterns, interaction systems, and cleaner frontend composition.",
  },
  {
    title: "Performance Optimization",
    body: "Rendering efficiency, bundling awareness, and practical frontend responsiveness.",
  },
  {
    title: "Type Systems",
    body: "Safer interfaces, predictable data shapes, and stronger developer ergonomics.",
  },
];

const relatedProjects = [
  "Dashboard interfaces with dense data and strong UX hierarchy.",
  "Design-system style component work with reusable patterns.",
  "Full-stack products where frontend polish matters as much as correctness.",
];

export default function SkillsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Skills</span>
        <h1 className={styles.title}>
          Architecting the <span className={styles.titleAccent}>Digital Future</span>
        </h1>
        <p className={styles.lead}>
          A clearer breakdown of my technical toolkit, product instincts, and
          engineering strengths. From core languages to modern full-stack
          architectures, this is the ecosystem I&apos;m growing inside.
        </p>
      </section>

      <section className={styles.splitLayout}>
        <div className={styles.stack}>
          {skillGroups.map((group) => (
            <article key={group.title} className={styles.miniCard}>
              <h2>{group.title}</h2>
              <div className={styles.chipRow}>
                {group.items.map((item) => (
                  <span key={item} className={styles.chip}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <article className={styles.skillShowcase}>
          <div className={styles.skillHeader}>
            <div>
              <h2>TypeScript & React</h2>
              <p className={styles.skillBlurb}>High-confidence working stack • UI-first mindset</p>
            </div>
            <div className={styles.skillScore}>
              <span className={styles.scoreValue}>95%</span>
              <span className={styles.scoreLabel}>Mastery Level</span>
            </div>
          </div>

          <p className={styles.cardBody}>
            I&apos;m strongest when working in modern frontend and full-stack JavaScript
            environments, especially where product polish, reusable components, and
            maintainable interfaces all need to come together.
          </p>

          <div className={styles.skillColumns}>
            <div className={styles.skillColumn}>
              <span className={styles.columnTitle}>Technical Ecosystem</span>
              <div className={styles.stackList}>
                {ecosystem.map((item) => (
                  <div key={item.title} className={styles.stackItem}>
                    <h3>{item.title}</h3>
                    <p className={styles.stackBody}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.skillColumn}>
              <span className={styles.columnTitle}>Related Projects</span>
              <div className={styles.stackList}>
                {relatedProjects.map((item) => (
                  <div key={item} className={styles.stackItem}>
                    <p className={styles.projectLink}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
