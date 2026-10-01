"use client";

import { useEffect, useRef } from "react";
import { shortcutRows } from "@/config/ui";
import styles from "./HelpModal.module.css";

export default function HelpModal({ onClose, keysOn, onToggleKeys }) {
  const boxRef = useRef(null);
  // Focus moves into the dialog (so Tab/Enter don't operate the page behind it) and
  // back to wherever it was when the dialog closes.
  useEffect(() => {
    const prev = document.activeElement;
    boxRef.current?.focus({ preventScroll: true });
    return () => prev?.focus?.({ preventScroll: true });
  }, []);
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={boxRef}
        tabIndex={-1}
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-label="keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span>┤ keys ├</span>
          <button type="button" onClick={onClose} data-key="Escape" className={styles.close}>
            <span className={styles.dim}>[esc]</span> close
          </button>
        </div>
        <div className={styles.list}>
          {shortcutRows(keysOn).map((k) => (
            <div key={k.key} className={styles.row}>
              <span className={styles.key}>{k.key}</span>
              <span className={styles.desc}>{k.desc}</span>
            </div>
          ))}
        </div>
        <div className={styles.toggleRow}>
          <button
            type="button"
            onClick={onToggleKeys}
            data-key="s"
            aria-pressed={keysOn}
            className={styles.toggle}
          >
            <span className={styles.dim}>[s]</span> single-key shortcuts: {keysOn ? "on" : "off"}
          </button>
          <span className={styles.note}>enter, space, arrows and esc always work</span>
        </div>
        <div className={styles.foot}>{keysOn ? "[esc] or [?] to close" : "[esc] to close"}</div>
      </div>
    </div>
  );
}
