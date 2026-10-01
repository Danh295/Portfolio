"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether the single-character keyboard shortcuts (j k e g l r t h m i f 1 2 3 ? ` and the
// terminal's 0-9) are on. WCAG 2.1.4 wants a way to turn them off; default is on. Saved in
// localStorage ("on" / "off"), mirrored onto <html data-keys> so CSS can hide the key hints
// while they're off.
const KEY = "danny-keys";
const listeners = new Set();
let memory = null; // fallback when storage is blocked: the choice lasts for the page

const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "on" || v === "off") return v !== "off";
  } catch {
    // storage blocked: use the in-memory choice
  }
  return memory !== "off";
};

const mirror = (on) => {
  document.documentElement.dataset.keys = on ? "on" : "off";
};

function subscribe(cb) {
  listeners.add(cb);
  mirror(read());
  // Another tab changed it.
  const onStorage = (e) => {
    if (e.key !== KEY && e.key !== null) return;
    mirror(read());
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** [on, setOn(bool), toggle()] — setOn/toggle remember the choice. */
export function useKeysPref() {
  const on = useSyncExternalStore(subscribe, read, () => true);
  const setOn = useCallback((v) => {
    memory = v ? "on" : "off";
    try {
      localStorage.setItem(KEY, memory);
    } catch {
      // not persisted, still applied
    }
    mirror(v);
    listeners.forEach((l) => l());
  }, []);
  const toggle = useCallback(() => setOn(!read()), [setOn]);
  return [on, setOn, toggle];
}
