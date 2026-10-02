// Hero copy (GUI) and the about/whoami text the terminal prints.
export const homeContent = {
  prompt: "$ whoami",
  heading: "hey, i'm danny",
  seeking: "seeking fall 2027 software coops",
  intro:
    "i'm a student and developer from ontario, canada — i've worked across the stack, but most of my work is in web and app development, with a focus on computer vision and OCR pipelines — feel free to connect with me or check out my links below :)",
  facts: [
    { key: "studying", value: "comp sci & BBA @ ", org: "UW & WLU" },
    { key: "working", value: "software solutions developer co-op @ ", org: "IESO" },
    {
      key: "into",
      value: "computer vision, image processing, machine learning, web dev, and eggs",
      note: "(i like eating eggs)",
    },
  ],
};

// ~/about.txt (`about` / `cat about.txt` in the shell). `whoami` prints homeContent.intro.
export const about = [
  "since building my first project in high school, a short vn/rpg game, i've known i wanted to keep building, learning, and growing alongside this ever-evolving tech landscape\n\n",
  "with a passion for development and simply building things, most of my experience lies in web and app development, but i've also been exploring and working with AI, ML, image processing, computer vision, and OCR pipelines. i hope to continue learning and growing in these areas, and i'm always looking for new opportunities to challenge myself and expand my skill set\n\n",
  "outside of programming, i love playing the guitar & video games, and eggs\n\n",
  "did i mention i like eggs? well i love eggs. i love eating eggs, whether it's scrambled, fried, boiled, steamed, poached, or in an omelette; century eggs, tea eggs, devilled eggs, or mayak eggs; egg fried rice, tomato fried eggs, eggs benedict, eggnog, egg tarts, or egg drop soup.\n",
  "i love eggs.\n",
  "eggs are great.\n",
  "eggs are the best.",
];

// Key/value rows `whoami` prints after the intro. studying/working/into come from the
// hero's facts above, so the two can't drift; "seeking" is the longer terminal version.
const fact = (key) => homeContent.facts.find((f) => f.key === key);
const factText = (f) => f.value + (f.org || "");
export const whoamiFacts = [
  { k: "studying", v: factText(fact("studying")) },
  { k: "working", v: factText(fact("working")) },
  {
    k: "seeking",
    v: "fall 2027 co-op opportunities, open to toronto and remote, will consider relocating",
  },
  { k: "into", v: factText(fact("into")) },
];

// Skills section. A skill's bar is the share of projects whose tags include it
// (see src/lib/skills.js). Skills used in no project show "coursework" and list
// `courses` in the tooltip.
// TODO(danny): fill in the course names for the coursework skills.
export const coreTechStack = [
  {
    label: "languages",
    items: [
      { name: "C", courses: [] },
      { name: "C++", courses: [] },
      { name: "Python" },
      { name: "JavaScript" },
      { name: "TypeScript" },
    ],
  },
  {
    label: "frameworks",
    items: [{ name: "React" }, { name: "Next.js" }, { name: "Tailwind" }, { name: "FastAPI" }],
  },
  {
    label: "libraries",
    items: [{ name: "OpenCV" }, { name: "NumPy", courses: [] }, { name: "Pillow" }],
  },
  {
    label: "tools",
    items: [
      { name: "Git", courses: [] },
      { name: "Bash", courses: [] },
      { name: "Linux", courses: [] },
      { name: "Uvicorn", courses: [] },
      { name: "Supabase" },
    ],
  },
];
