"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { ui } from "@/config/ui";
import { INTRO_END, introWait } from "@/lib/intro";
import { NAV_SETTLED, isJumping } from "@/lib/nav";
import { shouldReveal } from "@/lib/reveal";
import { runTextFx } from "@/lib/textFx";
import { prefersReducedMotion } from "@/lib/useReducedMotion";

// Headings that have started their one-time effect this page load. Survives remounts
// (e.g. opening and closing a project), so each plays exactly once per load. A small
// external store, so a render reads it through usePlayed (never the Set directly).
const played = new Set();
const listeners = new Set();
const markPlayed = (key) => {
  played.add(key);
  listeners.forEach((l) => l());
};
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const BLANK = " ";

/** Whether a one-time heading has already played this load (false on the server). */
export function usePlayed(trigger, text) {
  const key = trigger + ":" + text;
  return useSyncExternalStore(
    subscribe,
    () => played.has(key),
    () => false,
  );
}

export const isStill = (reduce) => reduce || ui.headerFx === "none" || prefersReducedMotion();

/**
 * Animate the heading in `ref` to `text`.
 *   trigger "load"   — once per page load, after the intro finishes (hero h1)
 *   trigger "active" — once per page load, section labels. Blank until src/lib/reveal.js
 *                      says go: any scroll the user makes starts it as soon as any of its
 *                      section shows between the nav and the bottom bar; during a jump,
 *                      only the target starts, once it's `active` and the heading is fully
 *                      on screen; keyboard focus inside the section (`focused`) starts it.
 *   trigger "set"    — every time `text` changes (project titles)
 * A one-time effect counts as played as soon as it starts, and once started it runs to
 * the end even if the section stops being active; so a heading is only ever blank →
 * typing → typed, never typed → blank → typing again. Reduced motion shows the text.
 * `onStart` fires when a one-time effect starts (SectionFrame types its rows in then).
 */
export function useTextFx(
  ref,
  text,
  trigger,
  reduce,
  active = false,
  onStart = null,
  focused = false,
) {
  const once = trigger !== "set";
  const key = trigger + ":" + text;
  const running = useRef(null); // cancel fn of the effect in flight
  const facts = useRef({ active, focused }); // read by the "active" trigger's check
  const recheck = useRef(null); // that check, while the heading still waits
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
        // onStart first (SectionFrame un-hides and types its frame), then tell usePlayed
        // readers, so no re-render can drop data-fx="pending" before onStart sees it.
        if (startCb.current) startCb.current();
        markPlayed(key);
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
    // The facts src/lib/reveal.js decides on. "On screen" = inside the band between the
    // sticky nav and bottom bar (their measured heights, App.jsx), so anything still
    // under a bar doesn't count.
    const cs = getComputedStyle(document.documentElement),
      navH = Math.ceil(parseFloat(cs.getPropertyValue("--nav-h")) || 56),
      barH = Math.ceil(parseFloat(cs.getPropertyValue("--bar-h")) || 40);
    let visible = false, // any of the section shows
      labelShown = false; // the heading is fully on screen
    const check = () => {
      if (!shouldReveal({ jumping: isJumping(), visible, labelShown, ...facts.current })) return;
      stop();
      start();
    };
    // A frame only touching the band's edge intersects at 0px: it isn't showing. The
    // second threshold reports it as soon as a sliver is.
    const seen = new IntersectionObserver(
      (entries) => {
        const en = entries[entries.length - 1];
        visible = en.isIntersecting && en.intersectionRect.height > 0;
        check();
      },
      { rootMargin: `-${navH}px 0px -${barH}px 0px`, threshold: [0, 0.001] },
    );
    const io = new IntersectionObserver(
      (entries) => {
        labelShown = entries[entries.length - 1].intersectionRatio > 0.99;
        check();
      },
      { rootMargin: `-${navH}px 0px -${barH + 4}px 0px`, threshold: 1 },
    );
    const frame = el.closest("[data-sec]");
    if (frame) seen.observe(frame);
    io.observe(el);
    // A jump landing (or the user taking it over) lets the sections it passed look again.
    window.addEventListener(NAV_SETTLED, check);
    recheck.current = check;
    function stop() {
      seen.disconnect();
      io.disconnect();
      window.removeEventListener(NAV_SETTLED, check);
      recheck.current = null;
    }
    return stop;
  }, [ref, key, text, trigger, reduce, once]);

  // The section becoming active, or focus moving into it, can be what it was waiting for.
  useEffect(() => {
    facts.current = { active, focused };
    if (recheck.current) recheck.current();
  }, [active, focused]);

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
