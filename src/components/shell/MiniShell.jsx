"use client";

import { pstr } from "@/lib/shell/fs";
import ShellPane from "./ShellPane";
import styles from "./MiniShell.module.css";

/** The embedded shell panel opened with ` in gui mode. */
export default function MiniShell({
  session,
  panelRef,
  inputRef,
  onRun,
  onInput,
  onKey,
  onClose,
  inert,
}) {
  return (
    <div
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-label="embedded shell"
      inert={inert}
    >
      <div className={styles.head}>
        <span>┤ danny@portfolio: {pstr(session.cwd)} ├</span>
        <button type="button" onClick={onClose} data-key="Escape" className={styles.close}>
          <span className={styles.dim}>[esc]</span> close
        </button>
      </div>
      <ShellPane
        variant="embed"
        session={session}
        inputRef={inputRef}
        onRun={onRun}
        onInput={onInput}
        onKey={onKey}
      />
    </div>
  );
}
