// Heading text effects. Imperative: they write el.textContent frame by frame and
// return a cancel function. Unrevealed characters are non-breaking spaces so the
// heading never rewraps mid-animation.

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789/\\|-_=+*#%<>";
const SHADE = " ░▒▓█";

/** Scramble → settle, left-biased. */
function decode(el, orig, onDone) {
  const len = orig.length,
    dur = Math.min(2200, 760 + len * 60),
    t0 = performance.now(),
    settle = [];
  for (let i = 0; i < len; i++) settle.push((i / len) * dur * 0.7 + Math.random() * dur * 0.3);
  let last = -99,
    raf = 0;
  const step = (now) => {
    const e = now - t0;
    if (e - last >= 40 || e >= dur) {
      last = e;
      let s = "";
      for (let i = 0; i < len; i++)
        s +=
          e >= settle[i] || orig[i] === " " ? orig[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = s;
    }
    if (e < dur) raf = requestAnimationFrame(step);
    else {
      el.textContent = orig;
      onDone();
    }
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * "type": 68ms per character with a █ cursor in the next slot. It stops as soon as the
 * text is typed and keeps the same character count throughout, so the element never
 * changes width. The persistent blinking cursor is CSS (the `caret` classes).
 * "shade": each char steps ░▒▓█, 44ms stagger.
 */
function typeOrShade(el, orig, mode, onDone) {
  const len = orig.length,
    sp = 1.7,
    dur = (mode === "type" ? 40 * len : 26 * len + 420) * sp,
    t0 = performance.now();
  let raf = 0;
  const step = (now) => {
    const e = now - t0;
    let s = "";
    if (mode === "type") {
      const n = Math.min(len, Math.floor(e / (40 * sp)));
      s = n < len ? orig.slice(0, n) + "█" + "\u00a0".repeat(len - n - 1) : orig;
    } else
      for (let i = 0; i < len; i++) {
        const p = (e - i * 26 * sp) / (280 * sp);
        s +=
          orig[i] === " "
            ? " "
            : p >= 1
              ? orig[i]
              : p <= 0
                ? " "
                : SHADE[Math.min(4, 1 + ((p * 4) | 0))];
      }
    el.textContent = s;
    if (e < dur) raf = requestAnimationFrame(step);
    else {
      el.textContent = orig;
      onDone();
    }
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** Animate `el` to show `text` using effect `mode` (decode | type | shade | none). */
export function runTextFx(el, text, mode, onFinish) {
  if (mode === "none") {
    el.textContent = text;
    if (onFinish) onFinish();
    return () => {};
  }
  // data-typing lets CSS hide the persistent caret while the effect draws its own.
  el.dataset.typing = "";
  const done = () => delete el.dataset.typing;
  // onFinish only fires when the effect plays to the end (not when it's cancelled).
  const finished = () => {
    done();
    if (onFinish) onFinish();
  };
  const cancel =
    mode === "type" || mode === "shade"
      ? typeOrShade(el, text, mode, finished)
      : decode(el, text, finished);
  return () => {
    cancel();
    done();
  };
}
