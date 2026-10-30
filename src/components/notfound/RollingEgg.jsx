"use client";

import { useEffect, useRef, useState } from "react";
import { rollArt, ROLL_ROWS } from "@/lib/ascii/roll";
import { restTime, nextStop } from "@/lib/egg/roll";
import { paint } from "@/lib/egg/paint";
import { EGG_FONT_PX, EGG_CELL_W } from "@/lib/egg/grid";
import { useReducedMotion } from "@/lib/useReducedMotion";
import Hint from "@/components/Hint";
import styles from "./NotFound.module.css";

const ROWS = ROLL_ROWS;
const MAX_COLS = Math.floor(540 / EGG_CELL_W);
const FRAME_STYLE = { "--egg-font": EGG_FONT_PX + "px", "--egg-h": ROWS * EGG_FONT_PX + "px" };

/**
 * The 404 page's egg: rolls right over ground that scrolls left (motion from
 * src/lib/egg/roll.js, frames from src/lib/ascii/roll.js). Drawn on every animation
 * frame from an accumulated clock, so it runs at the display's own rate. It rolls for at
 * most 5s (WCAG 2.2.2) and comes to rest on its side, the pose reduced motion shows; a
 * click, the button or `r` rolls it again for another 5s at most. With reduced motion it
 * draws one still frame, redrawn on resize, and never rolls.
 */
export default function RollingEgg() {
  const preRef = useRef(null);
  const againRef = useRef(null);
  const reduce = useReducedMotion();
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const box = pre.parentElement;
    let cols = 0,
      t = reduce ? restTime() : 0;
    const draw = () => paint(pre, null, { base: rollArt(t, cols, ROWS) });
    const size = () => {
      // As wide as the frame allows (no minimum, so it never spills out of a narrow one).
      cols = Math.max(1, Math.min(MAX_COLS, Math.floor(box.clientWidth / EGG_CELL_W)));
      pre.style.width = Math.round(cols * EGG_CELL_W) + "px"; // centred by margin: auto
    };
    size();
    draw();
    const ro = new ResizeObserver(() => {
      size();
      draw();
    });
    ro.observe(box);
    if (reduce) return () => ro.disconnect();
    let raf = 0,
      last = 0,
      stopAt = nextStop(t);
    const frame = (now) => {
      // Capped, so a long pause (hidden tab) doesn't jump the egg across the screen.
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (t >= stopAt) {
        t = stopAt;
        draw();
        raf = 0;
        setStopped(true);
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    const roll = () => {
      if (raf) return; // already rolling
      last = 0;
      stopAt = nextStop(t);
      setStopped(false);
      raf = requestAnimationFrame(frame);
    };
    const onKey = (e) => {
      if (e.key !== "r" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.documentElement.dataset.keys === "off") return;
      roll();
    };
    const again = againRef.current;
    box.addEventListener("click", roll);
    again?.addEventListener("click", roll);
    window.addEventListener("keydown", onKey);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      box.removeEventListener("click", roll);
      again?.removeEventListener("click", roll);
      window.removeEventListener("keydown", onKey);
    };
  }, [reduce]);

  return (
    <>
      <div className={styles.egg} style={FRAME_STYLE}>
        <pre
          ref={preRef}
          className={styles.pre}
          role="img"
          aria-label="an egg rolling to the right over ground that scrolls past, then coming to rest"
        />
      </div>
      {/* Always laid out (hidden, so it can't be focused) so it appearing moves nothing. */}
      <button ref={againRef} type="button" className={stopped ? styles.again : styles.againOff}>
        <Hint>[r] </Hint>roll again
      </button>
    </>
  );
}
