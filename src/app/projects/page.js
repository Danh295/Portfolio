import { projects } from "@/data/projects";

import ProjectsTimeline from "./ProjectsTimeline";
import styles from "./page.module.css";

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
