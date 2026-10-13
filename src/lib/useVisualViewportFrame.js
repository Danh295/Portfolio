"use client";

import { useEffect } from "react";
import { frameFor } from "@/lib/viewportFrame";

/** Whether something that opens a phone's keyboard has focus. */
const editableFocused = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
};

/**
 * Keep a fixed full-screen element on the part of the screen the visitor can see, so a
 * phone's on-screen keyboard doesn't drag the page about (iOS Safari pans the visual
 * viewport to reveal the focused input, which slid terminal mode's header off the top and
 * left its bottom bar floating above the keyboard). Sets on `frameRef`'s element:
 *   --vv-top / --vv-h   the visible area's top and height (`visualViewport`)
 *   data-kb             present while a keyboard covers the bottom of the screen
 * and leaves them off while the page is pinch-zoomed or `visualViewport` is missing, where
 * the element's own CSS defaults apply. What counts as a keyboard is decided by the pure
 * `frameFor` (src/lib/viewportFrame.js); this only reads the browser and applies it,
 * again whenever the viewport, the focus or the page moves. Also locks the page itself
 * (`html.locked`, globals.css) so nothing but the app's own scroll boxes move.
 */
export function useVisualViewportFrame(frameRef) {
  useEffect(() => {
    const el = frameRef.current,
      vv = window.visualViewport;
    if (!el) return;
    document.documentElement.classList.add("locked");
    if (!vv) return () => document.documentElement.classList.remove("locked");
    const update = () => {
      const f = frameFor({
        innerHeight: window.innerHeight,
        vvHeight: vv.height,
        vvOffsetTop: vv.offsetTop,
        vvScale: vv.scale,
        editableFocused: editableFocused(),
      });
      if (!f) {
        el.style.removeProperty("--vv-top");
        el.style.removeProperty("--vv-h");
        delete el.dataset.kb;
        return;
      }
      el.style.setProperty("--vv-top", f.top + "px");
      el.style.setProperty("--vv-h", f.height + "px");
      if (f.keyboard) el.dataset.kb = "";
      else delete el.dataset.kb;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      document.documentElement.classList.remove("locked");
      el.style.removeProperty("--vv-top");
      el.style.removeProperty("--vv-h");
      delete el.dataset.kb;
    };
  }, [frameRef]);
}
