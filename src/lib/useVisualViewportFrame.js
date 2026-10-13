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
 * the element's own CSS defaults apply. Also locks the page itself (`html.locked`,
 * globals.css) so nothing but the app's own scroll boxes move.
 */
export function useVisualViewportFrame(frameRef) {
  useEffect(() => {
    const el = frameRef.current,
      vv = window.visualViewport;
    if (!el) return;
    document.documentElement.classList.add("locked");
    if (!vv) return () => document.documentElement.classList.remove("locked");
    // TEMPORARY, for diagnosing the keyboard on a real iPhone: ?vvdebug prints the numbers.
    let dbg = null;
    if (location.search.includes("vvdebug")) {
      dbg = document.createElement("pre");
      dbg.style.cssText =
        "position:fixed;left:4px;top:70px;z-index:99999;background:#000;color:#0f0;font:11px/1.3 monospace;padding:4px;margin:0;pointer-events:none;white-space:pre";
      document.body.appendChild(dbg);
    }
    const update = () => {
      if (dbg) {
        const tabs = el.querySelector('[class*="tabs"]')?.getBoundingClientRect();
        dbg.textContent = [
          "innerH " + window.innerHeight + "  clientH " + document.documentElement.clientHeight,
          "vv.h " +
            Math.round(vv.height) +
            "  top " +
            Math.round(vv.offsetTop) +
            "  pageTop " +
            Math.round(vv.pageTop),
          "scale " + vv.scale + "  scrollY " + Math.round(window.scrollY),
          "kb " +
            (window.innerHeight - vv.height - vv.offsetTop) +
            "  data-kb " +
            (el.dataset.kb !== undefined),
          "frame top " +
            Math.round(el.getBoundingClientRect().top) +
            " bottom " +
            Math.round(el.getBoundingClientRect().bottom),
          "tabs top " +
            (tabs ? Math.round(tabs.top) : "-") +
            " bottom " +
            (tabs ? Math.round(tabs.bottom) : "-"),
        ].join("\n");
      }
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
      dbg?.remove();
      document.documentElement.classList.remove("locked");
      el.style.removeProperty("--vv-top");
      el.style.removeProperty("--vv-h");
      delete el.dataset.kb;
    };
  }, [frameRef]);
}
