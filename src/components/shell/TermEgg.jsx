"use client";

import { useEffect, useRef, useState } from "react";
import EggCanvas from "@/components/egg/EggCanvas";
import { EGG_PX } from "@/lib/egg/grid";
import styles from "./TermLines.module.css";

// PROTOTYPE: the inline ./egg on a touch screen. A touch in the block holds it (outline;
// one finger turns the pot), the stages are played with buttons under the pot, and the block
// fills the visible output area exactly (pot scaled to what's left after the status and the
// buttons) and aligns itself to the top of that area whenever the area changes (a keyboard
// closing, a rotation), instead of relying on the output staying pinned to its bottom.
const TOUCH = "(hover: none) and (pointer: coarse)";
const PHONE = "(max-width: 600px)";
// Status lines are reserved at their tallest (stage 5: a wrapped title, blank, head, 5 rows)
// so the pot never changes size between stages, plus the button row, gaps and padding.
const RESERVE = 9 * 22.4 + 44 + 8 * 2 + 16;

export default function TermEgg({ preRef, fxRef, statusRef, handlers, egg }) {
  const root = useRef(null),
    boxRef = useRef(null),
    lastType = useRef("mouse");
  const [held, setHeld] = useState(false);
  const [fill, setFill] = useState(0); // the visible output area's height; 0 = don't fill
  const touch = typeof window !== "undefined" && window.matchMedia(TOUCH).matches;

  // Park the block's top at the top of the output area, over its padding, so the line above
  // (the typed `./egg`) doesn't peek in.
  const align = () => {
    const el = root.current,
      box = boxRef.current;
    if (!el || !box) return;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top;
  };

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // The output area is the nearest scrolling ancestor.
    let box = el.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!box) return;
    boxRef.current = box;
    // The buttons play the egg and the prompt is hidden, so a keyboard left open from typing
    // `./egg` only takes up room: put it away.
    if (window.matchMedia(TOUCH).matches && document.activeElement?.tagName === "INPUT")
      document.activeElement.blur();
    const fit = () => {
      if (!window.matchMedia(PHONE).matches || !window.matchMedia(TOUCH).matches) return setFill(0);
      setFill(box.clientHeight);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    // iOS gives the screen back to the page in steps after a keyboard closes: look again.
    const vv = window.visualViewport;
    vv?.addEventListener("resize", fit);
    const timers = [60, 250, 600, 1100].map((ms) =>
      setTimeout(() => {
        fit();
        align();
      }, ms),
    );
    fit();
    // The block fills the area, so there's nothing else to scroll to while the egg runs:
    // anything that moves it (iOS panning during a keyboard change) is put back at once.
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (window.matchMedia(PHONE).matches && window.matchMedia(TOUCH).matches) align();
        });
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    const onDown = (e) => {
      if (e.pointerType === "touch") setHeld(el.contains(e.target));
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      ro.disconnect();
      vv?.removeEventListener("resize", fit);
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, []);

  // After the block's size changes, put its top back at the top of the area.
  useEffect(() => {
    if (fill) align();
  }, [fill, egg.stage]);

  const scale = fill ? Math.max(0.5, Math.min(1, (fill - RESERVE) / EGG_PX)) : 1;
  const heldNow = held && egg.stage !== 5;
  // A tap on the pot only holds it on a touch screen (the buttons play).
  const potHandlers = {
    ...handlers,
    onPointerDown: (e) => {
      lastType.current = e.pointerType;
      handlers.onPointerDown(e);
    },
    onClick: (e) => {
      if (lastType.current === "touch") return;
      handlers.onClick(e);
    },
  };
  const label = egg.stage === 0 ? "start" : egg.enter ? egg.prompt : null;

  return (
    <div
      ref={root}
      className={styles.egg}
      data-held={heldNow ? "" : undefined}
      onClick={touch ? (e) => e.stopPropagation() : undefined}
      style={{ "--s": scale, minHeight: fill || undefined }}
    >
      <div className={styles.eggStage} style={{ height: EGG_PX * scale }}>
        <div className={styles.eggScaled}>
          <EggCanvas
            preRef={preRef}
            fxRef={fxRef}
            handlers={touch ? potHandlers : handlers}
            label="ascii egg minigame"
          />
        </div>
      </div>
      <div ref={statusRef} className={styles.eggStatus} />
      <div className={styles.eggButtons}>
        {label && (
          <button type="button" className={styles.eggBtn} onClick={egg.play}>
            {label}
          </button>
        )}
        <button type="button" className={styles.eggBtn} onClick={egg.quit}>
          quit
        </button>
      </div>
    </div>
  );
}
