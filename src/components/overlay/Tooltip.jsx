"use client";

import { useEffect, useRef } from "react";
import styles from "./Tooltip.module.css";

/**
 * One fixed tooltip for the whole page, driven by `data-tip` attributes. Follows the
 * cursor at (+14, +18) and flips left/up using its measured size.
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
      if (target) {
        if (!target.isConnected) {
          target = null;
          tip.style.opacity = "0";
          return;
        }
        const tx = text();
        if (tip.textContent !== tx) tip.textContent = tx;
      }
      place(e);
    };
    const hide = () => {
      target = null;
      tip.style.opacity = "0";
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("pointerdown", hide);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerdown", hide);
    };
  }, []);

  return <div ref={ref} className={styles.tip} role="tooltip" aria-hidden="true" />;
}
