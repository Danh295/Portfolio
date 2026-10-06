"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./Popup.module.css";

// Where focus goes back to once the last popup closes. ? and m swap one popup for the
// other in a single render (the page behind stays inert), so the element is recorded
// when the first one opens and kept across the swap. (Editing this file while a popup is
// open resets these in dev; focus then falls to the page on close.)
let openCount = 0,
  returnTo = null,
  restorePending = false;

/**
 * The frame both popups (keys, more…) share: the scrim (a click on it closes), the box
 * with its ┤ label ├ head and [esc] close button, the scrolling body (the popup's own
 * scroll keys move it: [data-popup-scroll], src/lib/keyRouter.js) and an optional foot.
 * The box is the dialog, named by its label; it takes focus when it opens and focus
 * returns to where it was when the last popup closes. App makes the page behind inert.
 * `name` overrides the dialog's accessible name (default: the label). `className` sizes
 * the box (`--popup-max-h` caps its height); `bodyClassName` and `footClassName` style the
 * body and the foot.
 */
export default function Popup({
  label,
  onClose,
  name,
  className = "",
  bodyClassName = "",
  footClassName = "",
  foot,
  children,
}) {
  const boxRef = useRef(null),
    labelId = useId();
  useEffect(() => {
    if (openCount === 0 && !restorePending) returnTo = document.activeElement;
    restorePending = false;
    openCount++;
    boxRef.current?.focus({ preventScroll: true });
    return () => {
      openCount--;
      if (openCount > 0) return;
      // Wait out a swap: the other popup mounts in this same commit.
      restorePending = true;
      queueMicrotask(() => {
        if (!restorePending) return;
        restorePending = false;
        // Only if focus went down with the box: App may have moved it on purpose in the
        // same commit (e.g. Back/Forward lands on a project's title).
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost) returnTo?.focus?.({ preventScroll: true });
        returnTo = null;
      });
    };
  }, []);

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={boxRef}
        tabIndex={-1}
        className={`${styles.box} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        aria-labelledby={name ? undefined : labelId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <span id={labelId}>
            <span aria-hidden="true">┤ </span>
            {label}
            <span aria-hidden="true"> ├</span>
          </span>
          <button type="button" onClick={onClose} data-key="Escape" className={styles.close}>
            <span className={styles.dim}>[esc]</span> close
          </button>
        </div>
        <div className={`${styles.body} ${bodyClassName}`} data-popup-scroll="">
          {children}
        </div>
        {foot && <div className={`${styles.foot} ${footClassName}`}>{foot}</div>}
      </div>
    </div>
  );
}
