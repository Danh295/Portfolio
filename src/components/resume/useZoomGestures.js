import { useEffect, useEffectEvent, useRef } from "react";
import { doubleTap, pinchZoom, wheelZoom } from "@/lib/resumePinch";

// A tap is a short press that hardly moved; two taps close together in time and place are a
// double-tap.
const TAP_MS = 250,
  TAP_SLOP = 12,
  DOUBLE_TAP_MS = 300,
  DOUBLE_TAP_SLOP = 40;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The resume stage's own zoom gestures: a two-finger pinch, a double-tap, and (over a mouse or
 * trackpad) Ctrl+wheel and Safari's trackpad pinch. They replace the browser's page zoom over the
 * stage, which the stage turns off with `touch-action: pan-x pan-y`; one finger still scrolls.
 *
 * `getZoom()` is the zoom asked for (events that arrive before the screen catches up build on it), `getFit()` the zoom that fits the width, and
 * `zoomAt(zoomTo, focal, atFit, pin)` applies a zoom keeping a point of the page under `focal`
 * (screen px): by default the point that is under it now; for a pinch, `pin` names the point
 * that was under the fingers when they landed ({ zoom, offset } from the page's corner), so the
 * early frames, when the page is still too short to scroll, are made up for later.
 * Returns the pointer handlers for the stage element.
 */
export function useZoomGestures(stageRef, getZoom, getFit, zoomAt) {
  const touches = useRef(new Map()); // pointerId → { x, y, x0, y0, t0, pinched }
  const pinch = useRef(null); // { zoom0, dist0, pin } while two fingers are down
  const lastTap = useRef(null); // { t, x, y }
  const frame = useRef({ id: 0, next: null });

  // A pinch can move faster than the screen draws: apply the latest position once per frame.
  const queue = (zoomTo, focal, pin) => {
    const f = frame.current;
    f.next = { zoomTo, focal, pin };
    if (f.id) return;
    f.id = requestAnimationFrame(() => {
      f.id = 0;
      const n = f.next;
      f.next = null;
      if (n) zoomAt(n.zoomTo, n.focal, false, n.pin);
    });
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== "touch") return;
    const here = touches.current;
    here.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      t0: e.timeStamp,
      pinched: false,
    });
    if (here.size === 2) {
      const [a, b] = [...here.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const corner = stageRef.current?.querySelector("[data-page]")?.getBoundingClientRect();
      pinch.current = {
        zoom0: getZoom(),
        dist0: distance(a, b),
        pin: corner && {
          zoom: getZoom(),
          offset: { x: mid.x - corner.left, y: mid.y - corner.top },
        },
      };
      lastTap.current = null;
      for (const id of here.keys()) {
        here.get(id).pinched = true;
        // Keep hearing both fingers if they leave the stage. Only a pinch captures: a capture
        // would also redirect the click, and a single tap must reach the link under it.
        e.currentTarget.setPointerCapture?.(id);
      }
    }
  };

  const onPointerMove = (e) => {
    const p = touches.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!pinch.current || touches.current.size < 2) return;
    const [a, b] = [...touches.current.values()];
    queue(
      pinchZoom(pinch.current.zoom0, pinch.current.dist0, distance(a, b)),
      { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      pinch.current.pin,
    );
  };

  const onPointerEnd = (e) => {
    const p = touches.current.get(e.pointerId);
    if (!p) return;
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    // Only a quick, still, single-finger press that wasn't part of a pinch can be a tap, and a
    // tap on a link is the link's (it opens on its own).
    const quick = e.timeStamp - p.t0 < TAP_MS && distance(p, { x: p.x0, y: p.y0 }) < TAP_SLOP;
    if (e.type !== "pointerup" || p.pinched || !quick || e.target.closest?.("a")) return;
    const at = { t: e.timeStamp, x: e.clientX, y: e.clientY };
    const prev = lastTap.current;
    if (prev && at.t - prev.t < DOUBLE_TAP_MS && distance(at, prev) < DOUBLE_TAP_SLOP) {
      lastTap.current = null;
      const next = doubleTap(getZoom(), getFit());
      zoomAt(next.zoom, { x: at.x, y: at.y }, next.atFit);
    } else {
      lastTap.current = at;
    }
  };

  // Ctrl+wheel (what Chrome and Firefox send for a trackpad pinch) and Safari's own gesture
  // events zoom the PDF instead of the whole browser page. These are native listeners: React's
  // wheel handler is passive, and a passive one can't stop the browser's zoom.
  const onWheel = useEffectEvent((e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomAt(wheelZoom(getZoom(), e.deltaY, e.deltaMode), { x: e.clientX, y: e.clientY }, false);
  });
  const gesture = useRef(null); // the zoom a Safari trackpad pinch started from
  const onGesture = useEffectEvent((e) => {
    if (e.type === "gestureend") {
      gesture.current = null;
      return;
    }
    // A pinch of fingers on a touch screen is ours already, through the pointer events.
    if (touches.current.size >= 2) return;
    e.preventDefault();
    if (e.type === "gesturestart") gesture.current = getZoom();
    else if (gesture.current !== null)
      zoomAt(pinchZoom(gesture.current, 1, e.scale), { x: e.clientX, y: e.clientY }, false);
  });
  // Leaving the page: no frame may fire into it.
  useEffect(() => {
    const f = frame.current;
    return () => cancelAnimationFrame(f.id);
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wheel = (e) => onWheel(e),
      gest = (e) => onGesture(e);
    stage.addEventListener("wheel", wheel, { passive: false });
    for (const t of ["gesturestart", "gesturechange", "gestureend"])
      stage.addEventListener(t, gest);
    return () => {
      stage.removeEventListener("wheel", wheel);
      for (const t of ["gesturestart", "gesturechange", "gestureend"])
        stage.removeEventListener(t, gest);
    };
  }, [stageRef]);

  return { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
}
