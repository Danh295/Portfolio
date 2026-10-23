// The resume viewer's touch and trackpad zoom, as pure functions (components/resume/).
import { MAX_ZOOM, MIN_ZOOM, percent } from "./resumeView";

const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * The zoom after two fingers moved from `startDistance` apart to `distance` apart, within the
 * zoom range. Fingers that started on the same spot (distance 0) leave the zoom alone.
 */
export function pinchZoom(startZoom, startDistance, distance) {
  if (!(startDistance > 0)) return startZoom;
  return clampZoom(startZoom * (distance / startDistance));
}

/**
 * How far to scroll (right and down are positive) so the point that was under `focal` stays
 * under it after the zoom went from `zoomFrom` to `zoomTo`. All positions are screen px:
 * `pageBefore` and `pageAfter` are the page's top-left corner before and after the change (it
 * moves when a centred page starts to overflow, or the scroll position differs).
 */
export function anchorDelta({ zoomFrom, zoomTo, focal, pageBefore, pageAfter }) {
  const k = zoomTo / zoomFrom;
  return {
    dx: pageAfter.left + (focal.x - pageBefore.left) * k - focal.x,
    dy: pageAfter.top + (focal.y - pageBefore.top) * k - focal.y,
  };
}

/**
 * Double-tap: from the page fitted to the width go to 100%, from anywhere else go to fit
 * (compared in whole percents, the way the label reads). If fit already is 100%, go to 200%
 * instead, so the tap always shows something. `atFit` says the result is the fit.
 */
export function doubleTap(zoom, fit) {
  if (percent(zoom) !== percent(fit)) return { zoom: fit, atFit: true };
  return { zoom: percent(fit) === 100 ? 2 : 1, atFit: false };
}

// Per event: a trackpad pinch sends many small deltas, a mouse wheel notch one of about 100,
// so an event's effect is capped at ±50 (a notch is about ±28%).
const WHEEL_CAP = 50,
  WHEEL_RATE = 0.005;

/** The zoom after a Ctrl+wheel (or trackpad pinch) event: wheel up (negative) zooms in. */
export function wheelZoom(zoom, deltaY) {
  const d = Math.min(WHEEL_CAP, Math.max(-WHEEL_CAP, -deltaY));
  return clampZoom(zoom * Math.exp(d * WHEEL_RATE));
}
