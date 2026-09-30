// Copy for the egg minigame, one entry per stage (0–5).
// {T} = goal time, {H} = when the clock hides, {r} = result label, {b} = result hint.
// `enter`: Enter/Space (with the egg selected) or a click advances this stage. After the
// start, `prompt` labels the hero's button under the pot.
export const eggStages = [
  {
    label: "eggs · ready",
    tip: "start the stove",
    prompt: "start",
    enter: true,
    title: "cook me an egg",
    sub: "soft-boiled, drop it in, pull it out at exactly {T}",
  },
  {
    label: "pot · heating…",
    tip: "heating…",
    prompt: "bringing it to a boil…",
    title: "cook me an egg",
    sub: "waiting for a rolling boil…",
  },
  {
    label: "pot · boiling",
    tip: "pull them out!",
    prompt: "pull them out",
    enter: true,
    title: "pull it at {T}",
    sub: "the clock disappears at {H}, count the rest yourself",
  },
  {
    label: "ice bath",
    tip: "chilling…",
    prompt: "",
    title: "into the ice bath",
    sub: "stopping the cooking",
  },
  { label: "cracking…", tip: "…", prompt: "", title: "let's see…", sub: "" },
  {
    label: "{r}",
    tip: "click to play again",
    prompt: "play again",
    enter: true,
    title: "{r}",
    sub: "{b}",
  },
];

export const eggTypes = ["runny", "jammy", "perfect", "firm", "hard-boiled"];

// Rules card shown before the first round of a visit ({T} goal, {H} when the clock hides).
export const eggRules = [
  "the stove heats the water, the eggs go in on start!",
  "pull them out at exactly {T}: click, [↲] or [space]",
  "the clock hides at {H}, count the rest in your head",
  "then an ice bath, and the moment of truth",
];
