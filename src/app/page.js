import Image from "next/image";
import LatestGithubProject from "@/components/home/LatestGithubProject";
import TechTag from "@/components/ui/TechTag";
import WaveEmoji from "@/components/ui/WaveEmoji";
import IconButton from "@/components/ui/IconButton";
import { homeContent } from "@/data/home";
import { projects } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { buildSkillModel } from "@/lib/skills";

import ProjectsTimeline from "./projects/ProjectsTimeline";
import ExperienceTimeline from "./experience/ExperienceTimeline";
import SkillExplorer from "./skills/SkillExplorer";

import styles from "./page.module.css";

export default function Home() {
  const { skillGroups, initialSkillName, stats, projectTypeOrder } = buildSkillModel();

  return (
    <>
      {/* ── Home ── */}
      <section id="home" className={styles.page}>
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

        <article id="tech-stack" className={styles.panel}>
          <h2 className={styles.panelTitle}>Core Tech Stack</h2>
          <div className={styles.stackColumns}>
            {[0, 1].map((columnIndex) => (
              <div key={columnIndex} className={styles.stackGroups}>
                {homeContent.coreTechStack
                  .filter((_, index) => index % 2 === columnIndex)
                  .map((group) => (
                    <div key={group.label} className={styles.stackGroup}>
                      <span className={styles.stackLabel}>{group.label}</span>
                      <div className={styles.stackTags}>
                        {group.items.map((item) => (
                          <TechTag key={item} label={item} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className={styles.divider} aria-hidden="true" />

      {/* ── Projects ── */}
      <section id="projects" className={styles.sectionPage}>
        <div className={styles.sectionHero}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <p className={styles.sectionLead}>
            Recent work including full-stack builds, hackathon submissions, computer vision and OCR pipelines.
          </p>
        </div>
        <ProjectsTimeline projects={projects} />
      </section>

      <div className={styles.divider} aria-hidden="true" />

      {/* ── Experience ── */}
      <section id="experience" className={styles.sectionPage}>
        <div className={styles.sectionHero}>
          <h2 className={styles.sectionTitle}>Experience</h2>
          <p className={styles.sectionLead}>
            Roles, leadership work, and team experience across frontend delivery and shipping polished web experiences.
          </p>
        </div>
        <ExperienceTimeline entries={experienceEntries} />
      </section>

      <div className={styles.divider} aria-hidden="true" />

      {/* ── Skills ── */}
      <section id="skills" className={styles.sectionPage}>
        <div className={styles.sectionHero}>
          <h2 className={styles.sectionTitle}>Skills</h2>
          <p className={styles.sectionLead}>
            A project-driven map of the technologies behind my recent work.
          </p>
        </div>
        <SkillExplorer
          skillGroups={skillGroups}
          initialSkillName={initialSkillName}
          stats={stats}
          projectTypeOrder={projectTypeOrder}
        />
      </section>
    </>
  );
}
