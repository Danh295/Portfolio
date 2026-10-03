"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ui } from "@/config/ui";
import { INTRO_END, introWait } from "@/lib/intro";
import { runTextFx } from "@/lib/textFx";
import { prefersReducedMotion } from "@/lib/useReducedMotion";

// Headings that have started their one-time effect this page load. Survives remounts
// (e.g. opening and closing a project), so each plays exactly once per load.
const played = new Set();
const BLANK = " ";

/** Whether a one-time heading has already played this load (e.g. to skip related fx). */
export const isPlayed = (trigger, text) => played.has(trigger + ":" + text);

export const isStill = (reduce) => reduce || ui.headerFx === "none" || prefersReducedMotion();

/**
 * Animate the heading in `ref` to `text`.
 *   trigger "load"   — once per page load, after the intro finishes (hero h1)
 *   trigger "active" — once per page load: blank until its section is first `active`
 *                      (selected or scrolled to) *and* the heading is on screen, then
 *                      types out (section labels)
 *   trigger "set"    — every time `text` changes (project titles)
 * A one-time effect counts as played as soon as it starts, and once started it runs to
 * the end even if the section stops being active; so a heading is only ever blank →
 * typing → typed, never typed → blank → typing again. Reduced motion shows the text.
 * `onStart` fires when a one-time effect starts (SectionFrame types its rows in then).
 */
export function useTextFx(ref, text, trigger, reduce, active = false, onStart = null) {
  const once = trigger !== "set";
  const key = trigger + ":" + text;
  const running = useRef(null); // cancel fn of the effect in flight
  const startCb = useRef(onStart);
  useEffect(() => {
    startCb.current = onStart;
  });

  // Before first paint, a one-time heading that hasn't played starts blank (same width).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !once || played.has(key) || isStill(reduce)) return;
    el.textContent = BLANK.repeat(text.length);
    el.dataset.typing = "";
  }, [ref, key, once, text, reduce]);

  useEffect(() => {
    const el = ref.current;
    if (!el || running.current) return; // already typing: let it finish
    if (isStill(reduce) || (once && played.has(key))) {
      delete el.dataset.typing;
      delete el.dataset.fx;
      el.textContent = text;
      return;
    }
    const start = () => {
      if (once) {
        if (played.has(key)) return;
        played.add(key);
        if (startCb.current) startCb.current();
      }
      // Rendered data-fx="pending" (hidden by CSS until now); the effect takes it from here.
      delete el.dataset.fx;
      running.current = runTextFx(el, text, ui.headerFx, () => (running.current = null));
    };
    if (trigger === "set") {
      start();
      return;
    }
    // One-time effects start asynchronously (a timer or an observer callback), which
    // also means StrictMode's dev-only mount → unmount → mount never starts one twice.
    if (trigger === "load") {
      // Waits out the intro, or starts as soon as it's skipped.
      const timer = setTimeout(start, introWait(ui.introFx, reduce));
      window.addEventListener(INTRO_END, start);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(INTRO_END, start);
      };
    }
    if (!active) return; // stays blank until its section is reached
    // "On screen" = fully inside the band between the sticky nav and bottom bar (their
    // measured heights, App.jsx), so a label still under a bar (e.g. at the start of a
    // smooth scroll, or under a nav wrapped to several rows) doesn't count.
    const cs = getComputedStyle(document.documentElement),
      navH = Math.ceil(parseFloat(cs.getPropertyValue("--nav-h")) || 56),
      barH = Math.ceil(parseFloat(cs.getPropertyValue("--bar-h")) || 40);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: `-${navH}px 0px -${barH + 4}px 0px`, threshold: 1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, key, text, trigger, reduce, active, once]);

  // Unmounting (or a new `text`) stops an effect in flight and shows the finished text.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (running.current) {
        running.current();
        running.current = null;
      }
      if (el) {
        delete el.dataset.typing;
        delete el.dataset.fx;
        el.textContent = text;
      }
    };
  }, [ref, text]);
}
