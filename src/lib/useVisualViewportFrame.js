"use client";

import { useEffect } from "react";

/**
 * Keep a fixed full-screen element on the part of the screen the visitor can see, so a
 * phone's on-screen keyboard doesn't drag the page about (iOS Safari pans the visual
 * viewport to reveal the focused input, which slid terminal mode's header off the top and
 * left its bottom bar floating above the keyboard). Sets on `frameRef`'s element:
 *   --vv-top / --vv-h   the visible area's top and height (`visualViewport`)
 *   data-kb             present while a keyboard covers the bottom of the screen
 * and leaves them off while the page is pinch-zoomed or `visualViewport` is missing, where
 * the element's own CSS defaults apply.
 */
export function useVisualViewportFrame(frameRef) {
  useEffect(() => {
    const el = frameRef.current,
      vv = window.visualViewport;
    if (!el || !vv) return;
    const update = () => {
      if (vv.scale > 1.01) {
        el.style.removeProperty("--vv-top");
        el.style.removeProperty("--vv-h");
        delete el.dataset.kb;
        return;
      }
      el.style.setProperty("--vv-top", Math.round(vv.offsetTop) + "px");
      el.style.setProperty("--vv-h", Math.round(vv.height) + "px");
      if (window.innerHeight - vv.height - vv.offsetTop > 80) el.dataset.kb = "";
      else delete el.dataset.kb;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.removeProperty("--vv-top");
      el.style.removeProperty("--vv-h");
      delete el.dataset.kb;
    };
  }, [frameRef]);
}
