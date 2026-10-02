import styles from "./Header.module.css";
import Hint from "@/components/Hint";

const SECTIONS = [
  { n: 1, label: "projects", tip: "jump to projects" },
  { n: 2, label: "experience", tip: "jump to experience" },
  { n: 3, label: "skills", tip: "jump to skills" },
];

export default function Header({
  navRef,
  activeSec,
  dark,
  shellOpen,
  onHome,
  onSection,
  onShell,
  onTheme,
  onHelp,
}) {
  return (
    <nav ref={navRef} className={styles.nav}>
      <div className={styles.inner}>
        <button
          type="button"
          onClick={onHome}
          data-key="h"
          data-tip="home"
          className={activeSec === 0 ? `${styles.home} ${styles.chip}` : styles.home}
          aria-current={activeSec === 0 ? "true" : undefined}
        >
          <Hint className={styles.key}>[h] </Hint>
          ~/danny
        </button>
        <div className={styles.links}>
          {SECTIONS.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => onSection(s.n)}
              data-key={s.n}
              data-tip={s.tip}
              className={activeSec === s.n ? `${styles.link} ${styles.chip}` : styles.link}
              aria-current={activeSec === s.n ? "true" : undefined}
            >
              <Hint className={styles.key}>[{s.n}] </Hint>
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onShell}
            data-key="`"
            data-tip="embedded shell"
            className={shellOpen ? `${styles.btn} ${styles.btnOn}` : styles.btn}
            aria-pressed={shellOpen}
          >
            <Hint className={styles.dim}>[`] </Hint>
            terminal
          </button>
          <button
            type="button"
            onClick={onTheme}
            data-key="t"
            data-tip="switch theme"
            className={styles.btn}
          >
            <Hint className={styles.dim}>[t] </Hint>
            {dark ? "light" : "dark"}
          </button>
          <button
            type="button"
            onClick={onHelp}
            data-key="?"
            data-tip="keyboard shortcuts"
            className={styles.btn}
          >
            <Hint className={styles.dim}>[?] </Hint>
            keys
          </button>
        </div>
      </div>
    </nav>
  );
}
