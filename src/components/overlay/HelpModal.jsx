"use client";

import Hint from "@/components/Hint";
import { shortcutRows } from "@/config/ui";
import Popup from "./Popup";
import styles from "./HelpModal.module.css";

/** The keys popup: every shortcut that works right now, and the [s] shortcuts toggle. */
export default function HelpModal({ onClose, keysOn, onToggleKeys }) {
  const foot = (
    <>
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
      <div className={styles.closeHint}>
        [esc]<Hint> or [?]</Hint> to close
      </div>
    </>
  );
  return (
    <Popup
      label="keys"
      name="keyboard shortcuts"
      onClose={onClose}
      className={styles.box}
      bodyClassName={styles.list}
      foot={foot}
    >
      {shortcutRows(keysOn).map((k) => (
        <div key={k.key + k.desc} className={styles.row}>
          <span className={styles.key}>{k.key}</span>
          <span className={styles.desc}>{k.desc}</span>
        </div>
      ))}
    </Popup>
  );
}
