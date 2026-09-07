"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { isPlayed, isStill, useTextFx } from "@/lib/useTextFx";
import { blankText, restoreText, typeIn } from "@/lib/typeIn";
import styles from "./SectionFrame.module.css";

// Animated part of a frame label (e.g. "~/projects").
function FxText({ text, trigger, reduce, active, onStart }) {
  const ref = useRef(null);
  useTextFx(ref, text, trigger, reduce, active, onStart);
  return <span ref={ref}>{text}</span>;
}

/**
 * 1px --fg box with a label sitting on its top border: ┤ [1] ~/projects ├
 * `prefix` is static, `title` gets the heading effect. The active frame's label shows a
 * blinking cursor while the header itself is selected (`caret`); it goes away when an
 * element inside the section is selected. The hero puts its cursor on the h1 instead.
 * With the "active" title effect, everything else in the frame starts blank too and
 * types in, top to bottom, the moment the header starts typing (once per page load).
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
    blanked = useRef(null), // text-node entries waiting to type in
    cancel = useRef(null);
  const reveal = titleFx === "active";

  // Before first paint: blank the frame's content if its header hasn't played yet.
  useLayoutEffect(() => {
    if (!reveal || isPlayed("active", title) || isStill(reduce)) return;
    const frame = frameRef.current;
    blanked.current = blankText(frame, labelRef.current);
    return () => {
      if (cancel.current) cancel.current();
      else if (blanked.current) restoreText(blanked.current);
      cancel.current = blanked.current = null;
    };
  }, [reveal, title, reduce]);

  const onStart = useCallback(() => {
    if (!blanked.current || !frameRef.current) return;
    cancel.current = typeIn(blanked.current, frameRef.current);
    blanked.current = null;
  }, []);

  return (
    <Tag
      ref={frameRef}
      id={id}
      data-sec={sec}
      aria-labelledby={id ? id + "-label" : undefined}
      className={`${styles.frame} ${className}`}
      {...rest}
    >
      {/* The label is the section's heading (screen readers skip the ┤ ├ decoration). */}
      <h2 ref={labelRef} id={id ? id + "-label" : undefined} className={styles.label}>
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
