"use client";

import { useEffect, useRef } from "react";
import SectionFrame from "@/components/frame/SectionFrame";
import Hint, { KeyLabel } from "@/components/Hint";
import styles from "./Skills.module.css";

// "ieso (Oracle Database), acme": names with the tag they counted through, for the muted line.
const names = (items) =>
  items.map((it) => it.name + (it.via.length ? " (" + it.via.join(", ") + ")" : "")).join(", ");

// The panel's height before it exists (it only renders while open): a header line, a line per
// project, and the muted line (two lines when it wraps), so it can open upward near the bar.
const panelHeight = (u) =>
  34 + 22 * u.projects.length + (u.jobs.length || u.courses.length ? 40 : 0);

/**
 * `open` is { name, up } for the skill whose panel shows (App holds it so Esc can close it
 * through the key router), `onOpen` sets it, `onProject(slug)` jumps to a project's row.
 */
export default function Skills({ skills, total, active, open, onOpen, onProject }) {
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

  // Opens `s`'s panel on `row`, below it unless the bars would cover it and there's room above.
  const show = (s, row) => {
    if (open?.name === s.name) return;
    const rect = row.getBoundingClientRect(),
      css = getComputedStyle(document.documentElement),
      bar = parseFloat(css.getPropertyValue("--bar-h")) || 44,
      nav = parseFloat(css.getPropertyValue("--nav-h")) || 58,
      h = panelHeight(s.uses);
    // Below unless the bars would cover it; when neither side has room, the roomier one.
    const below = window.innerHeight - bar - 8 - rect.bottom,
      above = rect.top - nav - 8;
    onOpen({ name: s.name, up: below < h && above > below });
  };

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
        {skills.map((g) => (
          <div key={g.label} className={styles.group}>
            <span className={styles.label}>{g.label}/</span>
            {g.items.map((s) => {
              const here = open?.name === s.name;
              const { projects, jobs, courses } = s.uses;
              return (
                // Focusable so keyboard users get the panel too (Tab opens it, Tab again
                // reaches its projects); screen readers read the details instead of the bar glyphs.
                <div
                  key={s.name}
                  data-skill={s.name}
                  data-open={here ? "" : undefined}
                  data-up={here && open.up ? "" : undefined}
                  role="group"
                  aria-label={s.name}
                  tabIndex={0}
                  className={styles.row}
                  onPointerDown={(e) => {
                    touched.current = e.pointerType === "touch";
                  }}
                  onPointerEnter={(e) => {
                    // Not while the keyboard owns hover: a row scrolling under a still mouse.
                    if (
                      e.pointerType !== "touch" &&
                      !document.documentElement.classList.contains("kbd")
                    )
                      show(s, e.currentTarget);
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
                    else show(s, e.currentTarget);
                  }}
                  onFocus={(e) => {
                    if (e.target.matches(":focus-visible")) show(s, e.currentTarget);
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
                    <div data-skill-panel="" className={styles.panel}>
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
