"use client";

import { useEffect, useRef } from "react";
import { BANNER } from "@/lib/ascii/banner";
import Hint, { KeyLabel } from "@/components/Hint";
import { pstr } from "@/lib/shell/fs";
import { SHORTCUT_CMDS } from "@/lib/shell/spec";
import { useVisualViewportFrame } from "@/lib/useVisualViewportFrame";
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
  eggTouch,
  running,
  keysOn = true,
  pressedTab,
  onShortcut,
  onRun,
  onInput,
  onKey,
  onExit,
}) {
  const frameRef = useRef(null),
    tabsRef = useRef(null);
  useVisualViewportFrame(frameRef);
  // The shortcut tabs scroll sideways when they don't fit; fade the edge that has more, so
  // that shows (Terminal.module.css reads --fade-l / --fade-r).
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const update = () => {
      const max = tabs.scrollWidth - tabs.clientWidth;
      tabs.style.setProperty("--fade-l", tabs.scrollLeft > 2 ? "28px" : "0px");
      tabs.style.setProperty("--fade-r", tabs.scrollLeft < max - 2 ? "28px" : "0px");
    };
    update();
    tabs.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(tabs);
    return () => {
      tabs.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={frameRef} className={styles.term}>
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
          eggTouch={eggTouch}
        >
          <pre className={styles.banner} role="img" aria-label="danny hu">
            {BANNER}
          </pre>
          <div className={styles.mid}>
            zsh 5.9 · danny@portfolio · type <span className={styles.fg}>help</span> for commands
          </div>
          <div className={`${styles.mid} ${styles.intro}`}>
            <KeyLabel>
              [tab] completes · [↑↓] history · <Hint>[0–9] shortcuts · </Hint>
            </KeyLabel>
            <span className={styles.fg}>exit</span> or <span className={styles.fg}>ctrl-d</span>{" "}
            leaves
          </div>
        </ShellPane>
      )}

      <div ref={tabsRef} className={styles.tabs}>
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
