"use client";

import { useEffect, useRef, useState } from "react";
import { gridRows } from "@/lib/ascii/image";
import styles from "./ArtLine.module.css";

// How many columns the picture may have at most, and at least, whatever the screen offers.
const MAX_COLS = 100,
  MIN_COLS = 20;

/**
 * A project's picture in the shell, as static ASCII fitted to the line's width (a phone gets
 * fewer columns, the stored grid is resampled; no reveal here: the page is where the picture
 * shows). The grids are a separate chunk, loaded when the first picture line mounts, so the
 * shell itself doesn't carry them.
 */
export default function ArtLine({ mediaKey, alt, caption }) {
  const boxRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const [cols, setCols] = useState(0);

  useEffect(() => {
    let live = true;
    import("@/data/media-grids.json").then((m) => {
      if (live) setGrid(m.default[mediaKey] ?? null);
    });
    return () => {
      live = false;
    };
  }, [mediaKey]);

  // The observer reports the width once it starts watching, then on every change.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const px = parseFloat(getComputedStyle(el).fontSize) || 13;
      setCols(Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor(el.clientWidth / (px * 0.6)))));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={styles.art}>
      {grid && cols > 0 && (
        <pre role="img" aria-label={alt}>
          {gridRows(grid, cols).join("\n")}
        </pre>
      )}
      <div className={styles.cap}>{caption}</div>
    </div>
  );
}
