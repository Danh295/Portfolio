"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TechTag from "@/components/ui/TechTag";
import { useReducedMotion } from "@/lib/useReducedMotion";
import styles from "./page.module.css";

function MediaPlaceholder({ label }) {
  return (
    <div className={styles.mediaPlaceholder} aria-hidden="true">
      <div className={styles.mediaInner}>
        <span className={styles.mediaEyebrow}>Media</span>
        <span className={styles.mediaLabel}>{label}</span>
      </div>
    </div>
  );
}

export default function ExperienceTimeline({ entries }) {
  const viewportRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredStop, setHoveredStop] = useState(null);
  const activeIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    let frame = 0;
    let releaseTimeout = 0;

    const cardOffsets = () => cardRefs.current.map((card) => card?.offsetLeft ?? 0);

    const updateActiveCard = () => {
      const scrollLeft = viewport.scrollLeft;
      const positions = cardOffsets();

      if (positions.length === 0) {
        return;
      }

      let nextActive = 0;
      let smallestDistance = Number.POSITIVE_INFINITY;

      positions.forEach((position, index) => {
        const distance = Math.abs(scrollLeft - position);
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

    const unlockWheel = () => {
      window.clearTimeout(releaseTimeout);
      releaseTimeout = window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 520);
    };

    const onWheel = (event) => {
      if (reducedMotion) {
        return;
      }

      if (window.matchMedia("(max-width: 920px)").matches) {
        return;
      }

      const dominantDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

      if (Math.abs(dominantDelta) < 12) {
        return;
      }

      const direction = dominantDelta > 0 ? 1 : -1;
      const nextIndex = Math.max(
        0,
        Math.min(entries.length - 1, activeIndexRef.current + direction),
      );

      const atStart = activeIndexRef.current === 0 && direction === -1;
      const atEnd = activeIndexRef.current === entries.length - 1 && direction === 1;

      if (!atStart && !atEnd) {
        event.preventDefault();
      }

      if (nextIndex === activeIndexRef.current) {
        return;
      }

      if (wheelLockRef.current) {
        return;
      }

      wheelLockRef.current = true;
      const nextCard = cardRefs.current[nextIndex];

      if (nextCard) {
        viewport.scrollTo({
          left: nextCard.offsetLeft,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }

      unlockWheel();
    };

    const onKeyDown = (event) => {
      if (window.matchMedia("(max-width: 920px)").matches) {
        return;
      }

      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = Math.max(
        0,
        Math.min(entries.length - 1, activeIndexRef.current + direction),
      );

      if (nextIndex === activeIndexRef.current) {
        return;
      }

      const nextCard = cardRefs.current[nextIndex];
      if (nextCard) {
        viewport.scrollTo({
          left: nextCard.offsetLeft,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
    };

    viewport.setAttribute("tabindex", "0");
    updateActiveCard();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(releaseTimeout);
      viewport.removeAttribute("tabindex");
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries.length, reducedMotion]);

  const scrollToEntry = useCallback((index) => {
    const card = cardRefs.current[index];
    const viewport = viewportRef.current;
    if (card && viewport) {
      viewport.scrollTo({
        left: card.offsetLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, [reducedMotion]);

  const progressWidth = `${(activeIndex / Math.max(entries.length - 1, 1)) * 100}%`;

  return (
    <section className={styles.timelineShell}>
      <div className={styles.timelineFrame}>
        <div ref={viewportRef} className={styles.timelineViewport}>
          <div className={styles.timelineStack}>
            {entries.map((entry, index) => (
              <article
                key={`${entry.title}-${entry.company}`}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                className={`${styles.entryCard} ${index === activeIndex ? styles.entryCardActive : ""}`}
              >
                <div className={styles.entryContent}>
                  <div className={styles.entryHeader}>
                    <h2 className={styles.entryTitle}>{entry.title}</h2>
                    <p className={styles.entryCompany}>
                      <span className={styles.companyAccent}>{entry.company}</span>, {entry.location}
                    </p>
                    <p className={styles.entryDate}>{entry.date}</p>
                  </div>

                  <div className={styles.tagRow}>
                    {entry.tags.map((tag) => (
                      <TechTag key={tag} label={tag} />
                    ))}
                  </div>

                  <div className={styles.entryBody}>
                    <p className={styles.entrySummary}>{entry.summary}</p>
                    <ul className={styles.entryList}>
                      {entry.details.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={styles.mediaColumn}>
                  <MediaPlaceholder label={entry.mediaLabel} />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.bottomTimeline}>
          <div className={styles.bottomLabels}>
            {entries.map((entry, index) => {
              const pct = (index / Math.max(entries.length - 1, 1)) * 100;
              const isFirst = index === 0;
              const isLast = index === entries.length - 1;
              return (
                <button
                  key={`${entry.date}-${index}`}
                  type="button"
                  className={`${styles.bottomLabel} ${index === activeIndex ? styles.bottomLabelActive : ""}`}
                  style={{
                    left: `${pct}%`,
                    transform: isFirst ? "translateX(0%)" : isLast ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                  onClick={() => scrollToEntry(index)}
                  onMouseEnter={() => setHoveredStop(index)}
                  onMouseLeave={() => setHoveredStop(null)}
                >
                  {entry.date}
                </button>
              );
            })}
          </div>

          <div className={styles.bottomTrack}>
            <span className={styles.bottomTrackBase} />
            <span className={styles.bottomTrackFill} style={{ width: progressWidth }} />
            <div className={styles.bottomStops}>
              {entries.map((entry, index) => (
                <button
                  key={`${entry.title}-${index}`}
                  type="button"
                  aria-label={`Go to ${entry.title} at ${entry.company}`}
                  className={`${styles.bottomStop} ${index <= activeIndex ? styles.bottomStopActive : ""}`}
                  style={{ left: `${(index / Math.max(entries.length - 1, 1)) * 100}%` }}
                  onClick={() => scrollToEntry(index)}
                  onMouseEnter={() => setHoveredStop(index)}
                  onMouseLeave={() => setHoveredStop(null)}
                />
              ))}
            </div>
          </div>

          {hoveredStop !== null && (
            <div
              className={styles.stopPreview}
              style={{ left: `${Math.min(Math.max((hoveredStop / Math.max(entries.length - 1, 1)) * 100, 5), 95)}%` }}
            >
              <span className={styles.stopPreviewTitle}>{entries[hoveredStop].title}</span>
              <span className={styles.stopPreviewCompany}>{entries[hoveredStop].company}</span>
              <span className={styles.stopPreviewDate}>{entries[hoveredStop].date}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
