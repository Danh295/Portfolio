"use client";

import { useCallback, useEffect, useRef } from "react";
import { isPlayed, useTextFx } from "@/lib/useTextFx";
import { blankText, typeIn } from "@/lib/typeIn";
import styles from "./SectionFrame.module.css";

// Animated part of a frame label (e.g. "~/projects").
function FxText({ text, trigger, reduce, active, onStart }) {
  const ref = useRef(null);
  useTextFx(ref, text, trigger, reduce, active, onStart);
  return (
    <span ref={ref} data-fx={isPlayed(trigger, text) ? undefined : "pending"}>
      {text}
    </span>
  );
}

/**
 * 1px --fg box with a label sitting on its top border: ┤ [1] ~/projects ├
 * `prefix` is static, `title` gets the heading effect. The active frame's label shows a
 * blinking cursor while the header itself is selected (`caret`); it goes away when an
 * element inside the section is selected. The hero puts its cursor on the h1 instead.
 * With the "active" title effect, everything else in the frame types in too, top to
 * bottom, the moment the header starts typing (once per page load). Until then the frame
 * is `data-fx="pending"`: its text is in the DOM (screen readers, find-in-page and
 * crawlers read it) but CSS hides it (globals.css, html.fx), from the first paint.
 */
export default function SectionFrame({
  as: Tag = "section",
  id,
  sec,
  prefix = "",
  title,
  titleFx = "active",
  right,
  active,
  caret = true,
  reduce,
  className = "",
  children,
  ...rest
}) {
  const frameRef = useRef(null),
    labelRef = useRef(null),
    cancel = useRef(null);
  const pending = titleFx === "active" && !isPlayed("active", title);

  // The header started typing: in one go, blank the frame's text (same-width spaces),
  // un-hide it and type it back in. Unmounting mid-way restores the text.
  const onStart = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || frame.dataset.fx !== "pending") return;
    const entries = blankText(frame, labelRef.current);
    delete frame.dataset.fx;
    cancel.current = typeIn(entries, frame);
  }, []);
  useEffect(
    () => () => {
      if (cancel.current) cancel.current();
      cancel.current = null;
    },
    [],
  );

  return (
    <Tag
      ref={frameRef}
      id={id}
      data-sec={sec}
      data-fx={pending ? "pending" : undefined}
      aria-labelledby={id ? id + "-label" : undefined}
      className={`${styles.frame} ${className}`}
      {...rest}
    >
      {/* The label is the section's heading (screen readers skip the ┤ ├ decoration). */}
      {/* Named by its title: the typed text may still be blank, and the [1] key hint
          isn't part of the name. */}
      <h2
        ref={labelRef}
        id={id ? id + "-label" : undefined}
        aria-label={title}
        className={styles.label}
      >
        <span aria-hidden="true">┤</span>{" "}
        <span
          className={active ? (caret ? `${styles.on} ${styles.caret}` : styles.on) : styles.off}
        >
          {prefix}
          {titleFx === "none" ? (
            title
          ) : (
            <FxText
              text={title}
              trigger={titleFx}
              reduce={reduce}
              active={active}
              onStart={onStart}
            />
          )}
        </span>{" "}
        <span aria-hidden="true">├</span>
      </h2>
      {right && <span className={styles.right}>{right}</span>}
      {children}
    </Tag>
  );
}
