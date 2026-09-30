import EggCanvas from "@/components/egg/EggCanvas";
import styles from "./TermLines.module.css";

/**
 * Renders shell output lines (see src/lib/shell/exec.js for the line types).
 * `variant` is "term" (full-screen) or "embed" (mini shell); they differ in sizing.
 * The egg props are passed only by the full terminal: the last `egg` line hosts the inline game.
 */
export default function TermLines({
  lines,
  variant,
  onRun,
  eggHandlers,
  eggPreRef,
  eggFxRef,
  eggStatusRef,
}) {
  const v = variant === "term" ? styles.term : styles.embed;
  const prompt = variant === "term" ? "danny@portfolio " : "";
  return lines.map((l, i) => {
    const key = i;
    const run = l.cmd ? () => onRun(l.cmd) : l.t === "hint" ? () => onRun(l.text) : undefined;
    switch (l.t) {
      case "cmd":
        return (
          <div key={key} className={`${styles.cmd} ${v}`}>
            <span className={styles.mid}>
              {prompt}
              {l.cwd} %
            </span>
            <span>{l.text}</span>
          </div>
        );
      case "txt":
        return (
          <div key={key} className={`${styles.txt} ${v}`}>
            {l.text}
          </div>
        );
      case "dim":
        return (
          <div key={key} className={`${styles.txt} ${styles.mid} ${v}`}>
            {l.text}
          </div>
        );
      case "hint":
        return (
          <button key={key} type="button" onClick={run} className={styles.hint}>
            try: {l.text}
          </button>
        );
      case "err":
        return (
          <div key={key} className={styles.txt}>
            {variant === "embed" && <span className={styles.bang}>!</span>}
            {variant === "embed" && " "}
            {l.text}
          </div>
        );
      case "h":
        return (
          <div key={key} className={`${styles.h} ${v}`}>
            {l.text}
          </div>
        );
      case "kv":
        return (
          <div key={key} className={`${styles.kv} ${v}`}>
            <span className={styles.mid}>{l.k}</span>
            <span className={styles.kvVal}>{l.v}</span>
          </div>
        );
      case "help":
        return (
          <div key={key} className={styles.help}>
            {[l.left, l.right].map((col, c) => (
              <div key={c} className={`${styles.helpCol} ${v}`}>
                {col.map(([k, d]) => (
                  <div key={k} className={styles.helpRow}>
                    <span>{k}</span>
                    <span className={styles.mid}>{d}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      case "link":
        return (
          <div key={key} className={`${styles.kv} ${v}`}>
            <span className={styles.mid}>{l.k}</span>
            <a
              href={l.href}
              target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              data-tip={variant === "term" ? l.href : undefined}
              className={styles.link}
            >
              {l.text}
            </a>
          </div>
        );
      case "ls":
        return (
          <div key={key} className={`${styles.ls} ${v}`}>
            {l.items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={() => onRun(it.cmd)}
                data-tip={it.tip}
                className={styles.lsItem}
              >
                {it.label}
              </button>
            ))}
          </div>
        );
      case "dir":
        return (
          <div key={key} className={styles.treeRow}>
            <span className={styles.mid}>{l.prefix}</span>
            <button type="button" onClick={run} className={`${styles.treeBtn} ${styles.bold}`}>
              {l.name}
            </button>
          </div>
        );
      case "file":
        return (
          <div key={key} className={styles.treeRow}>
            <span className={styles.mid}>{l.prefix}</span>
            <button type="button" onClick={run} data-tip={l.tip} className={styles.treeBtn}>
              {l.name}
            </button>
            {variant === "term" && l.meta && <span className={styles.meta}>{l.meta}</span>}
          </div>
        );
      case "exp":
        return variant === "term" ? (
          <div key={key} className={styles.expTerm}>
            <span className={styles.mid}>{l.date}</span>
            <div className={styles.col}>
              <span>
                {l.title} <span className={styles.mid}>@</span> {l.company}
              </span>
              <span className={`${styles.mid} ${styles.expSum}`}>{l.summary}</span>
            </div>
          </div>
        ) : (
          <div key={key} className={styles.expEmbed}>
            <span>
              {l.title} @ {l.company}
            </span>
            <span className={styles.mid}>{l.date}</span>
          </div>
        );
      case "bar":
        return (
          <div key={key} data-tip={l.tip} className={`${styles.bar} ${v}`}>
            <span>{l.name}</span>
            <span className={styles.barGlyphs}>{l.bar}</span>
            <span className={styles.mid}>{l.count}</span>
          </div>
        );
      case "egg":
        if (!eggPreRef) return null;
        return (
          <div key={key} className={styles.egg}>
            <div className={styles.eggStage}>
              <EggCanvas
                preRef={eggPreRef}
                fxRef={eggFxRef}
                handlers={eggHandlers}
                label="ascii egg minigame"
              />
            </div>
            <div ref={eggStatusRef} className={styles.eggStatus} />
          </div>
        );
      default:
        return null;
    }
  });
}
