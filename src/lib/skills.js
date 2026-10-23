import { lc } from "./format";

const BAR_CELLS = 16;

// One glyph per source, in the order they sit in a bar and a tip.
const KINDS = ["project", "job", "course"];
const GLYPH = { project: "█", job: "▓", course: "▒" };
const EMPTY = "░";

/**
 * Everything a skill can be used in: each project, each job with tags, each course.
 * A job with a `project` slug is the same work as that project, so the two become one
 * item (kind "job", both tag sets, named "job / project") and never count twice.
 * Returns [{ kind, name, tags }].
 */
export function buildItems({ projects = [], jobs = [], courses = [] }) {
  const tagged = jobs.filter((j) => j.tags?.length);
  const merged = new Set(tagged.map((j) => j.project).filter(Boolean));
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  return [
    ...projects
      .filter((p) => !merged.has(p.slug))
      .map((p) => ({ kind: "project", name: p.title, tags: p.tags })),
    ...tagged.map((j) => {
      const p = j.project && bySlug.get(j.project);
      return {
        kind: "job",
        name: p ? j.company + " / " + p.title : j.company,
        tags: p ? [...j.tags, ...p.tags] : j.tags,
      };
    }),
    ...courses.map((c) => ({ kind: "course", name: c.code, tags: c.tags })),
  ];
}

// A skill matches a tag exactly or as a prefix word ("Tailwind" ↔ "Tailwind CSS"); a `via`
// tag ("Oracle Database" for SQL) matches exactly.
const matches = (tags, name, via = []) => {
  const q = lc(name);
  const v = via.map(lc);
  return tags.some((tag) => {
    const t = lc(tag);
    return t === q || t.startsWith(q + " ") || v.includes(t);
  });
};

/**
 * Cells for each source in a bar of `cells`: its own count first (so a used source is never
 * empty), then the few left over to the biggest shares. `cells` is at least the number of
 * used sources.
 */
function split(counts, cells) {
  const used = KINDS.filter((k) => counts[k] > 0);
  const total = used.reduce((n, k) => n + counts[k], 0);
  const quota = Object.fromEntries(used.map((k) => [k, (counts[k] * cells) / total]));
  const out = Object.fromEntries(used.map((k) => [k, Math.max(1, Math.floor(quota[k]))]));
  const sum = () => used.reduce((n, k) => n + out[k], 0);
  const rest = (k) => quota[k] - out[k];
  // Ties go to the earlier source (project, job, course).
  while (sum() < cells) out[used.reduce((a, b) => (rest(b) > rest(a) ? b : a))]++;
  while (sum() > cells) {
    const room = used.filter((k) => out[k] > 1);
    out[room.reduce((a, b) => (rest(b) < rest(a) ? b : a))]--;
  }
  return out;
}

/**
 * Group skills with a bar showing each one's share of all items, shaded by where it was
 * used: █ project, ▓ job, ▒ course. `all: true` is a skill every item uses (Git).
 * Returns [{ label, items: [{ name, used, counts, count, bar, tip }] }].
 */
export function buildSkills(stack, sources) {
  const items = buildItems(sources);
  return stack.map((group) => ({
    label: group.label,
    items: group.items.map(({ name, via, all }) => {
      const hit = items.filter((it) => all || matches(it.tags, name, via));
      const counts = Object.fromEntries(
        KINDS.map((k) => [k, hit.filter((it) => it.kind === k).length]),
      );
      const used = hit.length;
      const nonzero = KINDS.filter((k) => counts[k] > 0).length;
      const cells = used
        ? Math.min(BAR_CELLS, Math.max(nonzero, Math.round((used / items.length) * BAR_CELLS)))
        : 0;
      const each = used ? split(counts, cells) : {};
      const bar =
        KINDS.map((k) => GLYPH[k].repeat(each[k] ?? 0)).join("") + EMPTY.repeat(BAR_CELLS - cells);
      const tip =
        "used in: " +
        KINDS.flatMap((k) => hit.filter((it) => it.kind === k))
          .map((it) => {
            const seen = (via ?? []).filter((v) => it.tags.some((t) => lc(t) === lc(v)));
            return it.name + (seen.length ? " (" + seen.join(", ") + ")" : "");
          })
          .join(", ");
      return { name, used, counts, count: KINDS.map((k) => counts[k]).join("·"), bar, tip };
    }),
  }));
}
