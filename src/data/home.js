import { experienceEntries } from "@/data/experience";

// Companies with a current role: the "working" fact shows only while its org is one.
const workingAt = experienceEntries.filter((e) => e.now).map((e) => e.company);

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
  ].filter((f) => f.key !== "working" || workingAt.includes(f.org)),
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
  ...(fact("working") ? [{ k: "working", v: factText(fact("working")) }] : []),
  {
    k: "seeking",
    v: "fall 2027 co-op opportunities, open to toronto and remote, will consider relocating",
  },
  { k: "into", v: factText(fact("into")) },
];

// Skills section. A skill's bar is its share of everything it can be used in: the projects
// (src/data/projects.js), the jobs with `tags` (src/data/experience.js) and the courses
// below, shaded █ project ▓ job ▒ course (src/lib/skills.js). A job with a `project` slug
// is the same work as that project and counts once. `all` is a skill every item uses
// (Git: every project lives on GitHub, and every course and job used it); `via` names tags
// that count as the skill (Oracle Database for SQL) and show beside the item in "used in".
const csCourse = ["C/C++", "Linux", "Make", "GDB", "Valgrind"];
export const courses = [
  { code: "CS 136", tags: csCourse },
  { code: "CS 136L", tags: csCourse },
  { code: "CS 246", tags: csCourse },
];

export const coreTechStack = [
  {
    label: "languages",
    items: [
      { name: "JavaScript" },
      { name: "TypeScript" },
      { name: "Python" },
      { name: "SQL", via: ["Oracle Database"] },
      { name: "C/C++" },
      { name: "HTML/CSS" },
    ],
  },
  {
    label: "frameworks",
    items: [
      { name: "React" },
      { name: "Next.js" },
      { name: "FastAPI" },
      { name: "Node.js" },
      { name: "Tailwind" },
    ],
  },
  {
    label: "libraries",
    items: [{ name: "OpenCV" }, { name: "PyTorch" }, { name: "Hugging Face" }, { name: "Pillow" }],
  },
  {
    label: "tools",
    items: [
      { name: "Git", all: true },
      { name: "Linux" },
      { name: "Make" },
      { name: "GDB" },
      { name: "Valgrind" },
      { name: "MongoDB" },
      { name: "Figma" },
      { name: "Supabase" },
      { name: "Anaconda" },
    ],
  },
];
