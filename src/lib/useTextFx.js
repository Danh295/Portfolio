"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { ui } from "@/config/ui";
import { INTRO_END, introWait } from "@/lib/intro";
import { BARS_MEASURED, readBars } from "@/lib/bars";
import { JUMP_CHANGED, jumpState } from "@/lib/jump";
import { shouldStart } from "@/lib/typeInStart";
import { runTextFx } from "@/lib/textFx";

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
// How much of a section must show between the nav and the bottom bar before a scroll
// starts it (AOS's default offset): enough to see it type, not so much that it sits blank.
const START_PX = 120;

/** Whether a one-time heading has already played this load (false on the server). */
export function usePlayed(trigger, text) {
  const key = trigger + ":" + text;
  return useSyncExternalStore(
    subscribe,
    () => played.has(key),
    () => false,
  );
}

// Type-ins play under reduced motion too (text changing in place, nothing moving across the
// screen; CONTEXT.md "Reduced motion"): only the config can turn them off.
const STILL = ui.headerFx === "none";

/**
 * Animate the heading in `ref` to `text`.
 *   trigger "load"   — once per page load, after the intro finishes (hero h1)
 *   trigger "active" — once per page load, section labels. Blank until src/lib/typeInStart.js
 *                      says go: after the user scrolls, once START_PX of its section
 *                      shows; after a jump has landed, once it's `active` and the heading
 *                      is fully on screen; at once when focus moves into the section.
 *   trigger "set"    — every time `text` changes (project titles)
 * A one-time effect counts as played as soon as it starts, and once started it runs to
 * the end even if the section stops being active; so a heading is only ever blank →
 * typing → typed, never typed → blank → typing again. Reduced motion still types.
 * `onStart` fires when a one-time effect starts (SectionFrame types its rows in then).
 */
export function useTextFx(ref, text, trigger, active = false, onStart = null) {
  const once = trigger !== "set";
  const key = trigger + ":" + text;
  const running = useRef(null); // cancel fn of the effect in flight
  const isActive = useRef(active); // read by the "active" trigger's check
  const recheck = useRef(null); // that check, while the heading still waits
  const startCb = useRef(onStart);
  useEffect(() => {
    startCb.current = onStart;
  });

  // Before first paint, a one-time heading that hasn't played starts blank (same width).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !once || played.has(key) || STILL) return;
    el.textContent = BLANK.repeat(text.length);
    el.dataset.typing = "";
  }, [ref, key, once, text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || running.current) return; // already typing: let it finish
    if (STILL || (once && played.has(key))) {
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
      const timer = setTimeout(start, introWait(ui.introFx));
      window.addEventListener(INTRO_END, start);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(INTRO_END, start);
      };
    }
    // The facts src/lib/typeInStart.js decides on, measured against the band between the
    // sticky nav and bottom bar (src/lib/bars.js), so anything under a bar doesn't count.
    const frame = el.closest("[data-sec]");
    let visible = false, // START_PX of the section shows
      labelShown = false, // the heading is fully on screen
      focused = false, // focus moved into the section
      seen = null,
      io = null;
    const check = () => {
      const facts = { jump: jumpState(), visible, labelShown, focused };
      if (!shouldStart({ ...facts, active: isActive.current })) return;
      stop();
      start();
    };
    // (Re)built whenever the bars are measured or the window resizes: the band moves.
    const observe = () => {
      if (seen) seen.disconnect();
      if (io) io.disconnect();
      const { navH, barH } = readBars(),
        off = Math.max(0, Math.min(START_PX, Math.floor((innerHeight - navH - barH) / 4)));
      // The band shrunk by the offset at both ends: scrolling down, the section's top must
      // be `off` above the bottom bar; scrolling up, its bottom `off` below the nav. A frame
      // only touching the edge intersects at 0px, so it isn't showing yet.
      seen = new IntersectionObserver(
        (entries) => {
          const en = entries[entries.length - 1];
          visible = en.isIntersecting && en.intersectionRect.height > 0;
          check();
        },
        { rootMargin: `-${navH + off}px 0px -${barH + off}px 0px`, threshold: [0, 0.001] },
      );
      io = new IntersectionObserver(
        (entries) => {
          labelShown = entries[entries.length - 1].intersectionRatio > 0.99;
          check();
        },
        { rootMargin: `-${navH}px 0px -${barH + 4}px 0px`, threshold: 1 },
      );
      if (frame) seen.observe(frame);
      io.observe(el);
    };
    const onFocusIn = () => {
      focused = true;
      check();
    };
    observe();
    window.addEventListener(BARS_MEASURED, observe);
    window.addEventListener("resize", observe);
    // A jump landing, or the user taking over, can be what a section was waiting for.
    window.addEventListener(JUMP_CHANGED, check);
    if (frame) frame.addEventListener("focusin", onFocusIn);
    recheck.current = check;
    function stop() {
      seen.disconnect();
      io.disconnect();
      window.removeEventListener(BARS_MEASURED, observe);
      window.removeEventListener("resize", observe);
      window.removeEventListener(JUMP_CHANGED, check);
      if (frame) frame.removeEventListener("focusin", onFocusIn);
      recheck.current = null;
    }
    return stop;
  }, [ref, key, text, trigger, once]);

  // The section becoming active can be what it was waiting for.
  useEffect(() => {
    isActive.current = active;
    if (recheck.current) recheck.current();
  }, [active]);

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
