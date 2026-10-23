import SectionFrame from "@/components/frame/SectionFrame";
import Hint, { KeyLabel } from "@/components/Hint";
import styles from "./Skills.module.css";

export default function Skills({ skills, total, active }) {
  return (
    <SectionFrame
      id="skills"
      sec={3}
      prefix={<Hint>[3] </Hint>}
      title="~/skills"
      right={
        <>
          {"█ project ▓ job ▒ course · share of " + total}
          <KeyLabel> · hover or tab for details</KeyLabel>
        </>
      }
      active={active}
      className={styles.skills}
    >
      <div className={styles.grid}>
        {skills.map((g) => (
          <div key={g.label} className={styles.group}>
            <span className={styles.label}>{g.label}/</span>
            {g.items.map((s) => (
              // Focusable so keyboard users get the tooltip too; screen readers read the
              // details instead of the bar glyphs.
              <div
                key={s.name}
                data-tip={s.tip}
                data-tip-focus=""
                tabIndex={0}
                className={styles.row}
              >
                <span className={styles.raw}>{s.name}</span>
                <span className={styles.bar} aria-hidden="true">
                  {s.bar}
                </span>
                <span className={styles.count} aria-hidden="true">
                  {s.count}
                </span>
                <span className="sr-only">{s.tip}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
