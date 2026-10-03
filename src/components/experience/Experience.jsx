import SectionFrame from "@/components/frame/SectionFrame";
import Hint from "@/components/Hint";
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
      prefix={<Hint>[2] </Hint>}
      title="~/experience"
      right={
        <>
          <Hint>[j/k] move · </Hint>[↲] expand
        </>
      }
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
              aria-current={sel ? "true" : undefined}
              className={sel ? styles.rowOn : styles.row}
            >
              {/* Spans, not divs/p: a button may only hold phrasing content (they're grid
                  items, so they lay out as blocks anyway). */}
              <span className={styles.dateCol}>
                <span className={styles.faded}>{e.date}</span>
                {e.now && <span className={sel ? styles.nowOn : styles.now}>● now</span>}
              </span>
              <span className={styles.titleCol}>
                <span className={styles.title}>{e.title}</span>
                <span className={styles.company}>
                  <span className={styles.raw}>{e.company}</span> · {e.loc}
                </span>
              </span>
              <span className={styles.summary}>{e.summary}</span>
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
          aria-current={earlierSel ? "true" : undefined}
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
