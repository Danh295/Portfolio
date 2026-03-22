import Image from "next/image";
import LatestGithubProject from "@/components/home/LatestGithubProject";
import WaveEmoji from "@/components/ui/WaveEmoji";
import IconButton from "@/components/ui/IconButton";

import styles from "./page.module.css";

const snapshotItems = [
  { label: "Education", value: "Comp Sci & BBA @ UW & WLU" },
  { label: "Work", value: "Software Developer @ City of Waterloo" },
  { label: "Right Now", value: "Computer vision, image processing, and OCR pipelines" },
];

export default function Home() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <Image
              src="/pfp.jpg"
              alt="Portrait of Danny Hu"
              width={350}
              height={520}
              className={styles.profile}
              priority
            />

            <div className={styles["header-content"]}>
              <div className={styles.intro}>
                <div className={styles.titleRow}>
                  <h2>
                    
                    <span>Hi! I&apos;m </span>
                    <span className={styles.name}>Danny</span>
                    <span>,</span>
                    <span>  </span>
                    <WaveEmoji />
                  </h2>
                  <h1 className={styles.title}>Student and Software Developer</h1>
                </div>
                <h3 className={styles.descr}>Ontario, Canada</h3>
              </div>
            </div>
          </div>

          <div className={styles.heroLower}>
            <div className={styles.blurb}>
              <p>
                As a student and developer, I&apos;m passionate about building software solutions and continuously learning in the ever-evolving tech landscape.
              </p>
              <p>
                With a passion for software development and simply building things, my experiences so far have been mainly in web and app development, but I&apos;ve also been exploring and working with AI, ML, image processing, computer vision, and OCR pipelines.
              </p>
            </div>

            <div className={styles.heroBottom}>
              <div className={styles["social-links"]}>
                <IconButton
                  icon="linkedin"
                  label="LinkedIn"
                  href="https://www.linkedin.com/in/danny-hu-395380225/"
                />
                <IconButton icon="github" label="GitHub" href="https://github.com/Danh295" />
                <IconButton
                  icon="email"
                  label="Email Danny Hu"
                  href="mailto:hudanny295@gmail.com"
                />
                <IconButton
                  icon="resume"
                  label="Check out my resume!"
                  href="/Danny_s_Resume.pdf"
                />
              </div>

              <a href="#home-details" className={styles.scrollCue} aria-label="Scroll to details">
                <span className={styles.scrollArrow} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <div id="home-details" className={styles.detailsGrid}>
        <article className={styles.panel}>
          <div className={styles.tagList}>
            {snapshotItems.map((item) => (
              <div
                key={item.label}
                className={`${styles.tag} ${item.label === "Right Now" ? styles.tagWide : ""}`}
              >
                <span className={styles.tagLabel}>{item.label}</span>
                <span className={styles.tagValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <LatestGithubProject />
      </div>
    </section>
  );
}
