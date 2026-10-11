"use client";

import Popup from "./Popup";
import styles from "./MenuModal.module.css";

/**
 * The phone's menu popup: what the nav's terminal / theme / keys buttons do, which don't
 * fit on the one-row nav (Header.module.css hides them under 600px). A row closes the menu
 * first (App), so `keys` swaps to the keys popup like `?` does.
 */
export default function MenuModal({ dark, shellOpen, onClose, onShell, onTheme, onHelp }) {
  return (
    <Popup label="menu" onClose={onClose} className={styles.box} bodyClassName={styles.body}>
      <button type="button" onClick={onShell} aria-pressed={shellOpen} className={styles.row}>
        terminal
      </button>
      <button type="button" onClick={onTheme} className={styles.row}>
        {dark ? "light" : "dark"}
      </button>
      <button type="button" onClick={onHelp} className={styles.row}>
        keys
      </button>
    </Popup>
  );
}
