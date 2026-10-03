"use client";

import { useRef } from "react";
import { useStickToBottom } from "@/lib/useStickToBottom";
import TermLines from "./TermLines";
import styles from "./MiniShell.module.css";

/** The embedded shell panel opened with ` in gui mode. */
export default function MiniShell({
  session,
  cwd,
  panelRef,
  bodyRef,
  inputRef,
  onRun,
  onInput,
  onKey,
  onClose,
  inert,
}) {
  const contentRef = useRef(null);
  // Opens (and stays) at the latest prompt, even after earlier use.
  useStickToBottom(bodyRef, contentRef, session.lines);

  const focus = () => {
    if (inputRef.current && window.getSelection().isCollapsed)
      inputRef.current.focus({ preventScroll: true });
  };
  return (
    <div
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-label="embedded shell"
      inert={inert}
    >
      <div className={styles.head}>
        <span>┤ danny@portfolio: {cwd} ├</span>
        <button type="button" onClick={onClose} data-key="Escape" className={styles.close}>
          <span className={styles.dim}>[esc]</span> close
        </button>
      </div>
      <div ref={bodyRef} onClick={focus} className={styles.body}>
        <div ref={contentRef} className={styles.content}>
          <TermLines lines={session.lines} variant="embed" onRun={onRun} />
          <div className={styles.promptRow}>
            <span className={styles.mid}>{cwd} %</span>
            <input
              ref={inputRef}
              value={session.input}
              onChange={(e) => onInput(e.target.value.replaceAll("`", ""))}
              onKeyDown={onKey}
              placeholder="help"
              aria-label="shell input"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={styles.input}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
