import { projects } from "@/data/projects";

const SKILL_CATEGORY_ORDER = [
  "Frontend",
  "Backend",
  "AI / ML",
  "Computer Vision / OCR",
  "Tooling / Infra",
];

const SKILL_CATEGORY_MAP = {
  React: "Frontend",
  "Next.js": "Frontend",
  TypeScript: "Frontend",
  JavaScript: "Frontend",
  "Tailwind CSS": "Frontend",
  "CSS Modules": "Frontend",
  PixiJS: "Frontend",
  Live2D: "Frontend",
  "Framer Motion": "Frontend",
  FastAPI: "Backend",
  Python: "Backend",
  Supabase: "Backend",
  ChromaDB: "Backend",
  MCP: "Backend",
  "MCP Server": "Backend",
  Gemini: "AI / ML",
  "Gemini API": "AI / ML",
  ElevenLabs: "AI / ML",
  "Multimodal AI": "AI / ML",
  LangGraph: "AI / ML",
  Tavily: "AI / ML",
  "OpenAI API": "AI / ML",
  PaddleOCR: "Computer Vision / OCR",
  OpenCV: "Computer Vision / OCR",
  PyMuPDF: "Computer Vision / OCR",
  pdf2image: "Computer Vision / OCR",
  Pillow: "Computer Vision / OCR",
  OCR: "Computer Vision / OCR",
  Electron: "Tooling / Infra",
  Cloudinary: "Tooling / Infra",
  ESLint: "Tooling / Infra",
  "GitHub Pages": "Tooling / Infra",
};

const PROJECT_TYPE_ORDER = ["Professional", "Hackathon", "Personal"];

function getSkillCategory(tag) {
  return SKILL_CATEGORY_MAP[tag] ?? "Tooling / Infra";
}

export function buildSkillModel() {
  const skillMap = new Map();

  projects.forEach((project) => {
    project.tags.forEach((tag) => {
      if (!skillMap.has(tag)) {
        skillMap.set(tag, {
          name: tag,
          category: getSkillCategory(tag),
          projectCount: 0,
          projects: [],
          projectTypeCounts: {
            Professional: 0,
            Hackathon: 0,
            Personal: 0,
          },
        });
      }

      const entry = skillMap.get(tag);
      entry.projectCount += 1;
      entry.projects.push({
        slug: project.slug,
        title: project.title,
        category: project.category,
        context: project.context,
        timeline: project.timeline,
      });
      entry.projectTypeCounts[project.category] += 1;
    });
  });

  const skills = [...skillMap.values()];
  const maxCount = Math.max(...skills.map((skill) => skill.projectCount), 1);

  const normalizedSkills = skills.map((skill) => ({
    ...skill,
    displayWeight: maxCount === 1 ? 0 : (skill.projectCount - 1) / (maxCount - 1),
  }));

  const skillGroups = SKILL_CATEGORY_ORDER.map((category) => ({
    title: category,
    skills: normalizedSkills
      .filter((skill) => skill.category === category)
      .sort((a, b) => {
        if (b.projectCount !== a.projectCount) {
          return b.projectCount - a.projectCount;
        }

        return a.name.localeCompare(b.name);
      }),
  })).filter((group) => group.skills.length > 0);

  const allSkills = skillGroups.flatMap((group) => group.skills);
  const primarySkill = allSkills[0] ?? null;

  return {
    skillGroups,
    initialSkillName: primarySkill?.name ?? null,
    stats: {
      projectCount: projects.length,
      skillCount: allSkills.length,
      categoryCount: skillGroups.length,
      topSkill: primarySkill?.name ?? null,
    },
    projectTypeOrder: PROJECT_TYPE_ORDER,
  };
}
