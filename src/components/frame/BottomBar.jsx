import { site } from "@/config/site";
import styles from "./BottomBar.module.css";

export default function BottomBar({ spark, barRef }) {
  return (
    <div ref={barRef} className={styles.bar}>
      <div className={styles.inner}>
        <a href={`mailto:${site.email}`} data-key="e" data-tip={site.email}>
          <span className={styles.key}>[e]</span> email ↗
        </a>
        <a
          href={site.github.profile}
          data-key="g"
          target="_blank"
          rel="noreferrer"
          data-tip={site.github.profile.replace("https://", "")}
        >
          <span className={styles.key}>[g]</span> GitHub ↗
        </a>
        <a href={site.linkedin} target="_blank" rel="noreferrer" data-key="l" data-tip="LinkedIn">
          <span className={styles.key}>[l]</span> LinkedIn ↗
        </a>
        <a href={site.resume} target="_blank" rel="noreferrer" data-key="r" data-tip="pdf">
          <span className={styles.key}>[r]</span> resume ↗
        </a>
        {spark && (
          <span data-tip={spark.tip} className={styles.spark}>
            git log · 12w <span className={styles.bars}>{spark.bars}</span>
          </span>
        )}
      </div>
    </div>
  );
}
