import SectionFrame from "@/components/frame/SectionFrame";
import Hint from "@/components/Hint";
import { projects, projectFolders } from "@/data/projects";
import { pad } from "@/lib/format";
import { fmtStamp, syncedAt, syncedCount } from "@/lib/github";
import styles from "./ProjectList.module.css";

// Rendered as a tree: "projects/" then ├── / └── per category.
const FOLDER_ROWS = projectFolders.map((key, i) => [
  i === 0 ? "" : i === projectFolders.length - 1 ? "└── " : "├── ",
  (key === "all" ? "projects" : key) + "/",
  key,
]);

export default function ProjectList({ list, filter, sel, active, listRef, onFilter, onOpen }) {
  return (
    <SectionFrame
      id="projects"
      sec={1}
      prefix={<Hint>[1] </Hint>}
      title="~/projects"
      right={
        <>
          <Hint>[j/k] move · </Hint>[↲] open<Hint> · [f] folder</Hint>
        </>
      }
      active={active}
      caret={sel < 0}
      className={styles.work}
    >
      <div className={styles.tree} role="group" aria-label="project folders">
        {FOLDER_ROWS.map(([prefix, name, key]) => {
          const count =
            key === "all" ? projects.length : projects.filter((p) => p.category === key).length;
          const on = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilter(key)}
              data-tip={on ? undefined : "cd " + name + " (" + count + ")"}
              aria-pressed={on}
              className={styles.folder}
            >
              <span className={styles.mid}>{prefix}</span>
              <span className={on ? styles.nameOn : styles.name}>{name}</span>
              <span className={styles.count}>{count}</span>
            </button>
          );
        })}
        {syncedAt && (
          <div
            className={styles.sync}
            data-tip={
              syncedCount(projects) +
              " repos pulled from GitHub at build time · refreshed by a daily deploy"
            }
          >
            <span>
              <span className={styles.syncDot}>●</span> synced with GitHub
            </span>
            <span className={styles.syncTime}>{fmtStamp(syncedAt)}</span>
          </div>
        )}
      </div>
      <div ref={listRef} className={styles.list}>
        {list.map((p, i) => {
          const on = sel === i && active;
          return (
            <button
              key={p.slug}
              type="button"
              data-row={i}
              aria-current={on ? "true" : undefined}
              onClick={() => onOpen(p.slug)}
              data-tip={p.purpose}
              className={on ? styles.rowOn : styles.row}
            >
              <span className={styles.no}>{pad(projects.indexOf(p) + 1)}</span>
              <span className={styles.title}>{p.title}</span>
              <span className={styles.small}>{p.category}</span>
              <span className={styles.org}>{p.org}</span>
              <span className={styles.small}>{p.year}</span>
              <span className={styles.arrow}>{on ? "↲" : "→"}</span>
            </button>
          );
        })}
      </div>
    </SectionFrame>
  );
}
