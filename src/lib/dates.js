// Experience date ranges as stored for display ("sep 2026 – dec 2026", "2024 – 2025",
// "jan 2027 – present"), read as UTC. Any dash (-, –, —), with or without spaces.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// [start of the period, start of the one after], or null. "jun 2026" is a month, "2026" a year.
function period(s) {
  const m = s
    .trim()
    .toLowerCase()
    .match(/^(?:([a-z]{3})[a-z]*\.?\s+)?(\d{4})$/);
  if (!m) return null;
  const y = +m[2];
  if (!m[1]) return [Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1)];
  const mo = MONTHS.indexOf(m[1]);
  return mo < 0 ? null : [Date.UTC(y, mo, 1), Date.UTC(y, mo + 1, 1)];
}

/** Whether `date` falls in `range`, from its first day through the end of its last period. */
export function isCurrent(range, date) {
  const [from, to] = range.split(/\s*[–—-]\s*/);
  const start = period(from);
  const t = date.getTime();
  if (!start || t < start[0]) return false;
  if (to === undefined) return t < start[1]; // a single month or year
  if (/^(present|now)$/i.test(to.trim())) return true; // open-ended
  const end = period(to);
  return !!end && t < end[1];
}
