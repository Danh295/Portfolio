"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import TechTag from "@/components/ui/TechTag";
import styles from "./page.module.css";

const CYCLE_MS = 3500;

function ActionLink({ href, label, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.actionLink}
    >
      <span>{label}</span>
      <FontAwesomeIcon icon={icon} className={styles.actionIcon} />
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

      const scrollTop = viewport.scrollTop;
      let nextProgress = 0;

      if (positions.length === 1 || scrollTop <= positions[0]) {
        nextProgress = 0;
      } else if (scrollTop >= positions[positions.length - 1]) {
        nextProgress = positions.length - 1;
      } else {
        for (let index = 0; index < positions.length - 1; index += 1) {
          const start = positions[index];
          const end = positions[index + 1];

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

  const progressStart = dotPositions[0] ?? 0;
  const segmentIndex = Math.min(Math.floor(progress), Math.max(projects.length - 2, 0));
  const segmentProgress = progress - segmentIndex;
  const segmentStart = dotPositions[segmentIndex] ?? progressStart;
  const segmentEnd = dotPositions[Math.min(segmentIndex + 1, dotPositions.length - 1)] ?? segmentStart;
  const interpolatedEnd = segmentStart + (segmentEnd - segmentStart) * Math.max(0, Math.min(segmentProgress, 1));
  const progressHeight = `${Math.max(0, interpolatedEnd - progressStart)}%`;

  return (
    <section className={styles.projectsShell}>
      <div className={styles.progressNav} aria-hidden="true">
        <div className={styles.progressDots}>
          <span
            className={styles.progressFill}
            style={{
              top: `${progressStart}%`,
              height: progressHeight,
            }}
          />
          {projects.map((project, index) => (
            <span
              key={project.title}
              className={`${styles.progressDot} ${progress >= index - 0.05 ? styles.progressDotActive : ""}`}
              style={{ top: `${dotPositions[index] ?? 0}%` }}
            />
          ))}
        </div>
      </div>

      <div className={styles.carouselFrame}>
        <div ref={viewportRef} className={styles.scrollViewport}>
          <div className={styles.projectStack}>
          {projects.map((project, index) => (
            <article
              key={project.title}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className={styles.projectCard}
              data-project-card
            >
              <div className={styles.copyColumn}>
                <div className={styles.copyIntro}>
                  <h2 className={styles.projectTitle}>{project.title}</h2>
                  <p className={styles.projectMeta}>
                    {project.role} / {project.context}
                  </p>
                  <p className={styles.projectTimeline}>{project.timeline}</p>
                </div>

                <ul className={styles.bulletList}>
                  {project.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.visualColumn}>
                {(project.github || project.demo) && (
                  <div className={styles.actions}>
                    {project.github && <ActionLink href={project.github} label="GitHub" icon={faCodeBranch} />}
                    {project.demo && <ActionLink href={project.demo} label="Open Project" icon={faArrowUpRightFromSquare} />}
                  </div>
                )}

                {project.images?.length > 0 && <MediaCarousel images={project.images} />}

                <div className={styles.tagRow}>
                  {project.tags.map((tag) => (
                    <TechTag key={tag} label={tag} />
                  ))}
                </div>
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
