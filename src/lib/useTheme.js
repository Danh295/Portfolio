"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isDark, themeKeyChanged } from "./themePref";

// Theme lives on <html data-theme>, which switches the five CSS tokens in globals.css.
// Before first paint, the inline script in app/layout.js sets it from the visitor's saved
// choice, or else their OS setting. Toggling saves the choice (localStorage); until then
// the site keeps following the OS live.
const KEY = "danny-theme";
const OS_LIGHT = "(prefers-color-scheme: light)";
const listeners = new Set();

const read = () => document.documentElement.dataset.theme !== "light";

// layout.js declares a theme-color per OS scheme (for the first paint); once a theme is
// chosen, both carry its colour so the browser chrome matches the page either way.
const syncThemeColor = (dark) =>
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", dark ? "#121211" : "#F3F2EE"));

function apply(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  syncThemeColor(dark);
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  // The pre-paint script can run before Next adds <meta name="theme-color">: sync it now.
  syncThemeColor(read());
  const mq = window.matchMedia(OS_LIGHT);
  // The OS changed, or another tab saved (or cleared) the choice: apply what the saved choice
  // and the OS now say. A choice made in this tab applies itself (setDark), so no event here.
  const refresh = () => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // storage blocked: follow the OS
    }
    apply(isDark(saved, mq.matches));
  };
  const onStorage = (e) => {
    if (themeKeyChanged(e.key, KEY)) refresh();
  };
  mq.addEventListener("change", refresh);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", refresh);
    window.removeEventListener("storage", onStorage);
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

/** The pages with no toggle (the resume, the 404) call this to follow the OS and other tabs. */
export function useThemeFollow() {
  useTheme();
}
