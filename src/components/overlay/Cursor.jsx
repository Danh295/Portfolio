"use client";

import { useEffect, useRef } from "react";
import styles from "./Cursor.module.css";

// Retro set (terminal mode). X = outline (--bg), o = fill (--fg), so they invert with the theme.
const ARROW = [
  "X...........",
  "XX..........",
  "XoX.........",
  "XooX........",
  "XoooX.......",
  "XooooX......",
  "XoooooX.....",
  "XooooooX....",
  "XoooooooX...",
  "XooooooooX..",
  "XoooooXXXXX.",
  "XooXooX.....",
  "XoX.XooX....",
  "XX..XooX....",
  "X....XooX...",
  ".....XooX...",
  "......XX....",
];
const HAND = [
  ".....XX.........",
  "....XooX........",
  "....XooX........",
  "....XooX........",
  "....XooXXXXXX...",
  "....XooXooXooXX.",
  ".XX.XooooooooooX",
  "XooXXooooooooooX",
  "XoooXooooooooooX",
  ".XooooooooooooX.",
  "..XoooooooooooX.",
  "..XooooooooooX..",
  "...XoooooooooX..",
  "...XoooooooooX..",
  "...XXXXXXXXXXX..",
];
const BEAM = [
  "XXX.XXX",
  "XooXooX",
  ".XXoXX.",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  "..XoX..",
  ".XXoXX.",
  "XooXooX",
  "XXX.XXX",
];
// Hourglass frames: sand on top, then sand on the bottom (flipped by CSS).
const GLASS_A = [
  "XXXXXXXXXXX",
  "XoooooooooX",
  ".XoooooooX.",
  ".XoooooooX.",
  "..XoooooX..",
  "...XoooX...",
  "....XoX....",
  "....X.X....",
  "...X...X...",
  "..X.....X..",
  ".X...o...X.",
  ".X..ooo..X.",
  "XoooooooooX",
  "XXXXXXXXXXX",
];
const GLASS_B = [
  "XXXXXXXXXXX",
  "XoooooooooX",
  ".X..ooo..X.",
  ".X...o...X.",
  "..X.....X..",
  "...X...X...",
  "....X.X....",
  "....XoX....",
  "...XoooX...",
  "..XoooooX..",
  ".XoooooooX.",
  ".XoooooooX.",
  "XoooooooooX",
  "XXXXXXXXXXX",
];
const PAN = [
  "......X......",
  ".....XoX.....",
  "....XoooX....",
  ".....XoX.....",
  "..X..XoX..X..",
  ".XoXXXoXXXoX.",
  "XoooooooooooX",
  ".XoXXXoXXXoX.",
  "..X..XoX..X..",
  ".....XoX.....",
  "....XoooX....",
  ".....XoX.....",
  "......X......",
];

const path = (grid, ch) =>
  grid.flatMap((row, y) => [...row].map((c, x) => (c === ch ? `M${x} ${y}h1v1h-1z` : ""))).join("");

function Pixels({ grid, className }) {
  const w = grid[0].length,
    h = grid.length;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={w * 1.25}
      height={h * 1.25}
      shapeRendering="crispEdges"
    >
      <path d={path(grid, "X")} className={styles.outline} />
      <path d={path(grid, "o")} className={styles.fill} />
    </svg>
  );
}

// Every glyph starts hidden inline, so even without the stylesheet (mid-reload) they
// never all show at once; the CSS reveals only the active state's glyph.
const HIDDEN = { display: "none" };

// Only things that do something on click (a tooltip alone doesn't make text clickable).
const INTERACTIVE =
  'a, button:not(:disabled), summary, select, label, [role="button"], [data-clickable]';
const TEXT = 'input, textarea, [contenteditable="true"]';
const PAN_TARGET = 'pre[role="img"]';

/**
 * Custom cursor (mouse/trackpad only), in two sets that share one state machine:
 *   gui mode      block: one square on the hotspot that morphs between shapes with a
 *                 short ease-out (~0.14s), drawn with difference blending so it inverts
 *                 whatever is underneath
 *   terminal mode retro: pixel-art glyphs, each with its own blinking indicator
 * States:
 *   arrow   default
 *   pointer over anything clickable (inverted square / hand with a blinking block)
 *   text    over text fields, or while dragging a text selection (bar / I-beam)
 *   busy    while the boot intro plays (html[data-loading]) (a block stepping round a
 *           square / hourglass)
 *   pan     over the egg / dragging it (a square outline spinning round a fixed centre
 *           block / four-way arrows)
 * Any keypress switches to keyboard mode: the cursor hides and hover effects and tooltips
 * pause (html.kbd) until the mouse actually moves again.
 */
export default function Cursor({ mode = "gui" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const root = document.documentElement,
      el = ref.current;
    root.classList.add("cursor-custom");
    let x = -100,
      y = -100,
      raf = 0,
      over = "arrow",
      pressed = false,
      down = null; // what the press is doing: "pan" | "text" | "other"
    const draw = () => {
      raf = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const setState = () => {
      el.dataset.state = down === "pan" ? "pan" : down === "text" ? "text" : over;
    };
    // While the button is held, the moment any text is selected (wherever the drag
    // started, including text inside tooltipped or clickable elements) it becomes the
    // text cursor. A plain click on a button or dropdown selects nothing, so it doesn't.
    const checkSelect = () => {
      if (!pressed || down === "pan" || down === "text") return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) {
        down = "text";
        setState();
      }
    };
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      // Browsers send synthetic moves at the same spot after scrolling; only a real
      // move leaves keyboard mode.
      if (e.clientX === x && e.clientY === y) return;
      x = e.clientX;
      y = e.clientY;
      root.classList.remove("kbd");
      el.dataset.hidden = "false";
      if (e.buttons === 1) checkSelect();
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onOver = (e) => {
      const t = e.target instanceof Element ? e.target : null;
      over = !t
        ? "arrow"
        : t.closest(PAN_TARGET)
          ? "pan"
          : t.closest(TEXT)
            ? "text"
            : t.closest(INTERACTIVE)
              ? "pointer"
              : "arrow";
      setState();
    };
    const onDown = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      // A click also ends keyboard mode, even without moving first.
      root.classList.remove("kbd");
      el.dataset.hidden = "false";
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(draw);
      el.dataset.press = "true";
      pressed = true;
      const t = e.target instanceof Element ? e.target : null;
      down = t?.closest(PAN_TARGET) ? "pan" : "other";
      setState();
    };
    const onUp = () => {
      el.dataset.press = "false";
      pressed = false;
      down = null;
      setState();
    };
    const onLeave = (e) => {
      if (!e.relatedTarget) el.dataset.hidden = "true";
    };
    const onKey = (e) => {
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
      if (e.metaKey || e.ctrlKey) return; // shortcuts like cmd-c aren't navigation
      root.classList.add("kbd");
    };
    document.addEventListener("selectionchange", checkSelect);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("cursor-custom", "kbd");
      document.removeEventListener("selectionchange", checkSelect);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={styles.cursor}
      data-set={mode === "term" ? "retro" : "block"}
      data-hidden="true"
      data-state="arrow"
      aria-hidden="true"
    >
      <span className={styles.sq} style={HIDDEN}>
        <span className={styles.quad} />
      </span>
      <span className={`${styles.glyph} ${styles.arrow}`} style={HIDDEN}>
        <Pixels grid={ARROW} />
      </span>
      <span className={`${styles.glyph} ${styles.pointer}`} style={HIDDEN}>
        <Pixels grid={HAND} />
        <span className={styles.block} />
      </span>
      <span className={`${styles.glyph} ${styles.text}`} style={HIDDEN}>
        <Pixels grid={BEAM} className={styles.caretBlink} />
      </span>
      <span className={`${styles.glyph} ${styles.busy}`} style={HIDDEN}>
        <Pixels grid={GLASS_A} className={styles.sandA} />
        <Pixels grid={GLASS_B} className={styles.sandB} />
      </span>
      <span className={`${styles.glyph} ${styles.pan}`} style={HIDDEN}>
        <Pixels grid={PAN} />
        <span className={styles.dot} />
      </span>
    </div>
  );
}
