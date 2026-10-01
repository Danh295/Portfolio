import SectionFrame from "@/components/frame/SectionFrame";
import Hint from "@/components/Hint";
import { projects } from "@/data/projects";
import styles from "./Skills.module.css";

export default function Skills({ skills, active, reduce }) {
  return (
    <SectionFrame
      id="skills"
      sec={3}
      prefix={<Hint>[3] </Hint>}
      title="~/skills"
      right={"bar = share of " + projects.length + " projects · hover for details"}
      active={active}
      reduce={reduce}
      className={styles.skills}
    >
      <div className={styles.grid}>
        {skills.map((g) => (
          <div key={g.label} className={styles.group}>
            <span className={styles.label}>{g.label}/</span>
            {g.items.map((s) => (
              <div key={s.name} data-tip={s.tip} className={styles.row}>
                <span className={styles.raw}>{s.name}</span>
                <span className={s.coursework ? styles.course : styles.bar}>{s.bar}</span>
                <span className={styles.count}>{s.count}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
