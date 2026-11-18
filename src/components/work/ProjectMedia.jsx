"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import grids from "@/data/media-grids.json";
import { mediaItems } from "@/lib/media";
import { gridRows, revealOrder, revealCount, scrambleFrame } from "@/lib/ascii/image";
import { useReducedMotion } from "@/lib/useReducedMotion";
import styles from "./ProjectMedia.module.css";

// The smallest font (px) a cover cell is drawn at: a narrow screen gets fewer, still readable
// columns instead of a texture of specks.
const MIN_FONT = 7;
// A reveal takes REVEAL_MS in 6 steps (3 under reduced motion): stepped, nothing glides.
const REVEAL_MS = 600;
// The private placeholder scrambles for about 500ms in 5 steps, then locks.
const SCRAMBLE_STEPS = 5,
  SCRAMBLE_MS = 500;
const PLACEHOLDER_W = 36,
  PLACEHOLDER_H = 9;

/**
 * A still, covered by its own ASCII until a visitor hovers it, focuses it or taps it: then the
 * cover's cells go away in random order and the picture shows, and it stays shown. The cover is
 * a canvas over the <picture> (one node however many cells); without script (or with
 * `scripting: none`) there is no cover and the picture just shows.
 */
function Still({ item }) {
  const reduced = useReducedMotion();
  const coverRef = useRef(null);
  const fracRef = useRef(0); // how much of the cover is uncovered (0..1)
  const paintRef = useRef(null);
  const cellsRef = useRef(0);
  const timerRef = useRef(0);
  const [phase, setPhase] = useState("idle"); // idle → revealing → done
  const { grid } = item;

  // Draw the cover, and again when its box or the theme changes (the uncovered share is kept).
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;
    const seed = item.key.length * 7919;
    const paint = () => {
      const W = el.clientWidth,
        H = el.clientHeight;
      if (!W || !H) return;
      const dpr = window.devicePixelRatio || 1;
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      const ctx = el.getContext("2d");
      ctx.scale(dpr, dpr);
      const cols = Math.min(grid.cols, Math.floor(W / (0.6 * MIN_FONT))),
        rows = gridRows(grid, cols),
        cw = W / cols,
        ch = H / rows.length;
      const cs = getComputedStyle(el);
      ctx.fillStyle = cs.getPropertyValue("--bg").trim() || "#121211";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = cs.getPropertyValue("--fg").trim() || "#eceae5";
      ctx.font = `${cw / 0.6}px ${cs.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = 0; r < rows.length; r++)
        for (let c = 0; c < cols; c++) {
          const g = rows[r][c];
          if (g !== " ") ctx.fillText(g, c * cw + cw / 2, r * ch + ch / 2);
        }
      const n = cols * rows.length;
      cellsRef.current = n;
      const gone = Math.round(fracRef.current * n),
        order = revealOrder(n, seed);
      for (let k = 0; k < gone; k++) {
        const i = order[k];
        ctx.clearRect(
          Math.floor((i % cols) * cw),
          Math.floor(Math.floor(i / cols) * ch),
          Math.ceil(cw) + 1,
          Math.ceil(ch) + 1,
        );
      }
    };
    paintRef.current = paint;
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    const mo = new MutationObserver(paint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(paint);
    return () => {
      ro.disconnect();
      mo.disconnect();
      clearInterval(timerRef.current);
    };
  }, [grid, item.key]);

  const start = () => {
    if (phase !== "idle") return;
    setPhase("revealing");
    const steps = reduced ? 3 : 6,
      cfg = { ms: REVEAL_MS, steps },
      every = REVEAL_MS / steps;
    let k = 0;
    timerRef.current = setInterval(() => {
      k++;
      const n = cellsRef.current || 1;
      fracRef.current = revealCount(k * every, cfg, n) / n;
      paintRef.current?.();
      if (k >= steps) {
        clearInterval(timerRef.current);
        setPhase("done");
      }
    }, every);
  };

  return (
    <button
      type="button"
      className={styles.still}
      data-phase={phase}
      onPointerEnter={() => {
        // Keyboard mode (html.kbd) pauses hover: a page scrolling under a resting pointer
        // doesn't uncover anything.
        if (!document.documentElement.classList.contains("kbd")) start();
      }}
      onFocus={start}
      onClick={start}
    >
      <picture>
        {item.sources.map((s) => (
          <source
            key={s.type}
            type={s.type}
            srcSet={s.srcSet}
            sizes="(min-width: 980px) 940px, 100vw"
          />
        ))}
        <img
          src={item.src}
          alt={item.alt}
          width={item.w}
          height={item.h}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <canvas ref={coverRef} className={styles.cover} aria-hidden="true" />
    </button>
  );
}

/**
 * A project that can't show anything: a block of junk that scrambles for about half a second
 * (when it scrolls into view) and locks on the access-denied line. Not an image, so nothing
 * to uncover. Static (locked) without script and under reduced motion.
 */
function Private() {
  const reduced = useReducedMotion();
  const boxRef = useRef(null);
  const [step, setStep] = useState(SCRAMBLE_STEPS);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || reduced || !("IntersectionObserver" in window)) return;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let k = 0;
      setStep(0);
      timer = setInterval(() => {
        k++;
        setStep(k);
        if (k >= SCRAMBLE_STEPS) clearInterval(timer);
      }, SCRAMBLE_MS / SCRAMBLE_STEPS);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [reduced]);

  return (
    <div ref={boxRef} className={styles.private} role="img" aria-label="access denied: proprietary">
      <pre aria-hidden="true">
        {scrambleFrame(step, SCRAMBLE_STEPS, PLACEHOLDER_W, PLACEHOLDER_H, 5)}
      </pre>
    </div>
  );
}

/** The media after a project's bullets: one lead at full width, any others in a row. */
export default function ProjectMedia({ project }) {
  const items = mediaItems(project, grids, site.basePath);
  if (!items.length) return null;
  const [lead, ...rest] = items;
  const fig = (item) => (
    <figure key={item.key ?? "private"} className={styles.fig}>
      {item.kind === "private" ? <Private /> : <Still item={item} />}
      <figcaption className={styles.cap}>{item.caption}</figcaption>
    </figure>
  );
  return (
    <section className={styles.media} aria-label="media">
      {fig(lead)}
      {rest.length > 0 && (
        <div className={styles.row} data-n={rest.length}>
          {rest.map(fig)}
        </div>
      )}
    </section>
  );
}
