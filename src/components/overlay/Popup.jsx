"use client";

import { useEffect, useId, useRef } from "react";
import { KeyLabel } from "@/components/Hint";
import { wrapTab } from "@/lib/focusWrap";
import { setPopupLock } from "@/lib/pageLock";
import styles from "./Popup.module.css";

// Where focus goes back to once the last popup closes. A swap (? and m, or the phone menu's keys
// row) replaces one popup with another in a single render (the page behind stays inert), so the
// element is recorded when the first one opens and kept across it. (Editing this file while a popup
// is open resets these in dev; focus then falls to the page on close.)

let openCount = 0,
  returnTo = null,
  restorePending = false;

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The frame the popups (keys, more…, the phone's menu) share: the scrim (a click on it closes), the
 * box with its ┤ label ├ head and [esc] close button, the scrolling body (the popup's own scroll
 * keys move it: [data-popup-scroll], src/lib/keyRouter.js) and an optional foot. The box is the
 * dialog, named by its label; it takes focus when it opens and focus returns to where it was when
 * the last popup closes. App makes the page behind inert, and the page is held still
 * (pageLock.js `setPopupLock`) so a wheel over the scrim can't scroll it; Tab and Shift+Tab
 * wrap inside the box (src/lib/focusWrap.js), so focus never reaches the browser's own
 * chrome. `name` overrides
 * the dialog's accessible name (default: the label). `className` sizes the box
 * (`--popup-max-h` caps its height); `bodyClassName` and `footClassName` style the body and
 * the foot.
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
    setPopupLock(true);
    boxRef.current?.focus({ preventScroll: true });
    return () => {
      openCount--;
      if (openCount > 0) return;
      // Wait out a swap: the other popup mounts in this same commit.
      restorePending = true;
      queueMicrotask(() => {
        if (!restorePending) return;
        restorePending = false;
        setPopupLock(false);
        // Only if focus went down with the box: App may have moved it on purpose in the
        // same commit (e.g. Back/Forward lands on a project's title).
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost) returnTo?.focus?.({ preventScroll: true });
        returnTo = null;
      });
    };
  }, []);

  // Tab inside the dialog stays inside it (the page behind is inert, so the browser would
  // otherwise carry focus out to its own chrome and back in).
  const onKeyDown = (e) => {
    if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
    const box = boxRef.current,
      stops = [...box.querySelectorAll(TABBABLE)].filter(
        (el) => !el.disabled && el.getClientRects().length > 0, // not a hidden hint's button
      );
    const to = wrapTab({
      at: stops.indexOf(document.activeElement),
      count: stops.length,
      shift: e.shiftKey,
    });
    if (to === null) return;
    e.preventDefault();
    (stops[to] ?? box).focus({ preventScroll: true });
  };

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
        onKeyDown={onKeyDown}
      >
        <div className={styles.head}>
          <span id={labelId}>
            <span aria-hidden="true">┤ </span>
            {label}
            <span aria-hidden="true"> ├</span>
          </span>
          <button type="button" onClick={onClose} data-key="Escape" className={styles.close}>
            <KeyLabel className={styles.dim}>[esc]</KeyLabel> close
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
