"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import Hint from "@/components/Hint";
import { useKeysPref } from "@/lib/useKeysPref";
import { CSS_PX_PER_PT, fitZoom, startZoom, stepZoom, zoomLabel } from "@/lib/resumeView";
import { resumeKey } from "@/lib/resumeKeys";
import { linkBoxes } from "@/lib/resumeLinks";
import styles from "./ResumeViewer.module.css";

const DOWNLOAD_NAME = "Danny_Hu_Resume.pdf";
// The canvas keeps at least this many pixels across, so printing it (the browser prints what
// is on the page) isn't soft at a small zoom; and never more than MAX_PIXELS in all: iOS
// Safari leaves a bigger canvas blank (its limit is 16.7 million).
const MIN_CANVAS_WIDTH = 1700;
const MAX_PIXELS = 12_000_000;
// A zoom step redraws after this pause, so a held + or - draws once at the end; the old
// drawing is stretched to the new size meanwhile.
const REDRAW_DELAY_MS = 100;
// The page's border, in px (the one place it is set: used for the box and for the room).
const PAGE_BORDER = 1;

/** The width a page can use in the stage: its content width less the pages' two borders. */
function roomIn(stage) {
  const css = getComputedStyle(stage);
  return (
    stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 2 * PAGE_BORDER
  );
}

/** One page of the PDF: a box at the zoomed size, links over it, the drawing swapped in. */
function PdfPage({ index, info, zoom }) {
  const boxRef = useRef(null);
  const scale = zoom * CSS_PX_PER_PT;

  // Until the redraw lands, the old text layer is re-scaled with the page, so selecting and
  // finding text still line up with the (stretched) drawing.
  useEffect(() => {
    boxRef.current?.lastElementChild?.style.setProperty("--total-scale-factor", String(scale));
  }, [scale]);

  useEffect(() => {
    const { page } = info;
    const width = info.size[0] * scale,
      height = info.size[1] * scale;
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
    };
    // The first drawing starts at once; a later one waits out a burst of zoom steps.
    const timer = setTimeout(
      () =>
        draw().catch((e) => {
          // A superseded render rejects with a "cancelled" exception, and so does one the
          // page was left in the middle of: both are expected.
          if (!cancelled && e?.name !== "RenderingCancelledException") console.error(e);
        }),
      boxRef.current?.firstChild ? REDRAW_DELAY_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
      text?.cancel();
    };
  }, [info, scale]);

  return (
    <div
      className={styles.page}
      data-page={index + 1}
      style={{
        width: info.size[0] * scale,
        height: info.size[1] * scale,
        borderWidth: PAGE_BORDER,
        "--aspect": `${info.size[0]} / ${info.size[1]}`,
      }}
    >
      <div ref={boxRef} className={styles.layers} />
      {(info.rotated ? [] : linkBoxes(info.annotations, info.view, scale)).map((b) => (
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

/** The resume page: the PDF drawn with pdf.js, with the controls of a basic PDF reader. */
export default function ResumeViewer() {
  const [keysOn] = useKeysPref();
  const stageRef = useRef(null),
    downloadRef = useRef(null);
  const [pages, setPages] = useState(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  // What the zoom follows when the room changes (a turned phone, a resized window, a scrollbar
  // appearing): the opening fit ("start"), a fit asked for ("fit"), or nothing once the
  // visitor has zoomed by hand.
  const [follow, setFollow] = useState("start");
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
      if (cancelled) return;
      const infos = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        // The size on screen (rotation included); the link rectangles are in the page's own
        // unrotated units, so a rotated page gets no link boxes (see resumeLinks.js).
        const { width, height } = page.getViewport({ scale: 1 });
        infos.push({
          page,
          size: [width, height],
          rotated: page.rotate % 360 !== 0,
          view: page.view,
          annotations: await page.getAnnotations(),
        });
      }
      if (cancelled) return;
      setZoom(startZoom(roomIn(stageRef.current), infos[0].size[0]));
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
    };
  }, []);

  const widthPt = pages ? pages[0].size[0] : 612;
  const fit = () => {
    setFollow("fit");
    setZoom(fitZoom(roomIn(stageRef.current), widthPt));
  };
  const act = {
    zoomIn: () => {
      setFollow(null);
      setZoom((z) => stepZoom(z, +1));
    },
    zoomOut: () => {
      setFollow(null);
      setZoom((z) => stepZoom(z, -1));
    },
    fit,
    download: () => downloadRef.current?.click(),
    print: () => window.print(),
  };

  // Keep a followed fit in step with the room: this also catches the document's scrollbar
  // appearing once the pages are in, which narrows the stage after the first measurement.
  const refit = useEffectEvent(() => {
    // The observer can fire once more as the page is left, when the stage is already gone.
    const stage = stageRef.current;
    if (!follow || !pages || !stage) return;
    const room = roomIn(stage);
    setZoom(follow === "fit" ? fitZoom(room, widthPt) : startZoom(room, widthPt));
  });
  useEffect(() => {
    if (!pages) return;
    const watch = new ResizeObserver(() => refit());
    watch.observe(stageRef.current);
    return () => watch.disconnect();
  }, [pages]);

  // Keyboard mode, as the app has it: any key pauses the hover look, a real mouse move or a
  // press brings it back (every :hover rule here is written html:not(.kbd), like the app's).
  useEffect(() => {
    const root = document.documentElement;
    const keyed = () => root.classList.add("kbd");
    const moved = (e) => {
      if (e.movementX || e.movementY) root.classList.remove("kbd");
    };
    const pressed = () => root.classList.remove("kbd");
    window.addEventListener("keydown", keyed, true);
    window.addEventListener("pointermove", moved);
    window.addEventListener("pointerdown", pressed);
    return () => {
      window.removeEventListener("keydown", keyed, true);
      window.removeEventListener("pointermove", moved);
      window.removeEventListener("pointerdown", pressed);
      root.classList.remove("kbd");
    };
  }, []);

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
          pages.map((info, i) => <PdfPage key={i} index={i} info={info} zoom={zoom} />)
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
