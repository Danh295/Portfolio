// Design options from the v4 handoff. Defaults match the handoff.
export const ui = {
  introFx: "boot", // boot | wipe | none
  headerFx: "type", // decode | type | shade | none
  eggClock: "seconds", // seconds (goal 6.50s) | minutes (goal 6:30)
  barStyle: "blocks", // blocks ████░░ | boxes [■■□□]
  eggFontPx: 7, // egg frame character size: smaller = higher resolution (6–10; was 10)
};

// The `?` overlay.
// `label` is what the row shows; `keys` are the event keys it stands for (each one routed by
// src/lib/keyRouter.js; test/keys.test.mjs checks the two lists match).
// `always`: the row's keys work with single-key shortcuts off (src/lib/useKeysPref.js);
// `offLabel`: the row says this instead while they're off (← / → keep moving). Rows with
// neither go away while off.
export const shortcuts = [
  { label: "↑ / ↓", keys: ["ArrowUp", "ArrowDown"], desc: "previous / next section", always: true },
  { label: "1 / 2 / 3", keys: ["1", "2", "3"], desc: "jump to projects / experience / skills" },
  {
    label: "j / k  ← / →",
    keys: ["j", "k", "ArrowLeft", "ArrowRight"],
    desc: "move: section header → its items → next section",
    offLabel: "← / →",
  },
  {
    label: "enter / space",
    keys: ["Enter", " "],
    desc: "press the selected item (egg, more…, project, role)",
    always: true,
  },
  { label: "f", keys: ["f"], desc: "cycle project folder" },
  {
    label: "← / →",
    keys: ["ArrowLeft", "ArrowRight"],
    desc: "on a project: prev / next project",
    always: true,
  },
  { label: "esc", keys: ["Escape"], desc: "back · close", always: true },
  { label: "h", keys: ["h"], desc: "home" },
  { label: "m", keys: ["m"], desc: "more… (about me)" },
  { label: "i", keys: ["i"], desc: "egg rules" },
  { label: "t", keys: ["t"], desc: "toggle theme" },
  { label: "`", keys: ["`"], desc: "shell" },
  { label: "e g l r", keys: ["e", "g", "l", "r"], desc: "email · GitHub · LinkedIn · resume" },
  { label: "?", keys: ["?"], desc: "this list" },
];

/** The rows to show: all of them, or (shortcuts off) only the ones that still work. */
export function shortcutRows(keysOn) {
  const rows = keysOn ? shortcuts : shortcuts.filter((r) => r.always || r.offLabel);
  return rows.map((r) => ({ key: (!keysOn && r.offLabel) || r.label, desc: r.desc }));
}
