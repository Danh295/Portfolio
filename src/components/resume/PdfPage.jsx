"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import { CSS_PX_PER_PT } from "@/lib/resumeView";
import { linkBoxes } from "@/lib/resumeLinks";
import styles from "./ResumeViewer.module.css";

// The canvas keeps at least this many pixels across, so printing it (Cmd+P prints what is on
// the page) isn't soft at a small zoom; and never more than MAX_PIXELS in all: iOS Safari
// leaves a bigger canvas blank (its limit is 16.7 million).
const MIN_CANVAS_WIDTH = 1700;
const MAX_PIXELS = 12_000_000;
// A zoom step redraws after this pause, so a held + or - (or a pinch) draws once at the end;
// the old drawing is stretched to the new size meanwhile.
const REDRAW_DELAY_MS = 100;

/** The page's border, in px: the one place it is set (the box uses it, and so does the room). */
export const PAGE_BORDER = 1;

/**
 * One page of the PDF: a box at the zoomed size, links over it, the drawing swapped in.
 * `pageInfo`: { page, size: [w, h] on screen in pt, rotated, view, annotations }.
 */
export default function PdfPage({ index, pageInfo, zoom }) {
  const boxRef = useRef(null);
  // The drawing failed (the canvas could not be rendered): say so on the page and offer the file.
  const [failed, setFailed] = useState(false);
  const scale = zoom * CSS_PX_PER_PT;

  // Until the redraw lands, the old text layer is re-scaled with the page, so selecting and
  // finding text still line up with the (stretched) drawing.
  useEffect(() => {
    boxRef.current?.lastElementChild?.style.setProperty("--total-scale-factor", String(scale));
  }, [scale]);

  useEffect(() => {
    const { page } = pageInfo;
    const width = pageInfo.size[0] * scale,
      height = pageInfo.size[1] * scale;
    let cancelled = false,
      task = null,
      text = null;
    const draw = async () => {
      const ratio = Math.min(
        Math.max(window.devicePixelRatio || 1, MIN_CANVAS_WIDTH / width),
        Math.sqrt(MAX_PIXELS / (width * height)),
      );
      // Draw off screen and swap, so the old drawing stays (stretched to the new size by
      // CSS) until the new one is ready, and no two renders ever share a canvas.
      const canvas = document.createElement("canvas");
      const viewport = page.getViewport({ scale: scale * ratio });
      // render() draws into the canvas as it is: size it to the viewport first.
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      await task.promise;
      if (cancelled) return;
      // The text layer (selecting, finding) is best effort: a drawn page is shown even when it
      // fails, with an empty layer left in its place (the scale effect above expects one).
      const layer = document.createElement("div");
      layer.className = styles.text;
      layer.style.setProperty("--total-scale-factor", String(scale));
      try {
        const { TextLayer } = await import("pdfjs-dist");
        text = new TextLayer({
          textContentSource: page.streamTextContent(),
          container: layer,
          viewport: page.getViewport({ scale }),
        });
        await text.render();
      } catch (e) {
        if (cancelled || e?.name === "AbortException" || e?.name === "RenderingCancelledException")
          return;
        console.warn("the resume's text layer failed; the page is drawn without it", e);
        layer.replaceChildren();
      }
      if (cancelled) return;
      boxRef.current?.replaceChildren(canvas, layer);
      setFailed(false);
    };
    // The first drawing starts at once; a later one waits out a burst of zoom steps.
    const timer = setTimeout(
      () =>
        draw().catch((e) => {
          // A superseded render rejects with a "cancelled" exception, and so does one the
          // page was left in the middle of: both are expected.
          if (cancelled || e?.name === "RenderingCancelledException") return;
          console.error(e);
          // A drawing already on the page (an earlier zoom) stays; the note is for a page
          // that has never drawn.
          if (!boxRef.current?.firstChild) setFailed(true);
        }),
      boxRef.current?.firstChild ? REDRAW_DELAY_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
      text?.cancel();
    };
  }, [pageInfo, scale]);

  return (
    <div
      className={styles.page}
      data-page={index + 1}
      style={{
        width: pageInfo.size[0] * scale,
        height: pageInfo.size[1] * scale,
        borderWidth: PAGE_BORDER,
        "--aspect": `${pageInfo.size[0]} / ${pageInfo.size[1]}`,
      }}
    >
      <div ref={boxRef} className={styles.layers} />
      {failed && (
        <p className={styles.pageNote}>
          couldn&apos;t draw this page.{" "}
          <a href={site.resumePdf} target="_blank" rel="noopener">
            open the pdf
          </a>
        </p>
      )}
      {(pageInfo.rotated ? [] : linkBoxes(pageInfo.annotations, pageInfo.view, scale)).map((b) => (
        <a
          key={b.href + b.left + b.top}
          href={b.href}
          target={/^https?:/i.test(b.href) ? "_blank" : undefined}
          rel="noreferrer"
          className={styles.link}
          aria-label={b.href.replace(/^https?:\/\/|^mailto:/, "")}
          style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
        />
      ))}
    </div>
  );
}
