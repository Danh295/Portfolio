"use client";

import { useEffect, useRef } from "react";
import styles from "./Tooltip.module.css";

/**
 * One fixed tooltip for the whole page, driven by `data-tip` attributes. Follows the
 * cursor at (+14, +18) and flips left/up using its measured size. Elements marked
 * `data-tip-focus` (focusable ones whose tip is their only detail, e.g. skills rows) also
 * show it under themselves while they have keyboard focus.
 */
export default function Tooltip() {
  const ref = useRef(null);

  useEffect(() => {
    const tip = ref.current;
    let target = null;
    const text = () => (target ? "› " + target.getAttribute("data-tip") : "");
    const onOver = (e) => {
      const t = e.target.closest ? e.target.closest("[data-tip]") : null;
      target = t && t.getAttribute("data-tip") ? t : null;
      delete tip.dataset.focus;
      if (!target) {
        tip.style.opacity = "0";
        return;
      }
      tip.textContent = text();
      place(e);
      tip.style.opacity = "1";
    };
    // Position next to the pointer, flipping left/up near the viewport edges.
    const place = (e) => {
      const tw = tip.offsetWidth || 120,
        th = tip.offsetHeight || 28;
      const x =
        e.clientX + 14 + tw > window.innerWidth - 8
          ? Math.max(8, e.clientX - tw - 10)
          : e.clientX + 14;
      const below = e.clientY + 18 + th < window.innerHeight - 8;
      tip.style.left = x + "px";
      tip.style.top = (below ? e.clientY + 18 : e.clientY - th - 12) + "px";
    };
    const onMove = (e) => {
      if (!target) return; // nothing showing: no layout reads on every mouse move
      if (!target.isConnected) {
        target = null;
        tip.style.opacity = "0";
        return;
      }
      const tx = text();
      if (tip.textContent !== tx) tip.textContent = tx;
      place(e);
    };
    const hide = () => {
      target = null;
      delete tip.dataset.focus;
      tip.style.opacity = "0";
    };
    const onFocus = (e) => {
      const t = e.target instanceof Element ? e.target.closest("[data-tip-focus]") : null;
      if (!t || !t.matches(":focus-visible")) return;
      target = t;
      tip.dataset.focus = "";
      tip.textContent = text();
      const r = t.getBoundingClientRect(),
        th = tip.offsetHeight || 28;
      tip.style.left =
        Math.max(8, Math.min(r.left, window.innerWidth - tip.offsetWidth - 8)) + "px";
      tip.style.top =
        (r.bottom + 6 + th < window.innerHeight - 8 ? r.bottom + 6 : r.top - th - 6) + "px";
      tip.style.opacity = "1";
    };
    const onBlur = (e) => {
      if (e.target === target) hide();
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("pointerdown", hide);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerdown", hide);
    };
  }, []);

  return <div ref={ref} className={styles.tip} role="tooltip" aria-hidden="true" />;
}
