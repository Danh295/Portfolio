// Design options from the v4 handoff. Defaults match the handoff.
export const ui = {
  introFx: "boot", // boot | wipe | none
  headerFx: "type", // decode | type | shade | none
  eggClock: "seconds", // seconds (goal 6.50s) | minutes (goal 6:30)
  barStyle: "blocks", // blocks ████░░ | boxes [■■□□]
  eggFontPx: 7, // egg frame character size: smaller = higher resolution (6–10; was 10)
};

// The `?` overlay.
export const shortcuts = [
  ["↑ / ↓", "previous / next section"],
  ["1 / 2 / 3", "jump to projects / experience / skills"],
  ["j / k  ← / →", "move: section header → its items → next section"],
  ["enter / space", "press the selected item (egg, more…, project, role)"],
  ["f", "cycle project folder"],
  ["← / →", "on a project: prev / next project"],
  ["esc", "back · close"],
  ["h", "home"],
  ["m", "more… (about me)"],
  ["i", "egg rules"],
  ["t", "toggle theme"],
  ["`", "shell"],
  ["e g l r", "email · GitHub · LinkedIn · resume"],
  ["?", "this list"],
].map(([key, desc]) => ({ key, desc }));
