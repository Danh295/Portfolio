"use client";

import { useEffect, useRef } from "react";
import { about } from "@/data/home";
import { joinParagraphs } from "@/lib/format";
import styles from "./AboutModal.module.css";

// Same paragraph rules as ~/about.txt in the shell: a blank line between strings that
// don't carry their own breaks; a single "\n" is a line break inside a paragraph.
const PARAGRAPHS = joinParagraphs(about)
  .trim()
  .split(/\n{2,}/)
  .map((p) => p.split("\n"));

/** The full about text, opened from the hero's "more…" (or `a`). */
export default function AboutModal({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => prev?.focus?.({ preventScroll: true });
  }, []);

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span id="about-title">┤ ~/about.txt ├</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            data-key="Escape"
            className={styles.close}
          >
            <span className={styles.dim}>[esc]</span> close
          </button>
        </div>
        <div className={styles.body}>
          {PARAGRAPHS.map((lines, i) => (
            <p key={i} className={styles.p}>
              {lines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>
        <div className={styles.foot}>also in the shell: cat about.txt</div>
      </div>
    </div>
  );
}
