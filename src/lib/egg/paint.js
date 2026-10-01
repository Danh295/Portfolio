// Write a potArt() frame into the DOM: the monochrome base into `el`, and each colour
// layer (flame, confetti) into its own <pre> stacked over the base. Shared by the
// minigame and the 404 page. Touches the DOM, so it stays out of src/lib/ascii.
import { EGG_FONT_PX } from "./grid";

/**
 * Colour layers are extra <pre>s pooled per colour on the `fx` container (pass null
 * for a frame with no colour layers). Only writes text that actually changed.
 */
export function paint(el, fx, art) {
  if (el.textContent !== art.base) el.textContent = art.base;
  if (!fx) return;
  const pool = fx.__pool || (fx.__pool = {});
  for (const c in pool) if (!art.layers[c] && pool[c].textContent) pool[c].textContent = "";
  for (const c in art.layers) {
    let p = pool[c];
    if (!p || !p.isConnected) {
      p = pool[c] = document.createElement("pre");
      p.setAttribute("aria-hidden", "true");
      p.style.cssText =
        `position:absolute;inset:0;margin:0;font-family:var(--mono);font-size:${EGG_FONT_PX}px;line-height:${EGG_FONT_PX}px;letter-spacing:0;text-transform:none;color:` +
        c;
      fx.appendChild(p);
    }
    if (p.textContent !== art.layers[c]) p.textContent = art.layers[c];
  }
}
