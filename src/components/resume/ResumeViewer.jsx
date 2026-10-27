"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { site } from "@/config/site";
import Hint, { KeyLabel } from "@/components/Hint";
import { useKeysPref } from "@/lib/useKeysPref";
import { PRESSABLE, pressFx } from "@/lib/pressFx";
import { isTouch } from "@/lib/egg/screen";
import { FOLLOW, fitZoom, stepZoom, zoomFor, zoomLabel } from "@/lib/resumeView";
import { ACTION, resumeKey } from "@/lib/resumeKeys";
import { anchorDelta } from "@/lib/resumePinch";
import { printMode } from "@/lib/resumePrint";
import PdfPage, { PAGE_BORDER } from "./PdfPage";
import { useZoomGestures } from "./useZoomGestures";
import styles from "./ResumeViewer.module.css";

const DOWNLOAD_NAME = "Danny_Hu_Resume.pdf";

/** The width a page can use in the stage: its content width less the pages' two borders. */
function roomIn(stage) {
  const css = getComputedStyle(stage);
  return (
    stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 2 * PAGE_BORDER
  );
}

const openPdfInTab = () => window.open(site.resumePdf, "_blank", "noopener");

/**
 * Print the PDF file itself, so the text stays real (Save as PDF keeps it selectable, with its
 * links): through a hidden frame where that is reliable, otherwise by opening the file so the
 * browser's own viewer prints it (see resumePrint.js).
 */
function printPdf() {
  const mode = printMode({
    userAgent: navigator.userAgent,
    touch: isTouch(),
    pdfViewerEnabled: navigator.pdfViewerEnabled,
  });
  if (mode === "tab") return openPdfInTab();
  const frame = document.createElement("iframe");
  const remove = () => frame.remove();
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  frame.onload = () => {
    try {
      frame.contentWindow.addEventListener("afterprint", remove);
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      remove();
      openPdfInTab();
    }
  };
  frame.src = site.resumePdf;
  document.body.append(frame);
  setTimeout(remove, 120_000); // however the print went, don't keep the frame forever
}

/** A link that offers the PDF file under its clean name. */
function DownloadLink({ children, ...rest }) {
  return (
    <a href={site.resumePdf} download={DOWNLOAD_NAME} {...rest}>
      {children}
    </a>
  );
}

const topLeft = (el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top };
};

/** The resume page: the PDF drawn with pdf.js, with the controls of a basic PDF reader. */
export default function ResumeViewer() {
  const [keysOn] = useKeysPref();
  const router = useRouter();
  const stageRef = useRef(null),
    downloadRef = useRef(null),
    zoomRef = useRef(1), // the zoom on screen
    targetRef = useRef(1), // the zoom asked for: events before the screen catches up build on it
    anchorRef = useRef(null); // where a zoom is pinned, until the layout it causes lands
  const [pageInfos, setPageInfos] = useState(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  // What the zoom follows when the room changes (a turned phone, a resized window, a scrollbar
  // appearing): the opening fit, a fit asked for, or nothing once the visitor zoomed by hand.
  const [follow, setFollow] = useState(FOLLOW.START);

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
      setZoomFree(zoomFor(FOLLOW.START, roomIn(stageRef.current), infos[0].size[0]));
      setPageInfos(infos);
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

  const widthPt = pageInfos ? pageInfos[0].size[0] : 612;
  const fitToWidth = () => fitZoom(roomIn(stageRef.current), widthPt);

  // A zoom with no point to keep: any pin a gesture left waiting must not be applied to it.
  function setZoomFree(next) {
    anchorRef.current = null;
    targetRef.current = next;
    setZoom(next);
  }

  // A zoom that must keep a point of the page under `focal` (screen px): the point under it now,
  // or the one `pin` names ({ zoom, offset } from the page's corner, as when a pinch began). The
  // page is pinned here, and the scroll that puts it back is applied once the new layout lands.
  const zoomAt = (zoomTo, focal, atFit, pin) => {
    const page = stageRef.current?.querySelector("[data-page]");
    // An event that changes nothing (a wheel at the limit, deltaY 0) must not end a followed fit.
    if (!page || zoomTo === targetRef.current) return;
    setFollow(atFit ? FOLLOW.FIT : FOLLOW.NONE);
    const corner = topLeft(page);
    const from = pin ?? {
      zoom: zoomRef.current,
      offset: { x: focal.x - corner.left, y: focal.y - corner.top },
    };
    anchorRef.current = {
      zoomFrom: from.zoom,
      focal,
      // Where the page's corner would be if that point were under `focal` at `from.zoom`.
      pageBefore: { left: focal.x - from.offset.x, top: focal.y - from.offset.y },
    };
    targetRef.current = zoomTo;
    setZoom(zoomTo);
  };
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    targetRef.current = zoom;
    const anchor = anchorRef.current;
    anchorRef.current = null;
    const stage = stageRef.current;
    const page = stage?.querySelector("[data-page]");
    if (!anchor || !page) return;
    const { dx, dy } = anchorDelta({
      zoomFrom: anchor.zoomFrom,
      zoomTo: zoom,
      focal: anchor.focal,
      pageBefore: anchor.pageBefore,
      pageAfter: topLeft(page),
    });
    stage.scrollLeft += dx;
    window.scrollBy(0, dy);
  }, [zoom]);

  const stageHandlers = useZoomGestures(stageRef, () => targetRef.current, fitToWidth, zoomAt);

  // Leave: a tab the app opened kept its opener (App.jsx openTab), so closing it lands back on
  // the app's own tab. Where the browser won't close it, or the visitor came straight here and
  // has no such tab, go home in place.
  const leave = () => {
    if (window.opener) {
      window.close();
      setTimeout(() => router.push("/"), 250);
    } else router.push("/");
  };

  const actions = {
    [ACTION.ZOOM_IN]: () => {
      setFollow(FOLLOW.NONE);
      setZoomFree(stepZoom(targetRef.current, +1));
    },
    [ACTION.ZOOM_OUT]: () => {
      setFollow(FOLLOW.NONE);
      setZoomFree(stepZoom(targetRef.current, -1));
    },
    [ACTION.FIT]: () => {
      setFollow(FOLLOW.FIT);
      setZoomFree(fitToWidth());
    },
    [ACTION.DOWNLOAD]: () => downloadRef.current?.click(),
    [ACTION.PRINT]: printPdf,
    [ACTION.LEAVE]: leave,
  };

  // Keep a followed fit in step with the room: this also catches the document's scrollbar
  // appearing once the pages are in, which narrows the stage after the first measurement.
  const refit = useEffectEvent(() => {
    // The observer can fire once more as the page is left, when the stage is already gone.
    const stage = stageRef.current;
    if (!pageInfos || !stage) return;
    const next = zoomFor(follow, roomIn(stage), widthPt);
    if (next !== null) setZoomFree(next);
  });
  useEffect(() => {
    if (!pageInfos) return;
    const watch = new ResizeObserver(() => refit());
    watch.observe(stageRef.current);
    return () => watch.disconnect();
  }, [pageInfos]);

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
    // A key flashes its button, as the app's shortcuts do (a mouse click doesn't).
    pressFx(document.querySelector(`[data-action="${action}"]`));
    actions[action]();
  });
  useEffect(() => {
    const listener = (e) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div className={styles.viewer}>
      {/* A touch flashes the control it lands on, like a key does (a mouse click doesn't). */}
      <header
        className={styles.bar}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") pressFx(e.target.closest?.(PRESSABLE));
        }}
      >
        {/* A tab the app opened closes itself (leave above); otherwise this is a plain link home. */}
        <Link
          href="/"
          className={styles.leave}
          data-action={ACTION.LEAVE}
          onClick={(e) => {
            if (!window.opener) return;
            e.preventDefault();
            leave();
          }}
        >
          <KeyLabel className={styles.hint}>[esc] </KeyLabel>cd ~
        </Link>
        <h1 className={styles.name}>~/resume/danny_hu.pdf</h1>
        <div className={styles.tools}>
          <span className={styles.zoomGroup} role="group" aria-label="zoom">
            <button
              type="button"
              data-action={ACTION.ZOOM_OUT}
              onClick={actions[ACTION.ZOOM_OUT]}
              aria-label="zoom out"
            >
              [-]
            </button>
            <output className={styles.zoom} aria-live="polite">
              {zoomLabel(zoom)}
            </output>
            <button
              type="button"
              data-action={ACTION.ZOOM_IN}
              onClick={actions[ACTION.ZOOM_IN]}
              aria-label="zoom in"
            >
              [+]
            </button>
            <button type="button" data-action={ACTION.FIT} onClick={actions[ACTION.FIT]}>
              <Hint>[0] </Hint>fit
            </button>
          </span>
          <span className={styles.actions}>
            <DownloadLink ref={downloadRef} className={styles.btn} data-action={ACTION.DOWNLOAD}>
              <Hint className={styles.hint}>[d] </Hint>download
            </DownloadLink>
            <button
              type="button"
              className={styles.btn}
              data-action={ACTION.PRINT}
              onClick={actions[ACTION.PRINT]}
            >
              <Hint className={styles.hint}>[p] </Hint>print
            </button>
          </span>
        </div>
      </header>
      <main ref={stageRef} className={styles.stage} {...stageHandlers}>
        {pageInfos ? (
          pageInfos.map((pageInfo, i) => (
            <PdfPage key={i} index={i} pageInfo={pageInfo} zoom={zoom} />
          ))
        ) : failed ? (
          <p className={styles.note}>
            couldn&apos;t draw the resume here. <DownloadLink>download the pdf</DownloadLink>{" "}
            instead.
          </p>
        ) : (
          <p className={styles.note}>loading resume.pdf…</p>
        )}
      </main>
    </div>
  );
}
