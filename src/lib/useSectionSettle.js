"use client";

import { useEffect } from "react";
import { alignTarget } from "@/lib/nav";
import { settleTarget, settleDuration, easeOut } from "@/lib/scrollSettle";

// Mouse and trackpad only: touch scrolls freely.
const FINE = "(hover: hover) and (pointer: fine)";
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", " ", "ArrowUp", "ArrowDown"]);
// No scrollend (Safari): a scroll has stopped after this long without a scroll event.
const IDLE_MS = 150;
// After a scroll stops, a further wheel or scroll within this long cancels the settle, so
// separate wheel notches don't fight it.
const GRACE_MS = 60;
// A settle only follows the user's own scrolling: wheel/trackpad (momentum keeps sending
// wheel events), scroll keys or a scrollbar drag, at most this long ago.
const ARMED_MS = 1000;

// Each section's free scrollY range [lo, hi] (src/lib/scrollSettle.js): lo parks its header
// under the nav, as a section jump does; hi shows its end just above the bottom bar.
function measureRests() {
  const frames = document.querySelectorAll("[data-sec]");
  if (frames.length < 2) return null;
  const bar =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h")) || 38;
  const band = window.innerHeight - bar - 8;
  return [...frames].map((el, i) => {
    const lo = i === 0 ? 0 : alignTarget(el);
    if (i === frames.length - 1) return [lo, Infinity];
    const bottom = el.getBoundingClientRect().bottom + window.scrollY;
    return [lo, Math.max(lo, bottom - band)];
  });
}

/**
 * Section settle: while `enabled` (the gui's section list, no popup), a scroll the user
 * made that stops with a section boundary on screen settles onto the next header (or back
 * onto the previous section's end) with a short ease-out; instant under reduced motion.
 * Programmatic jumps hold `navLockRef` and are left alone.
 */
export function useSectionSettle({ enabled, reduce, navLockRef }) {
  useEffect(() => {
    if (!enabled || !window.matchMedia(FINE).matches) return;
    const nativeEnd = "onscrollend" in window;
    let armedAt = -Infinity,
      held = false,
      dir = 0,
      lastY = window.scrollY,
      idle = 0,
      grace = 0,
      frame = 0;

    const stopTween = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const tweenTo = (to) => {
      if (reduce) return window.scrollTo(0, to);
      const from = window.scrollY,
        dist = to - from,
        ms = settleDuration(Math.abs(dist)),
        t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        window.scrollTo(0, from + dist * easeOut(t));
        frame = t < 1 ? requestAnimationFrame(step) : 0;
      };
      frame = requestAnimationFrame(step);
    };

    const settle = () => {
      grace = 0;
      if (held || frame || navLockRef.current.on) return;
      if (performance.now() - armedAt > ARMED_MS) return;
      armedAt = -Infinity;
      // A move whose scroll event hasn't been dispatched yet still sets the direction.
      if (window.scrollY !== lastY) dir = Math.sign(window.scrollY - lastY);
      lastY = window.scrollY;
      const rests = measureRests();
      const to = rests && settleTarget({ y: window.scrollY, dir, rests });
      if (to != null && Math.abs(to - window.scrollY) >= 1) tweenTo(to);
    };
    const settleSoon = () => {
      clearTimeout(grace);
      grace = setTimeout(settle, GRACE_MS);
    };

    const arm = () => {
      stopTween();
      armedAt = performance.now();
    };
    // Wheel listeners are passive, so the compositor may scroll (and, for an unanimated
    // scroll, end) before the wheel event reaches us: check again once it has. Any scroll
    // still moving cancels that check, and its scrollend schedules the real one.
    const onWheel = () => {
      arm();
      settleSoon();
    };
    const onKey = (e) => {
      stopTween();
      if (SCROLL_KEYS.has(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) arm();
    };
    const onPointerDown = (e) => {
      stopTween();
      held = true;
      // On the page's own scrollbar (to the right of the content box).
      if (e.clientX >= document.documentElement.clientWidth) arm();
    };
    const onPointerUp = () => {
      if (!held) return;
      held = false;
      settleSoon();
    };
    const onScroll = () => {
      const y = window.scrollY;
      // The settle's own frames don't count as the user's direction.
      if (y !== lastY && !frame) dir = Math.sign(y - lastY);
      lastY = y;
      if (frame) return;
      clearTimeout(grace);
      if (!nativeEnd) {
        clearTimeout(idle);
        idle = setTimeout(settle, IDLE_MS);
      }
    };
    const onScrollEnd = () => {
      if (!frame) settleSoon();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", stopTween, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (nativeEnd) window.addEventListener("scrollend", onScrollEnd);
    return () => {
      stopTween();
      clearTimeout(idle);
      clearTimeout(grace);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", stopTween);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [enabled, reduce, navLockRef]);
}
