"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./page.module.css";

function ProjectTypeBadge({ category }) {
  const toneClass =
    category === "Professional"
      ? styles.badgeProfessional
      : category === "Personal"
        ? styles.badgePersonal
        : styles.badgeHackathon;

  return <span className={`${styles.projectBadge} ${toneClass}`}>{category}</span>;
}

export default function SkillExplorer({
  skillGroups,
  initialSkillName,
  stats,
  projectTypeOrder,
}) {
  const skills = skillGroups.flatMap((group) => group.skills);
  const [activeSkillName, setActiveSkillName] = useState(initialSkillName ?? skills[0]?.name ?? "");

  const activeSkill =
    skills.find((skill) => skill.name === activeSkillName) ??
    skills[0];

  return (
    <section className={styles.explorerShell}>
      <div className={styles.mapPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Project-Driven Skill Map</span>
            <h2 className={styles.panelTitle}>Where the work clusters</h2>
          </div>
          <p className={styles.panelCopy}>
            Each chip is tied to real project tags. Size reflects how often that skill appears across my recent builds.
          </p>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.skillCount}</span>
            <span className={styles.summaryLabel}>Mapped skills</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.projectCount}</span>
            <span className={styles.summaryLabel}>Linked projects</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{stats.topSkill}</span>
            <span className={styles.summaryLabel}>Most used right now</span>
          </div>
        </div>

        <div className={styles.clusterGrid}>
          {skillGroups.map((group, groupIndex) => (
            <article key={group.title} className={styles.clusterCard}>
              <div className={styles.clusterHeader}>
                <h3 className={styles.clusterTitle}>{group.title}</h3>
                <span className={styles.clusterMeta}>{group.skills.length} skills</span>
              </div>

              <div className={styles.skillCloud}>
                {group.skills.map((skill, skillIndex) => {
                  const isActive = activeSkill?.name === skill.name;

                  return (
                    <button
                      key={skill.name}
                      type="button"
                      className={`${styles.skillNode} ${isActive ? styles.skillNodeActive : ""}`}
                      style={{
                        "--weight": skill.displayWeight,
                        "--float-delay": `${(groupIndex * 4 + skillIndex) * 0.18}s`,
                        "--float-duration": `${6.2 + ((groupIndex + skillIndex) % 4) * 0.65}s`,
                      }}
                      onMouseEnter={() => setActiveSkillName(skill.name)}
                      onFocus={() => setActiveSkillName(skill.name)}
                      onClick={() => setActiveSkillName(skill.name)}
                      aria-pressed={isActive}
                    >
                      <span className={styles.nodeLabel}>{skill.name}</span>
                      <span className={styles.nodeCount}>{skill.projectCount}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      {activeSkill && (
        <aside className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <span className={styles.eyebrow}>Focused skill</span>
            <h2 className={styles.detailTitle}>{activeSkill.name}</h2>
            <p className={styles.detailSubhead}>{activeSkill.category}</p>
          </div>

          <div className={styles.detailStats}>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{activeSkill.projectCount}</span>
              <span className={styles.detailStatLabel}>Projects using it</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>
                {projectTypeOrder.filter((type) => activeSkill.projectTypeCounts[type] > 0).length}
              </span>
              <span className={styles.detailStatLabel}>Project contexts</span>
            </div>
          </div>

          <div className={styles.breakdownRow}>
            {projectTypeOrder
              .filter((type) => activeSkill.projectTypeCounts[type] > 0)
              .map((type) => (
                <span key={type} className={styles.breakdownPill}>
                  <span>{type}</span>
                  <strong>{activeSkill.projectTypeCounts[type]}</strong>
                </span>
              ))}
          </div>

          <div className={styles.relatedSection}>
            <div className={styles.relatedHeader}>
              <h3 className={styles.relatedTitle}>Related Projects</h3>
              <span className={styles.relatedMeta}>
                {activeSkill.projectCount} linked build{activeSkill.projectCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className={styles.relatedList}>
              {activeSkill.projects.map((project) => (
                <Link
                  key={`${activeSkill.name}-${project.slug}`}
                  href={`/projects#${project.slug}`}
                  className={styles.relatedProject}
                >
                  <div className={styles.relatedTop}>
                    <h4 className={styles.relatedProjectTitle}>{project.title}</h4>
                    <ProjectTypeBadge category={project.category} />
                  </div>
                  <p className={styles.relatedContext}>{project.context}</p>
                  <p className={styles.relatedTimeline}>{project.timeline}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
