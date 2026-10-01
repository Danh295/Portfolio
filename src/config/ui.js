// Design options from the v4 handoff. Defaults match the handoff.
export const ui = {
  introFx: "boot", // boot | wipe | none
  headerFx: "type", // decode | type | shade | none
  eggClock: "seconds", // seconds (goal 6.50s) | minutes (goal 6:30)
  barStyle: "blocks", // blocks ████░░ | boxes [■■□□]
  eggFontPx: 7, // egg frame character size: smaller = higher resolution (6–10; was 10)
};

// The `?` overlay.
// `always`: the row's keys work with single-key shortcuts off (src/lib/useKeysPref.js);
// `offKey`: the row says this instead while they're off (← / → keep moving). Rows with
// neither go away while off.
export const shortcuts = [
  { key: "↑ / ↓", desc: "previous / next section", always: true },
  { key: "1 / 2 / 3", desc: "jump to projects / experience / skills" },
  {
    key: "j / k  ← / →",
    desc: "move: section header → its items → next section",
    offKey: "← / →",
  },
  {
    key: "enter / space",
    desc: "press the selected item (egg, more…, project, role)",
    always: true,
  },
  { key: "f", desc: "cycle project folder" },
  { key: "← / →", desc: "on a project: prev / next project", always: true },
  { key: "esc", desc: "back · close", always: true },
  { key: "h", desc: "home" },
  { key: "m", desc: "more… (about me)" },
  { key: "i", desc: "egg rules" },
  { key: "t", desc: "toggle theme" },
  { key: "`", desc: "shell" },
  { key: "e g l r", desc: "email · GitHub · LinkedIn · resume" },
  { key: "?", desc: "this list" },
];

/** The rows to show: all of them, or (shortcuts off) only the ones that still work. */
export function shortcutRows(keysOn) {
  const rows = keysOn ? shortcuts : shortcuts.filter((r) => r.always || r.offKey);
  return rows.map((r) => ({ key: (!keysOn && r.offKey) || r.key, desc: r.desc }));
}
