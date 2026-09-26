// GitHub data comes from a build-time snapshot (scripts/sync-github.mjs), so visitors
// never hit the GitHub API. Anything missing from the snapshot is simply not shown.
import snapshot from "@/data/github.generated.json";
import { pad } from "./format";

const BARS = "▁▂▃▄▅▆▇█";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export const sparkBars = (weeks) => {
  const m = Math.max(1, ...weeks);
  return weeks.map((v) => BARS[Math.min(7, Math.round((v / m) * 7))]).join("");
};

/** "sep 25, 2026" — UTC, so the static HTML and the client always agree. */
export function fmtDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "sep 25, 2026 · 15:38 UTC" */
export const fmtStamp = (iso) =>
  `${fmtDate(iso)} · ${pad(new Date(iso).getUTCHours())}:${pad(new Date(iso).getUTCMinutes())} UTC`;

export const syncedAt = snapshot.syncedAt;

// "git log · 12w" sparkline, or null when the last sync had no activity data.
export const spark = snapshot.activity
  ? {
      bars: sparkBars(snapshot.activity.weeks),
      tip:
        snapshot.activity.weeks.reduce((a, b) => a + b, 0) +
        (snapshot.activity.kind === "contributions" ? " contributions" : " pushes") +
        " in the last 12 weeks · synced " +
        fmtDate(snapshot.syncedAt),
    }
  : null;

/** Snapshot data for a project's GitHub link: { full, pushedAt, stars, language, url } | null. */
export function repoFor(project) {
  const link = (project.links || []).find((l) => /github\.com\/[^/]+\/[^/]+/.test(l.href));
  if (!link) return null;
  const [, owner, name] = link.href.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  const info = snapshot.repos[`${owner}/${name.replace(/\.git$/, "")}`];
  return info ? { full: `${owner}/${name}`, ...info } : null;
}

/** How many of `projects` have a synced repo. */
export const syncedCount = (projects) => projects.filter((p) => repoFor(p)).length;
