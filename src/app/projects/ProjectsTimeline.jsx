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
import { useReducedMotion } from "@/lib/useReducedMotion";
import styles from "./page.module.css";

const CYCLE_MS = 3500;

function getProjectCategoryClass(category) {
  if (category === "Professional") {
    return styles.projectCategoryProfessional;
  }

  if (category === "Personal") {
    return styles.projectCategoryPersonal;
  }

  return styles.projectCategoryHackathon;
}

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
  const reducedMotion = useReducedMotion();

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (count <= 1 || reducedMotion) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, CYCLE_MS);
  }, [count, reducedMotion]);

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
    if (!el || count <= 1 || reducedMotion) return undefined;

    let accumulated = 0;
    const threshold = 40;

    const onWheel = (e) => {
      // Only intercept wheel for sideways navigation when input is dominantly
      // horizontal. Vertical wheel must always pass through to the page so
      // hovering an image at the last project card doesn't trap scroll.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) {
        accumulated = 0;
        return;
      }

      accumulated += e.deltaX;

      if (Math.abs(accumulated) >= threshold) {
        const direction = accumulated > 0 ? 1 : -1;
        const atBound =
          (direction === 1 && active === count - 1) ||
          (direction === -1 && active === 0);
        if (!atBound) {
          navigate(direction);
          e.preventDefault();
        }
        accumulated = 0;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [active, count, navigate, reducedMotion]);

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredDot, setHoveredDot] = useState(null);
  const reducedMotion = useReducedMotion();
  const dotPositions = projects.map((_, index) =>
    projects.length > 1 ? (index / (projects.length - 1)) * 100 : 0,
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    let frame = 0;

    const updateActiveCard = () => {
      const positions = cardRefs.current.map((card) => card?.offsetTop ?? 0);
      if (positions.length === 0) {
        return;
      }

      const scrollTop = viewport.scrollTop;
      let nextActive = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      positions.forEach((position, index) => {
        const distance = Math.abs(scrollTop - position);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nextActive = index;
        }
      });

      setActiveIndex((current) => (current === nextActive ? current : nextActive));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveCard);
    };

    updateActiveCard();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [projects.length]);

  const scrollToCard = useCallback((index, behavior) => {
    const card = cardRefs.current[index];
    const viewport = viewportRef.current;
    if (card && viewport) {
      viewport.scrollTo({
        top: card.offsetTop,
        behavior: behavior ?? (reducedMotion ? "auto" : "smooth"),
      });
    }
  }, [reducedMotion]);

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
  const progressHeight = `${
    projects.length > 1 ? (activeIndex / (projects.length - 1)) * 100 : 0
  }%`;

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
              className={`${styles.progressDot} ${index <= activeIndex ? styles.progressDotActive : ""}`}
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
                        <span
                          className={`${styles.projectCategory} ${getProjectCategoryClass(project.category)}`}
                        >
                          {project.category}
                        </span>
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
