// Tab inside a modal dialog (no DOM): where focus goes so it never leaves the dialog.

/**
 * `at` is the index of the focused control among the dialog's `count` tabbable controls,
 * or -1 when focus is on the dialog box itself (or anywhere else). Returns the index to
 * focus instead of the browser's own step, or null to leave Tab to the browser: Tab on
 * the last control goes to the first, Shift+Tab on the first control (or the box) to the
 * last. With no control at all it returns -1: stay on the box.
 */
export function wrapTab({ at, count, shift }) {
  if (count === 0) return -1;
  if (shift) return at <= 0 ? count - 1 : null;
  return at === count - 1 ? 0 : null;
}
