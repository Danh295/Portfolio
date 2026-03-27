"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { SiDevpost } from "react-icons/si";
import TechTag from "@/components/ui/TechTag";
import styles from "./page.module.css";

const CYCLE_MS = 3500;

function ActionLink({ href, label, icon }) {
  const isDevpost = icon === "devpost";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.actionLink}
    >
      <span>{label}</span>
      {isDevpost ? (
        <SiDevpost className={styles.actionIcon} />
      ) : (
        <FontAwesomeIcon icon={icon} className={styles.actionIcon} />
      )}
    </a>
  );
}

function MediaCarousel({ images }) {
  const [active, setActive] = useState(0);
  const count = images.length;
  const timerRef = useRef(null);
  const frameRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (count <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, CYCLE_MS);
  }, [count]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  const navigate = useCallback((direction) => {
    setActive((prev) => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= count) return count - 1;
      return next;
    });
    resetTimer();
  }, [count, resetTimer]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || count <= 1) return undefined;

    let accumulated = 0;
    const threshold = 40;

    const onWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      accumulated += delta;

      if (Math.abs(accumulated) >= threshold) {
        navigate(accumulated > 0 ? 1 : -1);
        accumulated = 0;
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count, navigate]);

  return (
    <div ref={frameRef} className={styles.previewFrame}>
      {images.map((img, i) => (
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          fill
          className={`${styles.previewImage} ${i === active ? styles.previewImageActive : ""}`}
        />
      ))}
      {count > 1 && (
        <div className={styles.previewDots} aria-hidden="true">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              className={`${styles.previewDot} ${i === active ? styles.previewDotActive : ""}`}
              onClick={() => { setActive(i); resetTimer(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsTimeline({ projects }) {
  const viewportRef = useRef(null);
  const cardRefs = useRef([]);
  const [progress, setProgress] = useState(0);
  const [hoveredDot, setHoveredDot] = useState(null);
  const [dotPositions, setDotPositions] = useState(
    projects.map((_, index) => (projects.length > 1 ? (index / (projects.length - 1)) * 100 : 0)),
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    let frame = 0;

    const updateFromScroll = () => {
      const rawPositions = cardRefs.current.map((card) => card?.offsetTop ?? 0);
      const maxScroll = Math.max(viewport.scrollHeight - viewport.clientHeight, 1);
      const positions = rawPositions.map((p) => Math.min(p, maxScroll));

      if (positions.length === 0) {
        return;
      }

      setDotPositions(
        positions.map((position) => Math.min(100, Math.max(0, (position / maxScroll) * 100))),
      );

      // Subtract scroll-padding-block-start (12px) so that progress reaches
      // an exact integer when a card is snapped into view, keeping the fill
      // bar and dot activation in perfect sync.
      const scrollPadding = 12;
      const snapPositions = positions.map((p) => Math.max(0, p - scrollPadding));

      const scrollTop = viewport.scrollTop;
      let nextProgress = 0;

      if (snapPositions.length === 1 || scrollTop <= snapPositions[0]) {
        nextProgress = 0;
      } else if (scrollTop >= snapPositions[snapPositions.length - 1]) {
        nextProgress = snapPositions.length - 1;
      } else {
        for (let index = 0; index < snapPositions.length - 1; index += 1) {
          const start = snapPositions[index];
          const end = snapPositions[index + 1];

          if (scrollTop >= start && scrollTop <= end) {
            const span = Math.max(end - start, 1);
            nextProgress = index + (scrollTop - start) / span;
            break;
          }
        }
      }

      setProgress(nextProgress);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [projects.length]);

  const scrollToCard = useCallback((index, behavior = "smooth") => {
    const card = cardRefs.current[index];
    const viewport = viewportRef.current;
    if (card && viewport) {
      viewport.scrollTo({ top: card.offsetTop, behavior });
    }
  }, []);

  useEffect(() => {
    const syncHashToCard = () => {
      const slug = window.location.hash.replace("#", "");
      if (!slug) {
        return;
      }

      const index = projects.findIndex((project) => project.slug === slug);
      if (index >= 0) {
        requestAnimationFrame(() => {
          scrollToCard(index);
        });
      }
    };

    syncHashToCard();
    window.addEventListener("hashchange", syncHashToCard);

    return () => {
      window.removeEventListener("hashchange", syncHashToCard);
    };
  }, [projects, scrollToCard]);

  const progressStart = dotPositions[0] ?? 0;
  const segmentIndex = Math.min(Math.floor(progress), Math.max(projects.length - 2, 0));
  const segmentProgress = progress - segmentIndex;
  const segmentStart = dotPositions[segmentIndex] ?? progressStart;
  const segmentEnd = dotPositions[Math.min(segmentIndex + 1, dotPositions.length - 1)] ?? segmentStart;
  const interpolatedEnd = segmentStart + (segmentEnd - segmentStart) * Math.max(0, Math.min(segmentProgress, 1));
  const progressHeight = `${Math.max(0, interpolatedEnd - progressStart)}%`;

  const formatMetaLine = (project) => {
    return [project.role, project.company, project.location]
      .filter(Boolean)
      .join(" • ");
  };

  return (
    <section className={styles.projectsShell}>
      <div className={styles.progressNav}>
        <div className={styles.progressDots}>
          <span
            className={styles.progressFill}
            style={{
              top: `${progressStart}%`,
              height: progressHeight,
            }}
          />
          {projects.map((project, index) => (
            <button
              key={project.title}
              type="button"
              aria-label={project.title}
              className={`${styles.progressDot} ${interpolatedEnd >= (dotPositions[index] ?? 0) ? styles.progressDotActive : ""}`}
              style={{ top: `${dotPositions[index] ?? 0}%` }}
              onClick={() => scrollToCard(index)}
              onMouseEnter={() => setHoveredDot(index)}
              onMouseLeave={() => setHoveredDot(null)}
            />
          ))}
          {hoveredDot !== null && (
            <div
              className={styles.dotPreview}
              style={{ top: `${dotPositions[hoveredDot] ?? 0}%` }}
            >
              {projects[hoveredDot].images?.[0] && (
                <div className={styles.dotPreviewThumb}>
                  <Image
                    src={projects[hoveredDot].images[0].src}
                    alt=""
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
              <span className={styles.dotPreviewTitle}>{projects[hoveredDot].title}</span>
              <span className={styles.dotPreviewMeta}>{formatMetaLine(projects[hoveredDot])}</span>
              <span className={styles.dotPreviewContext}>{projects[hoveredDot].context}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.carouselFrame}>
        <div ref={viewportRef} className={styles.scrollViewport}>
          <div className={styles.projectStack}>
          {projects.map((project, index) => (
            <article
              key={project.title}
              id={project.slug}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className={`${styles.projectCard} ${!project.images?.length ? styles.projectCardCompact : ""}`}
              data-project-card
            >
              <div className={styles.copyColumn}>
                <div className={styles.copyHeader}>
                  <div className={styles.copyIntro}>
                    <div className={styles.titleRow}>
                      <h2 className={styles.projectTitle}>{project.title}</h2>
                      {project.category && (
                        <span className={styles.projectCategory}>{project.category}</span>
                      )}
                    </div>
                    <p className={styles.projectMeta}>{formatMetaLine(project)}</p>
                    <p className={styles.projectTimeline}>{project.timeline}</p>
                  </div>

                  {!project.images?.length && (project.github || project.demo || project.devpost) && (
                    <div className={styles.actions}>
                      {project.github && <ActionLink href={project.github} label="GitHub" icon={faCodeBranch} />}
                      {project.demo && <ActionLink href={project.demo} label="Open Project" icon={faArrowUpRightFromSquare} />}
                      {project.devpost && <ActionLink href={project.devpost} label="Devpost" icon="devpost" />}
                    </div>
                  )}
                </div>

                <p className={styles.projectContext}>{project.context}</p>

                <ul className={styles.bulletList}>
                  {project.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              {project.images?.length > 0 && (
                <div className={styles.visualColumn}>
                  {(project.github || project.demo || project.devpost) && (
                    <div className={styles.actions}>
                      {project.github && <ActionLink href={project.github} label="GitHub" icon={faCodeBranch} />}
                      {project.demo && <ActionLink href={project.demo} label="Open Project" icon={faArrowUpRightFromSquare} />}
                      {project.devpost && <ActionLink href={project.devpost} label="Devpost" icon="devpost" />}
                    </div>
                  )}

                  <MediaCarousel images={project.images} />

                  <div className={styles.tagRow}>
                    {project.tags.map((tag) => (
                      <TechTag key={tag} label={tag} />
                    ))}
                  </div>
                </div>
              )}

              {!project.images?.length && (
                <div className={styles.tagRow}>
                  {project.tags.map((tag) => (
                    <TechTag key={tag} label={tag} />
                  ))}
                </div>
              )}
            </article>
          ))}
          </div>
        </div>

      </div>
    </section>
  );
}
