"use client";

import { useCallback, useSyncExternalStore } from "react";

// Theme lives on <html data-theme>, which switches the five CSS tokens in globals.css.
// Before first paint, the inline script in app/layout.js sets it from the visitor's saved
// choice, or else their OS setting. Toggling saves the choice (localStorage); until then
// the site keeps following the OS live.
const KEY = "danny-theme";
const OS_LIGHT = "(prefers-color-scheme: light)";
const listeners = new Set();

const read = () => document.documentElement.dataset.theme !== "light";

function apply(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#121211" : "#F3F2EE");
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  // The pre-paint script can run before Next adds <meta name="theme-color">: sync it now.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", read() ? "#121211" : "#F3F2EE");
  const mq = window.matchMedia(OS_LIGHT);
  const onOs = () => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // storage blocked: follow the OS
    }
    if (saved !== "dark" && saved !== "light") apply(!mq.matches);
  };
  mq.addEventListener("change", onOs);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onOs);
  };
}

/** [dark, setDark(bool), toggle()] — setDark/toggle remember the choice. */
export function useTheme() {
  // Server snapshot: dark, matching the static HTML; the client snapshot is whatever the
  // pre-paint script chose, so there's no flash and no hydration mismatch.
  const dark = useSyncExternalStore(subscribe, read, () => true);
  const setDark = useCallback((d) => {
    try {
      localStorage.setItem(KEY, d ? "dark" : "light");
    } catch {
      // not persisted, still applied
    }
    apply(d);
  }, []);
  const toggle = useCallback(() => setDark(!read()), [setDark]);
  return [dark, setDark, toggle];
}
