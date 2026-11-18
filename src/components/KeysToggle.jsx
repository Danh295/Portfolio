"use client";

import { useKeysPref } from "@/lib/useKeysPref";

/**
 * The single-character shortcuts on/off switch (WCAG 2.1.4) for the pages that are not the app
 * (the resume and the 404): the same saved preference as `[s]` in the app's keys popup, so
 * turning them off here holds on the home page too. `className` styles the button.
 */
export default function KeysToggle({ className }) {
  const [on, , toggle] = useKeysPref();
  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={on}
      aria-label="single-key shortcuts"
      data-action="keys"
    >
      keys: {on ? "on" : "off"}
    </button>
  );
}
