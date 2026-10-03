"use client";

import { useRef } from "react";
import { BANNER } from "@/lib/ascii/banner";
import Hint from "@/components/Hint";
import { SHORTCUT_CMDS } from "@/lib/shell/spec";
import { useStickToBottom } from "@/lib/useStickToBottom";
import TermLines from "./TermLines";
import Vim from "./Vim";
import styles from "./Terminal.module.css";

/** Full-screen terminal mode. */
export default function Terminal({
  session,
  cwd,
  bodyRef,
  inputRef,
  vim,
  vimRef,
  spark,
  eggHandlers,
  eggPreRef,
  eggFxRef,
  eggStatusRef,
  running,
  keysOn = true,
  pressedTab,
  onShortcut,
  onRun,
  onInput,
  onKey,
  onExit,
}) {
  const contentRef = useRef(null);

  // Keep the prompt (or the running egg) in view, unless the user scrolled up.
  useStickToBottom(bodyRef, contentRef, session.lines, !!vim);

  const focus = () => {
    if (inputRef.current && window.getSelection().isCollapsed)
      inputRef.current.focus({ preventScroll: true });
  };
  return (
    <div className={styles.term}>
      <div className={styles.head}>
        <span className={styles.mid}>danny@portfolio: {cwd} — zsh</span>
        <button type="button" onClick={onExit} data-tip="exit or ctrl-d" className={styles.exit}>
          <span className={styles.dim}>[exit]</span> back to gui
        </button>
      </div>

      {vim ? (
        <Vim vim={vim} boxRef={vimRef} />
      ) : (
        <div ref={bodyRef} onClick={focus} className={styles.body}>
          <div ref={contentRef} className={styles.content}>
            <pre className={styles.banner} role="img" aria-label="danny hu">
              {BANNER}
            </pre>
            <div className={styles.mid}>
              zsh 5.9 · danny@portfolio · type <span className={styles.fg}>help</span> for commands
            </div>
            <div className={`${styles.mid} ${styles.intro}`}>
              [tab] completes · [↑↓] history · <Hint>[0–9] shortcuts · </Hint>
              <span className={styles.fg}>exit</span> or <span className={styles.fg}>ctrl-d</span>{" "}
              leaves
            </div>
            <div role="log" aria-label="terminal output">
              <TermLines
                lines={session.lines}
                variant="term"
                onRun={onRun}
                eggHandlers={eggHandlers}
                eggPreRef={eggPreRef}
                eggFxRef={eggFxRef}
                eggStatusRef={eggStatusRef}
              />
            </div>
            {/* While ./egg runs there is no prompt; the input stays (invisible) to take keys. */}
            <div className={running ? styles.promptHidden : styles.promptRow}>
              {!running && <span className={styles.prompt}>danny@portfolio {cwd} %</span>}
              <input
                ref={inputRef}
                value={session.input}
                onChange={(e) => onInput(e.target.value.replaceAll("`", ""))}
                onKeyDown={onKey}
                placeholder="try: ls"
                aria-label="terminal input"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className={styles.input}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        {SHORTCUT_CMDS.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => onShortcut(i)}
            data-tip={"run: " + c + (keysOn ? " (or press " + i + ")" : "")}
            aria-pressed={pressedTab === i}
            className={pressedTab === i ? `${styles.tab} ${styles.tabOn}` : styles.tab}
          >
            <Hint className={styles.mid}>{i}:</Hint>
            {c}
          </button>
        ))}
        {spark && (
          <span data-tip={spark.tip} className={styles.spark}>
            <span className={`${styles.mid} ${styles.sparkLabel}`}>git log · 12w</span>
            <span className={styles.bars}>{spark.bars}</span>
          </span>
        )}
      </div>
    </div>
  );
}
