"use client";

import { BANNER } from "@/lib/ascii/banner";
import Hint from "@/components/Hint";
import { pstr } from "@/lib/shell/fs";
import { SHORTCUT_CMDS } from "@/lib/shell/spec";
import ShellPane from "./ShellPane";
import Vim from "./Vim";
import styles from "./Terminal.module.css";

/** Full-screen terminal mode. */
export default function Terminal({
  session,
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
  return (
    <div className={styles.term}>
      <div className={styles.head}>
        <span className={styles.mid}>danny@portfolio: {pstr(session.cwd)} — zsh</span>
        <button type="button" onClick={onExit} data-tip="exit or ctrl-d" className={styles.exit}>
          <span className={styles.dim}>[exit]</span> back to gui
        </button>
      </div>

      {vim ? (
        <Vim vim={vim} boxRef={vimRef} />
      ) : (
        <ShellPane
          variant="term"
          session={session}
          inputRef={inputRef}
          bodyRef={bodyRef}
          promptHidden={running}
          onRun={onRun}
          onInput={onInput}
          onKey={onKey}
          eggHandlers={eggHandlers}
          eggPreRef={eggPreRef}
          eggFxRef={eggFxRef}
          eggStatusRef={eggStatusRef}
        >
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
        </ShellPane>
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
