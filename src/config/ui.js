// Design options from the v4 handoff. Defaults match the handoff.
export const ui = {
  introFx: "boot", // boot | wipe | none
  headerFx: "type", // decode | type | shade | none
  eggClock: "seconds", // seconds (goal 6.50s) | minutes (goal 6:30)
  barStyle: "blocks", // blocks ████░░ | boxes [■■□□]
  eggFontPx: 7, // egg frame character size: smaller = higher resolution (6–10; was 10)
};

// The `?` overlay.
// `off` is what the row says while single-key shortcuts are off (src/lib/useKeysPref.js):
// a replacement for rows that still half-work (← / → keep moving), `true` for rows whose
// keys aren't characters (always work), and nothing for rows that go away.
export const shortcuts = [
  ["↑ / ↓", "previous / next section", true],
  ["1 / 2 / 3", "jump to projects / experience / skills"],
  [
    "j / k  ← / →",
    "move: section header → its items → next section",
    { key: "← / →", desc: "move: section header → its items → next section" },
  ],
  ["enter / space", "press the selected item (egg, more…, project, role)", true],
  ["f", "cycle project folder"],
  ["← / →", "on a project: prev / next project", true],
  ["esc", "back · close", true],
  ["h", "home"],
  ["m", "more… (about me)"],
  ["i", "egg rules"],
  ["t", "toggle theme"],
  ["`", "shell"],
  ["e g l r", "email · GitHub · LinkedIn · resume"],
  ["?", "this list"],
].map(([key, desc, off]) => ({ key, desc, off }));

/** The rows to show: all of them, or (shortcuts off) only the ones that still work. */
export const shortcutRows = (keysOn) =>
  keysOn
    ? shortcuts
    : shortcuts
        .filter((r) => r.off)
        .map((r) => (r.off === true ? r : { key: r.off.key, desc: r.off.desc }));
