import { site } from "@/config/site";
import Hint from "@/components/Hint";
import styles from "./BottomBar.module.css";

export default function BottomBar({ spark, barRef, inert }) {
  return (
    <footer ref={barRef} className={styles.bar} aria-label="links and activity" inert={inert}>
      <div className={styles.inner}>
        <a href={`mailto:${site.email}`} data-key="e" data-tip={site.email}>
          <Hint className={styles.key}>[e] </Hint>
          email ↗
        </a>
        <a
          href={site.github.profile}
          data-key="g"
          target="_blank"
          rel="noreferrer"
          data-tip={site.github.profile.replace("https://", "")}
        >
          <Hint className={styles.key}>[g] </Hint>
          GitHub ↗
        </a>
        <a href={site.linkedin} target="_blank" rel="noreferrer" data-key="l" data-tip="LinkedIn">
          <Hint className={styles.key}>[l] </Hint>
          LinkedIn ↗
        </a>
        <a href={site.resume} target="_blank" rel="noreferrer" data-key="r" data-tip="pdf">
          <Hint className={styles.key}>[r] </Hint>
          resume ↗
        </a>
        {spark && (
          <span data-tip={spark.tip} className={styles.spark}>
            git log · 12w <span className={styles.bars}>{spark.bars}</span>
          </span>
        )}
      </div>
    </footer>
  );
}
