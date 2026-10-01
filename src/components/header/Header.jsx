import styles from "./Header.module.css";

const SECTIONS = [
  { n: 1, label: "projects", tip: "jump to projects" },
  { n: 2, label: "experience", tip: "jump to experience" },
  { n: 3, label: "skills", tip: "jump to skills" },
];

export default function Header({
  navRef,
  activeSec,
  dark,
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
        >
          <span className={styles.key}>[h]</span> ~/danny
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
              <span className={styles.key}>[{s.n}]</span> {s.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onShell}
            data-key="`"
            data-tip="embedded shell"
            className={styles.btn}
          >
            <span className={styles.dim}>[`]</span> terminal
          </button>
          <button
            type="button"
            onClick={onTheme}
            data-key="t"
            data-tip="switch theme"
            className={styles.btn}
          >
            <span className={styles.dim}>[t]</span> {dark ? "light" : "dark"}
          </button>
          <button
            type="button"
            onClick={onHelp}
            data-key="?"
            data-tip="keyboard shortcuts"
            className={styles.btn}
          >
            <span className={styles.dim}>[?]</span> keys
          </button>
        </div>
      </div>
    </nav>
  );
}
