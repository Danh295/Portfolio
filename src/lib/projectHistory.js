// Project-page history as plain decisions (no DOM): what opening a project, leaving it or
// a Back/Forward should do to the history stack and where the page should land. The
// useProjectHistory hook applies them.

import { parsePath, projUrl, secUrl } from "@/lib/nav";

/**
 * Opening `slug`. From the section list (`view` null) it pushes a project entry marked
 * with this page load's `loadId`, and first saves the list's scroll position on the home
 * entry (`homeState`), so Back can put it back. Stepping to another project (`view` set)
 * replaces the entry and keeps its state.
 */
export function openPlan({ slug, view, scrollY, state, loadId }) {
  const url = projUrl(slug);
  if (view) return { mode: "replace", url, state: { ...state } };
  // Only on an entry Next's router owns (__NA): one without it (a #hash typed into the
  // address bar has no state) would make Next reload the page when Back reaches it.
  const homeState = state?.__NA ? { ...state, listY: scrollY } : undefined;
  return { mode: "push", url, state: { fromApp: loadId }, homeState };
}

/**
 * Leaving a project for section `n`. Esc, [back] and Backspace (`how` "back") on a
 * project this page load opened go back to the entry it was opened from. Anything else
 * (a section jump, a deep-linked project, an entry from before a reload) replaces the
 * project entry with the section, so Back never reopens it; back on the projects
 * section, the list returns to `listY`, where it was when the project was opened.
 */
export function leavePlan({ n, how, state, loadId, listY = null }) {
  if (how === "back" && loadId && state?.fromApp === loadId) return { mode: "back" };
  const land = n === 1 && listY != null ? { scrollTo: listY } : { sec: n };
  return { mode: "replace", url: secUrl(n), land };
}

/**
 * A Back/Forward landed on `pathname` + `hash` with `state`. A project page opens it (an
 * old /#projects/<slug> link also gets its real URL, `rewrite`); a home entry that saved
 * a list position lands exactly there, any other on its section. `listY`: the position
 * remembered when the project was opened, passed when this is Esc's own back().
 */
export function popPlan({ pathname, hash, state, listY: remembered = null }) {
  const r = parsePath(pathname, hash);
  if (r.slug) {
    const onPath = parsePath(pathname, "").slug === r.slug;
    return onPath ? { view: r.slug } : { view: r.slug, rewrite: projUrl(r.slug) };
  }
  const listY = state?.listY ?? remembered;
  return { view: null, land: listY != null ? { scrollTo: listY } : { sec: r.sec } };
}
