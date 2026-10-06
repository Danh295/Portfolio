// ↑/↓ through a session's prompt history. `hi` counts back from the newest entry (0);
// -1 is the fresh prompt.

/**
 * `dir` 1 is ↑ (older), -1 is ↓ (newer). Returns the next `{ hi, input }`, or null when
 * the key does nothing (↑ with no history; ↓ at the fresh prompt keeps what's typed).
 */
export function histStep(hist, hi, dir) {
  if (dir < 0 && hi < 0) return null;
  const next = Math.min(hist.length - 1, hi + dir);
  if (next < 0 && dir > 0) return null;
  return { hi: next, input: next >= 0 ? hist[hist.length - 1 - next] : "" };
}
