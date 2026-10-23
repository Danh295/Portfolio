// The resume viewer's zoom (components/resume/ResumeViewer.jsx), as pure functions. A zoom of
// 1 is the page at its printed size on screen (96 CSS px per inch).

export const ZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** CSS pixels in one PDF point (1/72 inch) at 96 pixels per inch. */
export const CSS_PX_PER_PT = 96 / 72;
/** The smallest and largest zoom: the ends of the steps, and of a pinch. */
export const MIN_ZOOM = ZOOMS[0],
  MAX_ZOOM = ZOOMS[ZOOMS.length - 1];

/** A zoom as the whole percent the toolbar shows. */
export const percent = (zoom) => Math.round(zoom * 100);

/** "100%": what the toolbar shows. */
export const zoomLabel = (zoom) => percent(zoom) + "%";

/** The zoom that makes a page `pageWidthPt` points wide exactly `availPx` CSS px wide. */
export function fitZoom(availPx, pageWidthPt) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, availPx / (pageWidthPt * CSS_PX_PER_PT)));
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

/** What the zoom follows when the room changes (see zoomFor). */
export const FOLLOW = { START: "start", FIT: "fit", NONE: null };

/**
 * The zoom a followed mode wants for a room `room` px wide, or null when nothing is followed
 * (the visitor zoomed by hand): the opening fit never goes past printed size; a fit asked for
 * fills the room.
 */
export function zoomFor(follow, room, widthPt) {
  if (follow === FOLLOW.FIT) return fitZoom(room, widthPt);
  if (follow === FOLLOW.START) return startZoom(room, widthPt);
  return null;
}
