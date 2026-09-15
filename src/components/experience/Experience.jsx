import SectionFrame from "@/components/frame/SectionFrame";
import { experienceEntries } from "@/data/experience";
import { pad } from "@/lib/format";
import styles from "./Experience.module.css";

const early = experienceEntries.filter((e) => e.early);

export default function Experience({
  expSel,
  expOpen,
  expEarlier,
  earlierSel,
  active,
  reduce,
  onToggle,
  onToggleEarlier,
}) {
  return (
    <SectionFrame
      id="experience"
      sec={2}
      prefix="[2] "
      title="~/experience"
      right="[j/k] move · [↲] expand"
      active={active}
      caret={expSel < 0}
      reduce={reduce}
      className={styles.exp}
    >
      {experienceEntries.map((e, i) => {
        if (e.early && !expEarlier) return null;
        const sel = expSel === i && active,
          open = expOpen === i;
        return (
          <div key={e.company + e.title} data-exprow={i} className={styles.item}>
            <button
              type="button"
              onClick={() => onToggle(i)}
              aria-expanded={open}
              className={sel ? styles.rowOn : styles.row}
            >
              <div className={styles.dateCol}>
                <span className={styles.faded}>{e.date}</span>
                {e.now && <span className={sel ? styles.nowOn : styles.now}>● now</span>}
              </div>
              <div className={styles.titleCol}>
                <span className={styles.title}>{e.title}</span>
                <span className={styles.company}>
                  <span className={styles.raw}>{e.company}</span> · {e.loc}
                </span>
              </div>
              <p className={styles.summary}>{e.summary}</p>
              <span className={styles.caret}>{open ? "−" : "+"}</span>
            </button>
            {open && (
              <div className={styles.details}>
                <span className={styles.detailsKey}>details/</span>
                <div className={styles.detailList}>
                  {e.details.map((d, j) => (
                    <div key={j} className={styles.detail}>
                      <span className={styles.n}>{pad(j + 1)}</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {early.length > 0 && (
        <button
          type="button"
          onClick={onToggleEarlier}
          aria-expanded={expEarlier}
          data-earlier=""
          data-exprow={
            expEarlier ? experienceEntries.length : experienceEntries.length - early.length
          }
          data-tip={expEarlier ? "collapse" : "show student nonprofit roles"}
          className={earlierSel ? `${styles.earlier} ${styles.earlierOn}` : styles.earlier}
        >
          <span>{early[early.length - 1].date}</span>
          <span>
            {expEarlier ? "hide earlier roles" : "earlier · " + early.length + " roles · "}
            {!expEarlier && (
              <span className={styles.raw}>{early.map((e) => e.company).join(", ")}</span>
            )}
          </span>
          <span>{expEarlier ? "−" : "+"}</span>
        </button>
      )}
    </SectionFrame>
  );
}
