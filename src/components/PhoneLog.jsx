"use client";

import { useEffect } from "react";

/**
 * TEMPORARY, for debugging a real iPhone (remove before pushing): with ?vvlog in the URL it
 * posts a timestamped record of where everything is (the window, the visual viewport, the
 * bars, the shells, the focus) to the dev server's /Portfolio/__log whenever anything moves,
 * and shows a small button that numbers the steps of a scripted run.
 */
export default function PhoneLog() {
  useEffect(() => {
    if (!location.search.includes("vvlog")) return;
    const vv = window.visualViewport;
    let mark = 0,
      queue = [],
      last = "",
      timer = 0;
    const rect = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.top), Math.round(b.bottom)];
    };
    const snap = (ev) => {
      const term = document.querySelector('[data-mode="term"] > div');
      const rec = {
        ev,
        mark,
        iH: window.innerHeight,
        cH: document.documentElement.clientHeight,
        vvH: vv && Math.round(vv.height),
        vvTop: vv && Math.round(vv.offsetTop),
        vvScale: vv && vv.scale,
        sY: Math.round(window.scrollY),
        mode: document.querySelector("[data-mode]")?.dataset.mode,
        locked: document.documentElement.classList.contains("locked"),
        kb: !!document.querySelector("[data-kb]"),
        nav: rect(document.querySelector("nav")),
        bar: rect(document.querySelector("footer")),
        shell: rect(document.querySelector('[aria-label="embedded shell"]')),
        term: rect(term),
        tabs: rect(term?.lastElementChild),
        ae: document.activeElement?.tagName,
        orient: screen.orientation?.type,
      };
      if (ev === "mark") {
        // What is under the hero heading's bottom-left corner (an odd underline seen there).
        const h1 = document.querySelector("h1");
        if (h1) {
          const b = h1.getBoundingClientRect();
          const name = (e) =>
            e.tagName + "." + String(e.className?.baseVal ?? e.className).slice(0, 50);
          rec.probe = {
            h1: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)],
            h1Text: h1.textContent,
            deco: getComputedStyle(h1).textDecorationLine,
            points: [-4, 0, 4, 8, 12].map((dy) => ({
              dy,
              at: document
                .elementsFromPoint(b.left + 10, b.bottom + dy)
                .slice(0, 4)
                .map(name),
            })),
            pressed: [...document.querySelectorAll("[data-pressed]")].map(name),
            fx: [...document.querySelectorAll("[data-fx],[data-typing]")].map(
              (e) => name(e) + ":" + (e.dataset.fx ?? "") + "/" + (e.dataset.typing ?? "-"),
            ),
            focus: document.activeElement && name(document.activeElement),
            html: document.documentElement.className,
          };
        }
      }
      const key = JSON.stringify({ ...rec, ev: 0 });
      if (key === last) return;
      last = key;
      queue.push({ t: Math.round(performance.now()), ...rec });
    };
    const flush = () => {
      if (!queue.length) return;
      const body = JSON.stringify(queue);
      queue = [];
      navigator.sendBeacon(
        location.origin + "/Portfolio/__log",
        new Blob([body], { type: "text/plain" }),
      );
    };
    let throttled = 0;
    const on = (target, type) => {
      const h = () => {
        if ((type === "scroll" || type === "touchmove") && performance.now() - throttled < 60)
          return;
        throttled = performance.now();
        snap(type);
      };
      target.addEventListener(type, h, { passive: true, capture: true });
      return () => target.removeEventListener(type, h, { capture: true });
    };
    const offs = [
      on(window, "scroll"),
      on(window, "resize"),
      on(window, "orientationchange"),
      on(document, "focusin"),
      on(document, "focusout"),
      on(document, "touchstart"),
      on(document, "touchend"),
      on(document, "touchmove"),
      vv && on(vv, "resize"),
      vv && on(vv, "scroll"),
    ].filter(Boolean);
    const mo = new MutationObserver(() => snap("dom"));
    mo.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-kb", "class", "style"],
    });
    timer = window.setInterval(flush, 400);
    const btn = document.createElement("button");
    btn.textContent = "step 0";
    btn.style.cssText =
      "position:fixed;right:4px;top:4px;z-index:99999;font:11px monospace;background:#fc0;color:#000;border:1px solid #000;padding:6px 8px";
    btn.addEventListener("click", () => {
      mark++;
      btn.textContent = "step " + mark;
      snap("mark");
    });
    document.body.appendChild(btn);
    snap("start");
    return () => {
      offs.forEach((off) => off());
      mo.disconnect();
      window.clearInterval(timer);
      flush();
      btn.remove();
    };
  }, []);
  return null;
}
