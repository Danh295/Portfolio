// The resume viewer's zoom (components/resume/ResumeViewer.jsx), as pure functions. A zoom of
// 1 is the page at its printed size on screen (96 CSS px per inch).

export const ZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** CSS pixels in one PDF point (1/72 inch) at 96 pixels per inch. */
export const CSS_PX_PER_PT = 96 / 72;
const MIN = ZOOMS[0],
  MAX = ZOOMS[ZOOMS.length - 1];

/** A zoom as the whole percent the toolbar shows. */
const percent = (zoom) => Math.round(zoom * 100);

/** "100%": what the toolbar shows. */
export const zoomLabel = (zoom) => percent(zoom) + "%";

/** The zoom that makes a page `pageWidthPt` points wide exactly `availPx` CSS px wide. */
export function fitZoom(availPx, pageWidthPt) {
  return Math.min(MAX, Math.max(MIN, availPx / (pageWidthPt * CSS_PX_PER_PT)));
}

/** Where the page opens: its printed size, or fitted when the room is narrower (a phone). */
export const startZoom = (availPx, pageWidthPt) => Math.min(1, fitZoom(availPx, pageWidthPt));

/**
 * The next step above (dir > 0) or below the current zoom; unchanged at either end. Compared
 * in whole percents, the way the label reads, so a fit-to-width of 99.96% is "100%" and the
 * next click goes to the next step instead of looking like it did nothing.
 */
export function stepZoom(zoom, dir) {
  const at = percent(zoom);
  const next =
    dir > 0
      ? ZOOMS.find((z) => percent(z) > at)
      : [...ZOOMS].reverse().find((z) => percent(z) < at);
  return next ?? zoom;
}
