import Image from "next/image";
import LatestGithubProject from "@/components/home/LatestGithubProject";
import TechTag from "@/components/ui/TechTag";
import WaveEmoji from "@/components/ui/WaveEmoji";
import IconButton from "@/components/ui/IconButton";
import { homeContent } from "@/data/home";

import styles from "./page.module.css";

export default function Home() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <Image
              src={homeContent.portrait.src}
              alt={homeContent.portrait.alt}
              width={homeContent.portrait.width}
              height={homeContent.portrait.height}
              className={styles.profile}
              priority
            />

            <div className={styles["header-content"]}>
              <div className={styles.intro}>
                <div className={styles.titleRow}>
                  <h2>
                    <span>{homeContent.intro.greeting} </span>
                    <span className={styles.name}>{homeContent.intro.name}</span>
                    <span>  </span>
                    <WaveEmoji />
                  </h2>
                  <h1 className={styles.title}>{homeContent.intro.title}</h1>
                </div>
                <h3 className={styles.descr}>{homeContent.intro.subtitle}</h3>
              </div>
            </div>
          </div>

          <div className={styles.heroLower}>
            <div className={styles.blurb}>
              {homeContent.intro.blurb.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className={styles.heroBottom}>
              <div className={styles["social-links"]}>
                {homeContent.socialLinks.map((link) => (
                  <IconButton
                    key={link.icon}
                    icon={link.icon}
                    label={link.label}
                    href={link.href}
                  />
                ))}
              </div>

              <a href="#tech-stack" className={styles.scrollCue} aria-label="Scroll to details">
                <span className={styles.scrollArrow} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <article id="tech-stack" className={styles.panel}>
        <h2 className={styles.panelTitle}>Core Tech Stack</h2>
        <div className={styles.stackColumns}>
          <div className={styles.stackGroups}>
            <div className={styles.stackGroup}>
              <span className={styles.stackLabel}>Languages</span>
              <div className={styles.stackTags}>
                <TechTag label="C" />
                <TechTag label="C++" />
                <TechTag label="Python" />
                <TechTag label="JavaScript" />
                <TechTag label="TypeScript" />
              </div>
            </div>
            <div className={styles.stackGroup}>
              <span className={styles.stackLabel}>Frameworks</span>
              <div className={styles.stackTags}>
                <TechTag label="React" />
                <TechTag label="Next.js" />
                <TechTag label="Tailwind" />
                <TechTag label="FastAPI" />
              </div>
            </div>
          </div>
          <div className={styles.stackGroups}>
            <div className={styles.stackGroup}>
              <span className={styles.stackLabel}>Libraries</span>
              <div className={styles.stackTags}>
                <TechTag label="OpenCV" />
                <TechTag label="NumPy" />
                <TechTag label="Pillow" />
              </div>
            </div>
            <div className={styles.stackGroup}>
              <span className={styles.stackLabel}>Tools & Services</span>
              <div className={styles.stackTags}>
                <TechTag label="Git" />
                <TechTag label="Bash" />
                <TechTag label="Linux" />
                <TechTag label="Uvicorn" />
                <TechTag label="Supabase" />
              </div>
            </div>
          </div>
        </div>
      </article>

      <div id="home-details" className={styles.detailsGrid}>
        <article className={styles.panel}>
          <div className={styles.tagList}>
            {homeContent.snapshotItems.map((item) => (
              <div
                key={item.label}
                className={`${styles.tag} ${item.label === "Current Focus" ? styles.tagWide : ""}`}
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
