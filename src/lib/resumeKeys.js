// What a keydown means on the resume page: one pure decision, like keyRouter.js for the app.

const ACTIONS = {
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  0: "fit",
  d: "download",
  p: "print",
};

// Held zoom keys keep zooming; download and print act once per press.
const ONCE = new Set(["download", "print"]);

/**
 * The action a key asks for, or null to leave it to the browser.
 * `facts`: { key, ctrl, meta, alt, repeat, keysOn }. Cmd/Ctrl/Alt combinations are the
 * browser's (Cmd+P prints the page, Ctrl+- zooms it), and every key here is a one-character
 * shortcut, so all of them go quiet while those are off (WCAG 2.1.4).
 */
export function resumeKey({ key, ctrl, meta, alt, repeat, keysOn }) {
  if (ctrl || meta || alt || !keysOn || typeof key !== "string") return null;
  const action = ACTIONS[key.toLowerCase()] ?? null;
  return action && repeat && ONCE.has(action) ? null : action;
}
