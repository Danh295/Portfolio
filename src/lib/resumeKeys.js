// What a keydown means on the resume page: one pure decision, like keyRouter.js for the app.

/** The actions a key can ask for: shared with the viewer, which carries them out. */
export const ACTION = {
  ZOOM_IN: "zoomIn",
  ZOOM_OUT: "zoomOut",
  FIT: "fit",
  DOWNLOAD: "download",
  PRINT: "print",
  LEAVE: "leave",
};

const ACTIONS = {
  "+": ACTION.ZOOM_IN,
  "=": ACTION.ZOOM_IN,
  "-": ACTION.ZOOM_OUT,
  0: ACTION.FIT,
  d: ACTION.DOWNLOAD,
  p: ACTION.PRINT,
};

// Held zoom keys keep zooming; download and print act once per press.
const ONCE = new Set([ACTION.DOWNLOAD, ACTION.PRINT]);

/**
 * The action a key asks for, or null to leave it to the browser.
 * `facts`: { key, ctrl, meta, alt, repeat, keysOn }. Cmd/Ctrl/Alt combinations are the
 * browser's (Cmd+P prints the page, Ctrl+- zooms it). Every key but Esc is a one-character
 * shortcut, so they go quiet while those are off (WCAG 2.1.4).
 */
export function resumeKey({ key, ctrl, meta, alt, repeat, keysOn }) {
  if (ctrl || meta || alt || typeof key !== "string") return null;
  // Esc leaves the page. It is not a one-character shortcut, so it works with those off too.
  if (key === "Escape") return repeat ? null : ACTION.LEAVE;
  if (!keysOn) return null;
  const action = ACTIONS[key.toLowerCase()] ?? null;
  return action && repeat && ONCE.has(action) ? null : action;
}
