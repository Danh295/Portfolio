"use client";

import { useEffect, useRef } from "react";
import SectionFrame from "@/components/frame/SectionFrame";
import Hint, { KeyLabel } from "@/components/Hint";
import styles from "./Skills.module.css";

// "ieso (Oracle Database), acme": names with the tag they counted through, for the muted line.
const names = (items) =>
  items.map((it) => it.name + (it.via.length ? " (" + it.via.join(", ") + ")" : "")).join(", ");

// Puts the panel where it fits: under its row, or above when the bars would cover it and
// there's more room there. Measured from the real panel, on mount and again once a jump's
// scroll has settled (the row moves with the page, the bars don't). Returns the cleanup.
function fit(panel) {
  const row = panel.parentElement,
    css = getComputedStyle(document.documentElement),
    bar = parseFloat(css.getPropertyValue("--bar-h")) || 44,
    nav = parseFloat(css.getPropertyValue("--nav-h")) || 58;
  const place = () => {
    const r = row.getBoundingClientRect(),
      below = window.innerHeight - bar - 8 - r.bottom,
      above = r.top - nav - 8;
    row.toggleAttribute("data-up", panel.offsetHeight > below && above > below);
  };
  place();
  const t = setTimeout(place, 450);
  window.addEventListener("scrollend", place);
  return () => {
    clearTimeout(t);
    window.removeEventListener("scrollend", place);
    row.removeAttribute("data-up");
  };
}

/**
 * `open` is { name } for the skill whose panel shows and `skillSel` the j/k-selected skill
 * (-1 = the header); App holds both so the key router can drive them. `onOpen` sets `open`,
 * `onProject(slug)` jumps to a project's row. The selected row is the list's one Tab stop.
 */
export default function Skills({ skills, total, active, open, skillSel, onOpen, onProject }) {
  // A touch pointer taps the row open; a mouse opens it by hovering, so its click mustn't toggle.
  const touched = useRef(false);
  const isOpen = open !== null;

  // A press anywhere outside the rows puts the panel away (a tap, on touch).
  useEffect(() => {
    if (!isOpen) return;
    const away = (e) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-skill]")) onOpen(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [isOpen, onOpen]);

  const show = (s) => {
    if (open?.name !== s.name) onOpen({ name: s.name });
  };

  // Each group's first index in the flat list the j/k selection walks, and the list's length.
  const starts = skills.map((_, gi) => skills.slice(0, gi).reduce((n, g) => n + g.items.length, 0));
  const count = skills.reduce((n, g) => n + g.items.length, 0);

  return (
    <SectionFrame
      id="skills"
      sec={3}
      prefix={<Hint>[3] </Hint>}
      title="~/skills"
      right={
        <>
          {"█ project ▓ job ▒ course · share of " + total}
          <KeyLabel> · hover or tab for details</KeyLabel>
        </>
      }
      active={active}
      className={styles.skills}
    >
      <div className={styles.grid}>
        {skills.map((g, gi) => (
          <div key={g.label} className={styles.group}>
            <span className={styles.label} data-skill-label="">
              {g.label}/
            </span>
            {g.items.map((s, ii) => {
              const i = starts[gi] + ii,
                on = skillSel === i && active,
                here = open?.name === s.name;
              const { projects, jobs, courses } = s.uses;
              return (
                // Focusable so keyboard users get the panel too (Tab opens it, Tab again
                // reaches its projects); screen readers read the details instead of the bar glyphs.
                <div
                  key={s.name}
                  data-skill={s.name}
                  data-open={here ? "" : undefined}
                  data-skillrow={i}
                  aria-current={on ? "true" : undefined}
                  role="group"
                  aria-label={s.name + ", skill " + (i + 1) + " of " + count}
                  tabIndex={skillSel === i || (skillSel < 0 && i === 0) ? 0 : -1}
                  className={on ? styles.rowOn : styles.row}
                  onPointerDown={(e) => {
                    touched.current = e.pointerType === "touch";
                  }}
                  onPointerEnter={(e) => {
                    // Not while the keyboard owns hover: a row scrolling under a still mouse.
                    if (
                      e.pointerType !== "touch" &&
                      !document.documentElement.classList.contains("kbd")
                    )
                      show(s);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType !== "touch" && here) onOpen(null);
                  }}
                  onClick={(e) => {
                    if (
                      !touched.current ||
                      e.detail === 0 ||
                      e.target.closest("[data-skill-panel]")
                    )
                      return;
                    if (here) onOpen(null);
                    else show(s);
                  }}
                  onBlur={(e) => {
                    if (here && !e.currentTarget.contains(e.relatedTarget)) onOpen(null);
                  }}
                >
                  <span className={styles.raw}>{s.name}</span>
                  <span className={styles.bar} aria-hidden="true">
                    {s.bar}
                  </span>
                  <span className={styles.count} aria-hidden="true">
                    {s.count}
                  </span>
                  <span className="sr-only">{s.tip}</span>
                  {/* Touch shows the details as text under the row (Skills.module.css). */}
                  <span data-used="" className={styles.used} aria-hidden="true">
                    {s.tip}
                  </span>
                  {here && (
                    <div data-skill-panel="" ref={fit} className={styles.panel}>
                      <span className={styles.head} aria-hidden="true">
                        {"used in " + s.used}
                      </span>
                      {projects.map((p, i) => (
                        <button
                          key={p.slug}
                          type="button"
                          className={styles.proj}
                          onClick={() => {
                            onOpen(null);
                            onProject(p.slug);
                          }}
                        >
                          <span aria-hidden="true">
                            {(i < projects.length - 1 ? "├── " : "└── ") + "█ "}
                          </span>
                          <span>{p.name}</span>
                          {p.org && <span className={styles.dim}>{" at " + p.org}</span>}
                          {p.via.length > 0 && (
                            <span className={styles.dim}>{" (" + p.via.join(", ") + ")"}</span>
                          )}
                        </button>
                      ))}
                      {(jobs.length > 0 || courses.length > 0) && (
                        <div className={styles.rest} aria-hidden="true">
                          {jobs.length > 0 && <span>{"▓ " + names(jobs)}</span>}
                          {courses.length > 0 && <span>{"▒ " + names(courses)}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
