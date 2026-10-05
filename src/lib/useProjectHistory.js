"use client";

import { useEffect, useRef } from "react";
import { leavePlan, openPlan, popPlan } from "@/lib/projectHistory";
import { useOnChange } from "@/lib/useOnChange";

// Marks the project entries this page load pushed. history.state outlives a reload, so a
// flag alone would let Esc go back() into a page that no longer exists in this document.
const LOAD_ID = typeof window === "undefined" ? null : Math.random().toString(36).slice(2);

const write = (mode, url, state) => {
  try {
    if (mode === "push") history.pushState(state, "", url);
    else history.replaceState(state, "", url);
  } catch {
    // ignore (sandboxed iframes)
  }
};

/**
 * The open project and the address bar, kept in step (decisions in projectHistory.js).
 * Leaving a project lands on the section list ({ scrollTo } or { sec }) in two steps:
 * `onLeave(land, prevSlug)` from the leave or Back/Forward itself (state), then
 * `onLand(land, prevSlug)` once the project page is gone (scroll, focus). `onPop` runs
 * first on every Back/Forward.
 */
export function useProjectHistory({ view, setView, onLeave, onLand, onPop }) {
  const pending = useRef(null), // where to land once the project page has unmounted
    listY = useRef(null), // the list's scroll position when this project was opened from it
    backing = useRef(false), // a history.back() is on its way: ignore further leaves
    viewNow = useRef(view),
    leaveCb = useRef(onLeave),
    landCb = useRef(onLand),
    popCb = useRef(onPop);
  useEffect(() => {
    viewNow.current = view;
    leaveCb.current = onLeave;
    landCb.current = onLand;
    popCb.current = onPop;
  });

  // Open (or, with a project already open, step to) `slug`.
  const openProject = (slug) => {
    if (!view) listY.current = window.scrollY;
    const p = openPlan({
      slug,
      view,
      scrollY: window.scrollY,
      state: history.state,
      loadId: LOAD_ID,
    });
    if (p.homeState) write("replace", undefined, p.homeState);
    setView(slug);
    write(p.mode, p.url, p.state);
  };

  // Close the project page for section `n`. `how`: "back" for Esc / [back] / Backspace,
  // "jump" for a section shortcut, nav link or shell command.
  const leaveProject = (n, how = "jump") => {
    if (backing.current) return; // a second Esc before the first Back lands
    const p = leavePlan({ n, how, state: history.state, loadId: LOAD_ID, listY: listY.current });
    if (p.mode === "back") {
      backing.current = true;
      history.back(); // popstate lands on the list entry
      return;
    }
    leaveCb.current(p.land, view);
    listY.current = null;
    pending.current = p.land;
    setView(null);
    write("replace", p.url, null);
  };

  useEffect(() => {
    const pop = () => {
      const ownBack = backing.current;
      backing.current = false;
      popCb.current();
      const p = popPlan({
        pathname: window.location.pathname,
        hash: window.location.hash,
        state: history.state,
        listY: ownBack ? listY.current : null,
      });
      if (p.rewrite) write("replace", p.rewrite, history.state);
      if (p.view) {
        listY.current = null; // shown by Back/Forward, not opened from the list
        setView(p.view);
        return;
      }
      leaveCb.current(p.land, viewNow.current);
      if (viewNow.current) {
        pending.current = p.land;
        setView(null);
      } else landCb.current(p.land, null); // already on the list: land now
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [setView]);

  useOnChange(view, (prev) => {
    if (view) return;
    const land = pending.current;
    pending.current = null;
    landCb.current(land ?? { sec: 1 }, prev);
  });

  return { openProject, leaveProject };
}
