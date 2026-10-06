"use client";

import { useRef } from "react";
import { pstr } from "@/lib/shell/fs";
import { promptText } from "@/lib/shell/spec";
import { useStickToBottom } from "@/lib/useStickToBottom";
import TermLines from "./TermLines";
import styles from "./ShellPane.module.css";

const LABELS = {
  term: { placeholder: "try: ls", input: "terminal input", log: "terminal output" },
  embed: { placeholder: "help", input: "shell input", log: "shell output" },
};

/**
 * The shell pane both shells frame: the scrolling output log with the prompt under it.
 * It keeps itself pinned to the latest prompt and focuses the prompt on a click (not
 * after a drag-select). `variant` ("term" or "embed") picks the prompt, labels and sizing.
 * `children` go above the log (terminal mode's banner). `bodyRef` is the scroll box, for a
 * caller that needs it (the egg checks it's on screen). `promptHidden`: a program (./egg)
 * has the foreground; the input stays, invisible, to take its keys. The egg props are
 * terminal mode's, for the inline ./egg (see TermLines).
 */
export default function ShellPane({
  variant,
  session,
  inputRef,
  bodyRef,
  promptHidden = false,
  children,
  onRun,
  onInput,
  onKey,
  eggHandlers,
  eggPreRef,
  eggFxRef,
  eggStatusRef,
}) {
  const ownBodyRef = useRef(null),
    contentRef = useRef(null);
  const boxRef = bodyRef ?? ownBodyRef;
  const labels = LABELS[variant];
  useStickToBottom(boxRef, contentRef, session.lines);

  const focus = () => {
    if (inputRef.current && window.getSelection().isCollapsed)
      inputRef.current.focus({ preventScroll: true });
  };
  return (
    <div ref={boxRef} onClick={focus} className={`${styles.body} ${styles[variant]}`}>
      <div ref={contentRef} className={styles.content}>
        {children}
        <div role="log" aria-label={labels.log}>
          <TermLines
            lines={session.lines}
            variant={variant}
            onRun={onRun}
            eggHandlers={eggHandlers}
            eggPreRef={eggPreRef}
            eggFxRef={eggFxRef}
            eggStatusRef={eggStatusRef}
          />
        </div>
        <div className={promptHidden ? styles.promptHidden : styles.promptRow}>
          {!promptHidden && (
            <span className={styles.prompt}>{promptText(variant, pstr(session.cwd))}</span>
          )}
          <input
            ref={inputRef}
            value={session.input}
            onChange={(e) => onInput(e.target.value.replaceAll("`", ""))}
            onKeyDown={onKey}
            placeholder={labels.placeholder}
            aria-label={labels.input}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  );
}
