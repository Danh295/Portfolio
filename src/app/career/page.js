import styles from "../section-page.module.css";

const timeline = [
  {
    title: "Education",
    body: "BCS & BBA double degree at the University of Waterloo and Wilfrid Laurier University.",
  },
  {
    title: "Professional Direction",
    body: "Growing toward product-focused software roles where design quality and engineering rigor both matter.",
  },
  {
    title: "Current Momentum",
    body: "Sharpening project depth, strengthening fundamentals, and building a more complete body of work.",
  },
];

const strengths = [
  "Frontend development with stronger UI hierarchy and cleaner component systems.",
  "Full-stack problem solving with practical product tradeoff awareness.",
  "Collaboration, iteration, and learning fast from shipped work.",
];

export default function CareerPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Career
        </h1>
        <p className={styles.lead}>
          Technical growth, product judgment, and a growing track record of finished work.
        </p>
      </section>

      <section className={styles.splitLayout}>
        <div className={styles.stack}>
          <article className={styles.miniCard}>
            <h2>At a glance</h2>
            <div className={styles.stackList}>
              {timeline.map((item) => (
                <div key={item.title} className={styles.stackItem}>
                  <span className={styles.columnTitle}>{item.title}</span>
                  <p className={styles.stackBody}>{item.body}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className={styles.skillShowcase}>
          <div className={styles.skillHeader}>
            <div>
              <h2>Career Direction</h2>
              <p className={styles.skillBlurb}>Software, product thinking, and thoughtful execution</p>
            </div>
            <div className={styles.skillScore}>
              <span className={styles.scoreValue}>24/7</span>
              <span className={styles.scoreLabel}>Learning Mode</span>
            </div>
          </div>

          <p className={styles.cardBody}>
            The goal is to keep building toward roles where I can contribute across
            engineering, interface quality, and problem framing. I want the work to
            feel reliable, useful, and clearly intentional.
          </p>

          <div className={styles.skillColumns}>
            <div className={styles.skillColumn}>
              <span className={styles.columnTitle}>What I&apos;m Developing</span>
              <ul className={styles.bulletList}>
                {strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={styles.skillColumn}>
              <span className={styles.columnTitle}>Near-Term Focus</span>
              <div className={styles.stackList}>
                <div className={styles.stackItem}>
                  <h3>More complete case studies</h3>
                  <p className={styles.stackBody}>
                    Turning projects into clearer narratives with better context and stronger outcomes.
                  </p>
                </div>
                <div className={styles.stackItem}>
                  <h3>Stronger technical depth</h3>
                  <p className={styles.stackBody}>
                    Improving systems thinking, implementation judgment, and the quality bar of shipped work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
