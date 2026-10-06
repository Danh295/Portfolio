"use client";

import { about } from "@/data/home";
import { joinParagraphs } from "@/lib/format";
import Popup from "./Popup";
import styles from "./AboutModal.module.css";

// Same paragraph rules as ~/about.txt in the shell: a blank line between strings that
// don't carry their own breaks; a single "\n" is a line break inside a paragraph.
const PARAGRAPHS = joinParagraphs(about)
  .trim()
  .split(/\n{2,}/)
  .map((p) => p.split("\n"));

/** The more… popup: the full about text, opened from the hero's "more…" (or `m`). */
export default function AboutModal({ onClose }) {
  return (
    <Popup
      label="~/about.txt"
      onClose={onClose}
      className={styles.box}
      bodyClassName={styles.body}
      footClassName={styles.foot}
      foot="also in the shell: cat about.txt"
    >
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
    </Popup>
  );
}
