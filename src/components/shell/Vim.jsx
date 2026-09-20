import { matches, selection } from "@/lib/vim";
import styles from "./Vim.module.css";

const MODE_LABEL = { visual: "-- VISUAL --", vline: "-- VISUAL LINE --" };

// Split one line into styled runs: selection, search matches and the block cursor.
function runsFor(line, r, vim, sel, hits) {
  const len = Math.max(line.length, 1),
    marks = new Array(len).fill(0); // bit 1 = selected, bit 2 = match, bit 4 = cursor
  if (sel && r >= sel.r1 && r <= sel.r2) {
    const from = sel.linewise || r > sel.r1 ? 0 : sel.c1,
      to = sel.linewise || r < sel.r2 ? len - 1 : Math.min(len - 1, sel.c2);
    for (let i = from; i <= to; i++) marks[i] |= 1;
  }
  hits.forEach((h) => {
    if (h.r === r) for (let i = h.c; i < h.c + h.len && i < len; i++) marks[i] |= 2;
  });
  const showCursor = vim.mode !== "cmd" && vim.mode !== "search";
  if (showCursor && r === vim.r) marks[Math.min(vim.c, len - 1)] |= 4;
  const text = line.length ? line : " ",
    out = [];
  let start = 0;
  for (let i = 1; i <= len; i++) {
    if (i === len || marks[i] !== marks[start]) {
      out.push({ text: text.slice(start, i), mark: marks[start] });
      start = i;
    }
  }
  return out;
}

const markClass = (m) =>
  m & 4 ? styles.cursor : m & 1 ? styles.sel : m & 2 ? styles.match : undefined;

/** vim/less viewer for terminal mode. State and keys live in src/lib/vim.js. */
export default function Vim({ vim, boxRef }) {
  const n = vim.lines.length,
    modified = vim.undo.length > 0;
  const sel = vim.mode === "visual" || vim.mode === "vline" ? selection(vim) : null,
    hits = matches(vim);
  const pos =
    vim.r +
    1 +
    "," +
    (vim.c + 1) +
    "    " +
    (n <= 1
      ? "All"
      : vim.r === 0
        ? "Top"
        : vim.r === n - 1
          ? "Bot"
          : Math.round((vim.r / (n - 1)) * 100) + "%");
  const pendingKeys = vim.count + (vim.op || "") + vim.pending;
  const cmdline =
    vim.mode === "cmd"
      ? ":" + vim.cmd + "▌"
      : vim.mode === "search"
        ? (vim.sdir > 0 ? "/" : "?") + vim.cmd + "▌"
        : vim.msg || MODE_LABEL[vim.mode] || "";

  return (
    <div className={styles.wrap}>
      <div ref={boxRef} className={styles.box}>
        {vim.lines.map((line, i) => (
          <div
            key={i}
            data-vl={i}
            className={`${i === vim.r ? styles.rowCur : styles.row} ${vim.number ? "" : styles.noNumber}`}
          >
            <span className={styles.n}>{vim.number ? i + 1 : ""}</span>
            <span className={line.startsWith("#") ? styles.textH : styles.text}>
              {runsFor(line, i, vim, sel, hits).map((run, j) => (
                <span key={j} className={markClass(run.mark)}>
                  {run.text}
                </span>
              ))}
            </span>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 24 - n) }, (_, i) => (
          <div key={"~" + i} className={styles.tilde}>
            ~
          </div>
        ))}
      </div>
      <div className={styles.status}>
        <span>
          &quot;{vim.name}&quot; [readonly]{modified ? " [+]" : ""} {n}L
        </span>
        <span>{pos}</span>
      </div>
      <div className={styles.cmdline}>
        <span className={/^E\d+:/.test(cmdline) ? styles.err : undefined}>{cmdline}</span>
        <span className={styles.showcmd}>{pendingKeys}</span>
      </div>
    </div>
  );
}
