import { pad, lc } from "./format";

const BAR_CELLS = 16;

// A skill matches a project tag exactly or as a prefix word ("Tailwind" ↔ "Tailwind CSS").
const usesSkill = (project, name) => {
  const q = lc(name);
  return project.tags.some((tag) => {
    const t = lc(tag);
    return t === q || t.startsWith(q + " ");
  });
};

/**
 * Group skills with a bar showing each one's share of all projects.
 * Returns [{ label, items: [{ name, count, bar, tip, coursework }] }].
 */
export function buildSkills(stack, projects, barStyle = "blocks") {
  return stack.map((group) => ({
    label: group.label,
    items: group.items.map(({ name, courses = [] }) => {
      const used = projects.filter((p) => usesSkill(p, name));
      const coursework = used.length === 0;
      const f = Math.round((used.length / projects.length) * BAR_CELLS);
      const bar = coursework
        ? "coursework"
        : barStyle === "boxes"
          ? "[" + "■".repeat(f) + "□".repeat(BAR_CELLS - f) + "]"
          : "█".repeat(f) + "░".repeat(BAR_CELLS - f);
      const tip = coursework
        ? "used in: " + (courses.length ? courses.join(", ") : "[course], [course]")
        : "used in: " + used.map((p) => p.title).join(", ");
      return { name, count: coursework ? "" : pad(used.length), bar, tip, coursework };
    }),
  }));
}
