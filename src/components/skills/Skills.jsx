import SectionFrame from "@/components/frame/SectionFrame";
import Hint from "@/components/Hint";
import { projects } from "@/data/projects";
import styles from "./Skills.module.css";

export default function Skills({ skills, active }) {
  return (
    <SectionFrame
      id="skills"
      sec={3}
      prefix={<Hint>[3] </Hint>}
      title="~/skills"
      right={"bar = share of " + projects.length + " projects · hover or tab for details"}
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
                <span className={s.coursework ? styles.course : styles.bar} aria-hidden="true">
                  {s.bar}
                </span>
                <span className={styles.count} aria-hidden="true">
                  {s.count}
                </span>
                <span className="sr-only">{s.coursework ? "coursework, " + s.tip : s.tip}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
