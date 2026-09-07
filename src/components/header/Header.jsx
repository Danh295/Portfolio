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
        <button type="button" onClick={onHome} data-key="h" data-tip="home" className={styles.home}>
          <span className={styles.key}>[h]</span>{" "}
          <span className={activeSec === 0 ? `${styles.label} ${styles.chip}` : styles.label}>
            ~/danny
          </span>
        </button>
        <div className={styles.links}>
          {SECTIONS.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => onSection(s.n)}
              data-key={s.n}
              data-tip={s.tip}
              className={styles.link}
              aria-current={activeSec === s.n ? "true" : undefined}
            >
              <span className={styles.key}>[{s.n}]</span>{" "}
              <span className={activeSec === s.n ? `${styles.label} ${styles.chip}` : styles.label}>
                {s.label}
              </span>
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
