"use client";

import { useEffect, useRef, useState } from "react";
import EggCanvas from "@/components/egg/EggCanvas";
import { EGG_PX } from "@/lib/egg/grid";
import { eggFit } from "@/lib/egg/fit";
import { isPhone, isTouch } from "@/lib/egg/screen";
import styles from "./TermLines.module.css";

// Status lines are reserved at their tallest (stage 5: a wrapped title, blank, head, 5 rows) so
// the pot never changes size between stages, plus the button row, gaps and padding.
const RESERVE = 9 * 22.4 + 44 + 8 * 2 + 16;
// iOS gives the screen back to the page in steps after a keyboard closes: look again then.
const SETTLE_MS = [60, 250, 600, 1100];

/**
 * terminal mode's inline ./egg. On a touch screen it is played like the hero's egg: a tap on
 * the pot only holds it (src/lib/egg/held.js; one finger turns the pot), the stages are
 * buttons under it, and `quit` replaces ctrl-c. On a phone the block fills the visible output
 * area exactly (src/lib/egg/fit.js) and keeps its top at the area's top edge whenever the
 * area changes, instead of relying on the output staying pinned to its bottom (that pin
 * lets go mid keyboard change). It ends above the area's bottom padding, so the pin and the
 * alignment agree. `frameRef` is the hook's, to tell a press inside the block from one outside (held.js);
 * `egg`: { held, stage, enter, prompt, play, quit }.
 */
export default function TermEgg({ preRef, fxRef, statusRef, frameRef, handlers, egg }) {
  const root = useRef(null),
    boxRef = useRef(null),
    lastType = useRef("mouse");
  const [fill, setFill] = useState(0); // the block's height on a phone; 0 = leave it be
  const [scale, setScale] = useState(1);
  const touch = typeof window !== "undefined" && isTouch();

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
    const onTouch = isTouch();
    // The buttons play the egg and the prompt is hidden, so an on-screen keyboard left open
    // from typing `./egg` only takes up room: put it away. (`data-kb` marks the frame while one
    // is up; with a hardware keyboard there is none, and Enter / ctrl-c still need the prompt.)
    if (onTouch && el.closest("[data-kb]") && document.activeElement?.tagName === "INPUT")
      document.activeElement.blur();
    const fit = () => {
      // What lies under the block when the output is pinned to its bottom: the content's row
      // gap and the area's bottom padding. Leaving room for them makes that pin land exactly
      // on the block's top edge, so focusing a button (the shell pins to the bottom on focus)
      // moves nothing: a 23px jump between press and release sent the click to the wrong place.
      const below =
        (parseFloat(getComputedStyle(box.firstElementChild).rowGap) || 0) +
        (parseFloat(getComputedStyle(box).paddingBottom) || 0);
      const f = eggFit({
        areaPx: box.clientHeight - below,
        framePx: EGG_PX,
        reservePx: RESERVE,
        touchPhone: onTouch && isPhone(),
      });
      setFill(f.fill);
      setScale(f.scale);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", fit);
    const timers = SETTLE_MS.map((ms) =>
      setTimeout(() => {
        fit();
        align();
      }, ms),
    );
    fit();
    // The block fills the area, so there's nothing else to scroll to while the egg runs:
    // anything that moves it (iOS panning during a keyboard change) is put back at once. Unless
    // the block is taller than the area (a very short screen): then it must scroll, or the
    // buttons under the pot would be out of reach.
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          const fits = el.offsetHeight <= (parseFloat(el.style.minHeight) || 0) + 1;
          if (onTouch && isPhone() && fits) align();
        });
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      vv?.removeEventListener("resize", fit);
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  // After the block's size changes, put its top back at the top of the area.
  useEffect(() => {
    if (fill) align();
  }, [fill, egg.stage]);

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
      ref={(el) => {
        root.current = el;
        frameRef.current = el;
      }}
      className={styles.egg}
      data-held={egg.held ? "" : undefined}
      // The shell pane focuses its prompt on a click, which would open the keyboard.
      data-no-focus={touch ? "" : undefined}
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
