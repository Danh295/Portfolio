import { experienceEntries } from "@/data/experience";

import ExperienceTimeline from "./ExperienceTimeline";
import styles from "./page.module.css";

export default function ExperiencePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Experience</h1>
      </section>

      <ExperienceTimeline entries={experienceEntries} />
    </main>
  );
}
