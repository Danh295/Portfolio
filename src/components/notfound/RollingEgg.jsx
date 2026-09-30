"use client";

import { useEffect, useRef } from "react";
import { rollArt } from "@/lib/ascii/roll";
import { restTime } from "@/lib/egg/roll";
import { paint } from "@/lib/egg/paint";
import { EGG_FONT_PX, EGG_CELL_W, colsFor } from "@/lib/egg/grid";
import { useReducedMotion } from "@/lib/useReducedMotion";
import styles from "./NotFound.module.css";

// The upright egg just fits in this many rows (see SCALE in src/lib/ascii/roll.js).
const ROWS = 32;
const FRAME_STYLE = { "--egg-font": EGG_FONT_PX + "px", "--egg-h": ROWS * EGG_FONT_PX + "px" };

/**
 * The 404 page's egg: rolls right forever over ground that scrolls left (motion from
 * src/lib/egg/roll.js, frames from src/lib/ascii/roll.js). Drawn on every animation
 * frame from an accumulated clock, so it runs at the display's own rate. With reduced
 * motion it draws one still frame, the egg resting on its side, redrawn on resize.
 */
export default function RollingEgg() {
  const preRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const box = pre.parentElement;
    let cols = 0,
      t = reduce ? restTime() : 0;
    const draw = () => paint(pre, null, { base: rollArt(t, cols, ROWS) });
    const size = () => {
      cols = colsFor(box.clientWidth, 540);
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
      last = 0;
    const frame = (now) => {
      // Capped, so a long pause (hidden tab) doesn't jump the egg across the screen.
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <div className={styles.egg} style={FRAME_STYLE}>
      <pre
        ref={preRef}
        className={styles.pre}
        role="img"
        aria-label="an egg rolling to the right over ground that scrolls past"
      />
    </div>
  );
}
