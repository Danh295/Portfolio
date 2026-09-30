"use client";

import { useEffect, useRef } from "react";
import { potArt } from "@/lib/ascii/egg";
import { paint } from "@/lib/egg/paint";
import { EGG_FONT_PX, EGG_CELL_W, colsFor } from "@/lib/egg/grid";
import { useReducedMotion } from "@/lib/useReducedMotion";
import styles from "./NotFound.module.css";

// A cold pot with the eggs hovering over it, turning slowly. Shorter than the hero's
// frame (the pot fills ~34 of these rows), so the page doesn't open with empty space.
const ROWS = 44;
const POT = {
  t: 0,
  boil: 0,
  flame: 0,
  swap: 0,
  drip: 0,
  lower: 1,
  hover: 1,
  serve: 0,
  yolk: "jammy",
  conf: [],
};
const FRAME_STYLE = { "--egg-font": EGG_FONT_PX + "px", "--egg-h": ROWS * EGG_FONT_PX + "px" };

/**
 * The 404 page's pot. Turns like the hero's (same renderer, same speed per second);
 * with reduced motion it draws one still frame, redrawn on resize.
 */
export default function SpinningEgg() {
  const preRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const scene = { A: 0.62, B: -0.5 };
    const draw = (now) => {
      const cols = colsFor(pre.parentElement.clientWidth, 540);
      const w = Math.round(cols * EGG_CELL_W) + "px";
      if (pre.style.width !== w) pre.style.width = w; // centred by margin: auto
      paint(pre, null, potArt(scene.A, scene.B, cols, ROWS, { ...POT, t: now / 1000 }));
    };
    draw(0);
    if (reduce) {
      const redraw = () => draw(0);
      window.addEventListener("resize", redraw);
      return () => window.removeEventListener("resize", redraw);
    }
    let raf = 0,
      last = 0,
      odd = false;
    const frame = (now) => {
      odd = !odd;
      // Steps are scaled by elapsed time, so the turn is the same speed at any refresh
      // rate; capped so a long pause (hidden tab) doesn't lurch.
      const k = last ? Math.min(4, (now - last) / (1000 / 60)) : 1;
      last = now;
      scene.B += 0.004 * k;
      if (odd && !document.hidden) draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div className={styles.egg} style={FRAME_STYLE}>
      <pre
        ref={preRef}
        className={styles.pre}
        role="img"
        aria-label="a pot of water on a burner, with eggs hovering over it"
      />
    </div>
  );
}
