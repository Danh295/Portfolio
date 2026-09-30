// Type a whole block of rendered content in, e.g. a section's rows when it's first
// reached. Imperative, on the text nodes themselves: each non-space character becomes a
// non-breaking space of the same width (the font is monospace), so nothing reflows while
// it types, and each node then types back to its own text, staggered top to bottom.

const BLANK = " ";
const CHAR_MS = 9, // per character…
  NODE_MAX_MS = 260, // …but no single node takes longer than this
  PX_DELAY = 0.55; // start delay per px below the block's top (types top-down)

const blankOf = (s) => s.replace(/\S/g, BLANK);

/**
 * Blank every text node under `root` except those inside `skip`. Returns the entries to
 * hand to typeIn (or restore).
 */
export function blankText(root, skip) {
  const out = [],
    walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || (skip && skip.contains(n))) continue;
    const text = n.nodeValue,
      shown = blankOf(text);
    n.nodeValue = shown;
    out.push({ node: n, text, shown });
  }
  return out;
}

/** Put every entry's text back (skips nodes React has since rewritten). */
export function restoreText(entries) {
  for (const e of entries) if (e.node.nodeValue === e.shown) e.node.nodeValue = e.text;
}

/** Type blanked entries back in. Returns a cancel function (which restores the text). */
export function typeIn(entries, root) {
  const top = root.getBoundingClientRect().top;
  const jobs = entries.map((e) => {
    const el = e.node.parentElement,
      y = el ? el.getBoundingClientRect().top - top : 0,
      len = e.text.length;
    return { ...e, delay: Math.max(0, y) * PX_DELAY, dur: Math.min(NODE_MAX_MS, len * CHAR_MS) };
  });
  const t0 = performance.now();
  let raf = 0;
  const step = (now) => {
    const t = now - t0;
    let left = 0;
    for (const j of jobs) {
      if (j.done) continue;
      // React rewrote this node mid-way (new data): leave its new text alone.
      if (j.node.nodeValue !== j.shown) {
        j.done = true;
        continue;
      }
      const p = (t - j.delay) / (j.dur || 1);
      if (p <= 0) {
        left++;
        continue;
      }
      const n = Math.min(j.text.length, Math.ceil(p * j.text.length));
      j.shown = n >= j.text.length ? j.text : j.text.slice(0, n) + blankOf(j.text.slice(n));
      j.node.nodeValue = j.shown;
      if (n >= j.text.length) j.done = true;
      else left++;
    }
    if (left) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    restoreText(jobs.filter((j) => !j.done));
  };
}
