"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import Hint from "@/components/Hint";
import { useKeysPref } from "@/lib/useKeysPref";
import { fitZoom, startZoom, stepZoom, zoomLabel } from "@/lib/resumeView";
import { resumeKey } from "@/lib/resumeKeys";
import { linkBoxes } from "@/lib/resumeLinks";
import styles from "./ResumeViewer.module.css";

const DOWNLOAD_NAME = "Danny_Hu_Resume.pdf";
const CSS_PX_PER_PT = 96 / 72;
// The canvas keeps at least this many pixels across, so printing it (the browser prints what
// is on the page) isn't soft at a small zoom; and never more than MAX_PIXELS in all: iOS
// Safari leaves a bigger canvas blank (its limit is 16.7 million).
const MIN_CANVAS_WIDTH = 1700;
const MAX_PIXELS = 12_000_000;
// The stage's side padding (2 × 16px) and the page's border (2 × 1px): the room a page can
// use is the stage's width less these.
const STAGE_GUTTER = 34;

/** One page of the PDF: a box at the zoomed size, links over it, the drawing swapped in. */
function PdfPage({ index, info, zoom, pdfRef }) {
  const boxRef = useRef(null);
  const scale = zoom * CSS_PX_PER_PT;
  const width = info.size[0] * scale,
    height = info.size[1] * scale;

  useEffect(() => {
    let cancelled = false,
      task = null,
      text = null;
    (async () => {
      const page = await pdfRef.current.getPage(index + 1);
      if (cancelled) return;
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
      const layer = document.createElement("div");
      layer.className = styles.text;
      layer.style.setProperty("--total-scale-factor", String(scale));
      const { TextLayer } = await import("pdfjs-dist");
      text = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: layer,
        viewport: page.getViewport({ scale }),
      });
      await text.render();
      if (cancelled) return;
      boxRef.current?.replaceChildren(canvas, layer);
    })().catch((e) => {
      // A superseded render rejects with a "cancelled" exception, and so does one the page was
      // left in the middle of: both are expected.
      if (!cancelled && e?.name !== "RenderingCancelledException") console.error(e);
    });
    return () => {
      cancelled = true;
      task?.cancel();
      text?.cancel();
    };
  }, [index, scale, width, height, pdfRef]);

  return (
    <div
      className={styles.page}
      data-page={index + 1}
      style={{ width, height, "--aspect": `${info.size[0]} / ${info.size[1]}` }}
    >
      <div ref={boxRef} className={styles.layers} />
      {(info.rotated ? [] : linkBoxes(info.annotations, info.view, scale)).map((b) => (
        <a
          key={b.href + b.left + b.top}
          href={b.href}
          target="_blank"
          rel="noreferrer"
          className={styles.link}
          aria-label={b.href.replace(/^https?:\/\/|^mailto:/, "")}
          style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
        />
      ))}
    </div>
  );
}

/** The resume page: the PDF drawn with pdf.js, with the controls of a basic PDF reader. */
export default function ResumeViewer() {
  const [keysOn] = useKeysPref();
  const stageRef = useRef(null),
    pdfRef = useRef(null),
    downloadRef = useRef(null);
  const [pages, setPages] = useState(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);

  // Load the file. pdf.js is imported here, not at the top: it needs the browser, and only
  // this page pays for it.
  useEffect(() => {
    let cancelled = false,
      loading = null;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      loading = pdfjs.getDocument({ url: site.resumePdf });
      const doc = await loading.promise;
      pdfRef.current = doc;
      const infos = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        // The size on screen (rotation included); the link rectangles are in the page's own
        // unrotated units, so a rotated page gets no link boxes (see resumeLinks.js).
        const { width, height } = page.getViewport({ scale: 1 });
        infos.push({
          size: [width, height],
          rotated: page.rotate % 360 !== 0,
          view: page.view,
          annotations: await page.getAnnotations(),
        });
      }
      if (cancelled) return;
      setZoom(startZoom(stageRef.current.clientWidth - STAGE_GUTTER, infos[0].size[0]));
      setPages(infos);
    })().catch((e) => {
      // Leaving the page destroys the loading task, which rejects what was still waiting on it.
      if (cancelled) return;
      console.warn("the resume failed to load", e);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      loading?.destroy();
      pdfRef.current = null;
    };
  }, []);

  const widthPt = pages ? pages[0].size[0] : 612;
  const fit = () => setZoom(fitZoom(stageRef.current.clientWidth - STAGE_GUTTER, widthPt));
  const act = {
    zoomIn: () => setZoom((z) => stepZoom(z, +1)),
    zoomOut: () => setZoom((z) => stepZoom(z, -1)),
    fit,
    download: () => downloadRef.current?.click(),
    print: () => window.print(),
  };

  // The window listeners are registered once; the effect events always see the latest state.
  const onKey = useEffectEvent((e) => {
    if (e.defaultPrevented) return;
    const action = resumeKey({
      key: e.key,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      alt: e.altKey,
      repeat: e.repeat,
      keysOn,
    });
    if (!action) return;
    e.preventDefault();
    act[action]();
  });
  useEffect(() => {
    const listener = (e) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Which page is in view: the one whose box is nearest the middle of the screen.
  const syncCurrent = useEffectEvent(() => {
    const mid = window.innerHeight / 2;
    let best = 1,
      gap = Infinity;
    for (const el of stageRef.current?.querySelectorAll("[data-page]") ?? []) {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < gap) [best, gap] = [Number(el.dataset.page), d];
    }
    setCurrent(best);
  });
  useEffect(() => {
    const listener = () => syncCurrent();
    window.addEventListener("scroll", listener, { passive: true });
    return () => window.removeEventListener("scroll", listener);
  }, []);
  // Zooming moves the pages without a scroll event: look again once the layout has settled.
  useEffect(() => {
    const id = requestAnimationFrame(() => syncCurrent());
    return () => cancelAnimationFrame(id);
  }, [zoom, pages]);

  return (
    <div className={styles.viewer}>
      <header className={styles.bar}>
        <h1 className={styles.name}>~/resume/danny_hu.pdf</h1>
        <span className={styles.group} role="group" aria-label="zoom">
          <button type="button" onClick={act.zoomOut} aria-label="zoom out">
            <Hint>[-] </Hint>−
          </button>
          <output className={styles.zoom} aria-live="polite">
            {zoomLabel(zoom)}
          </output>
          <button type="button" onClick={act.zoomIn} aria-label="zoom in">
            <Hint>[+] </Hint>+
          </button>
          <button type="button" onClick={act.fit}>
            <Hint>[0] </Hint>fit
          </button>
        </span>
        <span className={styles.dim}>
          page {current}/{pages ? pages.length : 1}
        </span>
        <span className={styles.group}>
          <a ref={downloadRef} href={site.resumePdf} download={DOWNLOAD_NAME}>
            <Hint>[d] </Hint>download
          </a>
          <button type="button" onClick={act.print}>
            <Hint>[p] </Hint>print
          </button>
          <Link href="/">cd ~</Link>
        </span>
      </header>
      <main ref={stageRef} className={styles.stage}>
        {pages ? (
          pages.map((info, i) => (
            <PdfPage key={i} index={i} info={info} zoom={zoom} pdfRef={pdfRef} />
          ))
        ) : failed ? (
          <p className={styles.note}>
            couldn&apos;t draw the resume here.{" "}
            <a href={site.resumePdf} download={DOWNLOAD_NAME}>
              download the pdf
            </a>{" "}
            instead.
          </p>
        ) : (
          <p className={styles.note}>loading resume.pdf…</p>
        )}
      </main>
    </div>
  );
}
