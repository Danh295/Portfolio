"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { potArt, spawnConfetti, stepConfetti, cl, ease } from "@/lib/ascii/egg";
import {
  clockConfig,
  fillTimes,
  boilClockText,
  gradeEgg,
  isNewBest,
  statsView,
} from "@/lib/egg/game";
import { countEgg, readBest, writeBest } from "@/lib/egg/counter";
import { eggStages, eggTypes, eggRules } from "@/data/egg";

import { EGG_ROWS, EGG_FONT_PX, EGG_GRID_SCALE, colsFor } from "@/lib/egg/grid";

const FRAME_H = EGG_ROWS;

const freshScene = () => ({
  boil: 0,
  flame: 0,
  swap: 0,
  drip: 0,
  hover: 1,
  conf: [],
  cook: 0,
  cookT0: 0,
  yolk: "jammy",
  dripMax: 0.85,
  W: 100,
  H: FRAME_H,
  serve: 0,
  A: 0.62,
  B: -0.5,
  vA: 0,
  vB: 0,
  px: 0,
  py: 0,
  mx: 0,
  my: 0,
  drag: null,
  moved: 0,
  shake: 0,
  t0: 0,
  cooking: false,
  fin: false,
  done: false,
  tx: "",
  countT0: 0, // when the boil was reached ("ready?")
  announce: "", // "ready?" / "start!" overlay text
});

// Heating: a gentle simmer, then a visibly different rolling boil (boil > 1 speeds up and
// thickens the bubbles), held briefly; then "ready?", then "start!" held for a beat, and
// only then do the eggs drop and the clock start.
const SIMMER_MS = 1600,
  SIMMER_BOIL = 0.28,
  ROLL_MS = 700,
  ROLL_HOLD_MS = 500,
  ROLL_BOIL = 1.5,
  READY_MS = 900,
  START_HOLD_MS = 600;

// Colour layers (flame, confetti) are extra <pre>s stacked over the base frame,
// pooled per colour on the FX container.
function paint(el, fx, art) {
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

/**
 * The egg minigame. One scene, drawn every animation frame into whichever target is
 * live: the terminal's inline egg (in terminal mode) or the hero egg. Everything
 * that changes per frame stays in refs; React state only holds the stage, result
 * and visitor stats.
 */
export function useEggGame({ reduce, clockMode, mode }) {
  const [stage, setStageState] = useState(0);
  const [result, setResultState] = useState(null);
  const [stats, setStatsState] = useState(null);
  // Rules card before the first round of a visit (hero only; the terminal prints them).
  const [briefing, setBriefingState] = useState(false);
  const briefed = useRef(false);
  // Once seen, the rules collapse to a small "[i] rules" chip the hero can reopen.
  const [rulesSeen, setRulesSeen] = useState(false);

  const scene = useRef(null);
  const live = useRef({
    stage: 0,
    result: null,
    stats: null,
    briefing: false,
    reduce,
    mode,
    clockMode,
  });
  const guiPre = useRef(null),
    guiFx = useRef(null),
    guiClock = useRef(null),
    guiBox = useRef(null),
    guiAnnounce = useRef(null);
  const termPre = useRef(null),
    termFx = useRef(null),
    termStatus = useRef(null),
    termBox = useRef(null);
  // Restarts the frame loop when it has gone idle (set by the loop's effect).
  const wake = useRef(() => {});

  useEffect(() => {
    Object.assign(live.current, { reduce, mode, clockMode });
    wake.current();
  }, [reduce, mode, clockMode]);

  const getScene = () => scene.current || (scene.current = freshScene());

  const setStage = useCallback((s) => {
    live.current.stage = s;
    setStageState(s);
    wake.current();
  }, []);
  const setResult = useCallback((r) => {
    live.current.result = r;
    setResultState(r);
  }, []);
  const setBriefing = useCallback((b) => {
    live.current.briefing = b;
    setBriefingState(b);
  }, []);
  const setStats = useCallback((s) => {
    live.current.stats = s;
    setStatsState(s);
  }, []);

  const setTimer = useCallback((tx) => {
    const t = getScene();
    t.tx = tx;
    // Compared against the DOM, not the last value, so a remounted clock catches up.
    if (guiClock.current && guiClock.current.textContent !== tx) guiClock.current.textContent = tx;
  }, []);

  // Back to stage 0 with a cold pot, from any stage (play again, or ctrl-c in the terminal).
  const reset = useCallback(() => {
    Object.assign(getScene(), {
      serve: 0,
      swap: 0,
      boil: 0,
      flame: 0,
      drip: 0,
      hover: 1,
      conf: [],
      cooking: false,
      fin: false,
      done: false,
      countT0: 0,
      announce: "",
    });
    setBriefing(false);
    setTimer("");
    setResult(null);
    setStage(0);
  }, [setStage, setResult, setTimer, setBriefing]);

  const crack = useCallback(() => {
    const s = live.current.stage,
      t = getScene(),
      now = performance.now();
    if (s === 1 || s === 3 || s === 4) return;
    t.shake = 0.6;
    t.t0 = now;
    if (s === 0) {
      if (!live.current.briefing && !briefed.current && live.current.mode !== "term") {
        briefed.current = true;
        setRulesSeen(true);
        setBriefing(true);
        return;
      }
      setBriefing(false);
      setTimer("");
      setStage(1);
    } else if (s === 2) {
      const C = clockConfig(live.current.clockMode);
      // Never past the auto-pull (a hidden tab pauses the loop), and graded on the same
      // value the result shows: whole minutes, or seconds to 2 decimals.
      t.cook = Math.min(C.max, (now - t.cookT0) / 1000);
      t.cook = C.m ? Math.round(t.cook) : Math.round(t.cook * 100) / 100;
      setTimer(C.fmt(C.ice));
      setStage(3);
    } else if (s === 5) reset();
  }, [reset, setStage, setTimer, setBriefing]);

  const finish = useCallback(() => {
    const L = live.current,
      C = clockConfig(L.clockMode),
      t = getScene(),
      c = t.cook;
    const g = gradeEgg(c, C);
    t.yolk = g.yolk;
    t.dripMax = g.dripMax;
    let best = readBest(C);
    if (isNewBest(c, best, C)) {
      best = c;
      writeBest(C, c);
    }
    if (g.word === "perfect" && !L.reduce)
      t.conf.push(...spawnConfetti(t.W, t.H, 140, EGG_GRID_SCALE));
    setTimer("");
    setStats(null);
    setResult({ label: C.fmt(c) + " · " + g.word, hint: g.off + " · best " + C.fmt(best) });
    setStage(5);
    countEgg(g.type, eggTypes).then(setStats);
  }, [setStage, setResult, setStats, setTimer]);

  // Terminal-mode status block under the inline egg.
  const statusText = () => {
    const L = live.current,
      C = clockConfig(L.clockMode),
      ES = eggStages[L.stage] || eggStages[0],
      rs = L.result || { label: "", hint: "" };
    const lines = [
      "┤ " +
        fillTimes(ES.title === "{r}" ? rs.label : ES.title, C) +
        " ├  " +
        fillTimes(ES.sub === "{b}" ? rs.hint : ES.sub, C),
    ];
    if (getScene().announce) lines.push("   " + getScene().announce);
    else if (L.stage >= 1 && L.stage <= 3) lines.push("   " + getScene().tx);
    if (L.stats && L.stage === 5) {
      const sv = statsView(L.stats, eggTypes);
      lines.push("", sv.head);
      sv.rows.forEach((r) => lines.push(r.name.padEnd(14) + r.bar + "  " + r.n));
    }
    lines.push(
      "",
      L.stage === 5
        ? "[enter] or click to play again · [ctrl-c] quit"
        : L.stage === 0
          ? "[enter] or click the pot to start · [ctrl-c] quit"
          : L.stage === 2
            ? "[enter] or click to pull the eggs · [ctrl-c] quit"
            : "… · [ctrl-c] quit",
    );
    return lines.join("\n");
  };

  // The frame loop. Physics every frame, paint every other frame. At rest (stage 0 or 5)
  // it idles while there's nothing to show: the pot is off screen or the tab hidden, or
  // reduced motion has frozen it and the last frame is painted. Any scroll, resize, key,
  // pointer, stage or mode change wakes it.
  useEffect(() => {
    let raf = 0,
      last = 0,
      odd = false,
      awake = 0;
    const run = () => {
      // Stay up briefly after any wake, so a layout React commits a moment later (e.g.
      // after popstate) is seen before the loop decides to idle.
      awake = performance.now() + 300;
      if (raf) return;
      last = 0; // no catch-up lurch after a pause
      raf = requestAnimationFrame(frame);
    };
    wake.current = run;
    const frame = () => {
      odd = !odd;
      const t = getScene(),
        L = live.current,
        R = L.reduce;
      const inTerm = L.mode === "term" && termPre.current && termPre.current.isConnected;
      const el = inTerm ? termPre.current : guiPre.current,
        box = inTerm ? termBox.current : guiBox.current,
        fxBox = inTerm ? termFx.current : guiFx.current;
      const H = FRAME_H,
        st = L.stage,
        now = performance.now();
      // Time-based steps: k = frames' worth of time at 60fps since the last frame, so
      // the animation runs at the same speed on 30/60/120/144Hz displays. Capped so a
      // long pause (hidden tab) doesn't lurch; the clocks below use timestamps anyway.
      const k = last ? Math.min(4, (now - last) / (1000 / 60)) : 1,
        ease1 = (rate) => 1 - Math.pow(1 - rate, k); // per-frame lerp rate → this frame's
      last = now;
      // While a round is on (stages 1–4) the game always runs (its clocks, the 15s
      // auto-pull), on screen or not; only the raster below is skipped off screen.
      if (!R && !t.drag) t.B += 0.004 * k;
      t.A += t.vA * k;
      t.B += t.vB * k;
      t.vA *= Math.pow(0.93, k);
      t.vB *= Math.pow(0.93, k);
      t.A = Math.max(0.15, Math.min(1.2, t.A));
      // gentle cursor parallax, eased
      t.px += ((R ? 0 : t.mx) - t.px) * ease1(0.06);
      t.py += ((R ? 0 : t.my) - t.py) * ease1(0.06);
      const el2 = (now - t.t0) / 1000,
        C = clockConfig(L.clockMode);
      t.flame += ((st === 1 || st === 2 ? 1 : 0) - t.flame) * (R ? 1 : ease1(0.08));
      if (st === 1) {
        const e = now - t.t0;
        t.boil = R
          ? ROLL_BOIL
          : e < SIMMER_MS
            ? SIMMER_BOIL * ease(cl(e / SIMMER_MS))
            : SIMMER_BOIL + (ROLL_BOIL - SIMMER_BOIL) * ease(cl((e - SIMMER_MS) / ROLL_MS));
        if (e >= SIMMER_MS + ROLL_MS + ROLL_HOLD_MS && !t.cooking) {
          if (!t.countT0) t.countT0 = now;
          if (now - t.countT0 >= READY_MS + START_HOLD_MS) {
            t.cooking = true;
            t.cookT0 = now;
            setStage(2);
          }
        }
      } else if (st === 2) {
        t.boil = ROLL_BOIL;
        const c = (now - t.cookT0) / 1000;
        setTimer(boilClockText(c, C));
        if (c >= C.max) crack();
      } else t.boil += (0 - t.boil) * (R ? 1 : ease1(0.04));
      if (st !== 1) t.cooking = false;
      if (st === 0) t.countT0 = 0;
      // Centre overlay, one style for every phase: simmering… → rolling boil! → ready?
      // → start!. (The header clock line only ever shows numbers.)
      const announce =
        st !== 1
          ? ""
          : t.countT0
            ? now - t.countT0 < READY_MS
              ? "ready?"
              : "start!"
            : now - t.t0 < SIMMER_MS
              ? "simmering…"
              : "rolling boil!";
      const a = guiAnnounce.current;
      if (announce !== t.announce || (a && a.textContent !== announce)) {
        t.announce = announce;
        if (a) {
          a.textContent = announce;
          a.dataset.show = String(!!announce);
        }
      }
      t.hover = st <= 1 ? 1 : Math.max(0, t.hover - (R ? 1 : 0.03 * k));
      if (st === 3) {
        t.swap = R ? 1 : cl(el2 / 3.4);
        const rem = Math.max(0, C.ice - Math.max(0, el2 - 3.4));
        setTimer(C.fmt(C.m ? Math.ceil(rem) : rem));
        if (rem <= 0 && !t.fin) {
          t.fin = true;
          t.serve = 0;
          setTimer("");
          setStage(4);
        }
      } else if (st < 3) t.swap = 0;
      else t.swap = 1;
      if (st !== 3) t.fin = false;
      if (st === 4) {
        t.serve = Math.min(1, t.serve + (R ? 1 : 0.0032 * k));
        if (t.serve >= 1 && !t.done) {
          t.done = true;
          finish();
        }
      } else t.done = false;
      if (st < 4) t.serve = 0;
      t.drip = st === 5 ? Math.min(t.dripMax, t.drip + (R ? 1 : 0.0035 * k)) : 0;
      // Confetti steps once per 60fps frame's worth of time.
      t.confAcc = (t.confAcc || 0) + k;
      while (t.confAcc >= 1) {
        t.conf = stepConfetti(t.conf, H, EGG_GRID_SCALE);
        t.confAcc -= 1;
      }
      const jit = t.shake > 0.01 ? Math.sin(now * 0.09) * 0.03 * t.shake : 0;
      t.shake *= Math.pow(0.88, k);

      const rc = box && box.getBoundingClientRect();
      const onScreen = rc && rc.bottom > 0 && rc.top < window.innerHeight && !document.hidden;
      const painting = el && box && onScreen && odd;
      if (painting) {
        const W = colsFor(box.clientWidth - (inTerm ? 64 : 48), inTerm ? 540 : 600);
        t.W = W;
        t.H = H;
        if (inTerm && termStatus.current) {
          const tx = statusText();
          if (termStatus.current.textContent !== tx) termStatus.current.textContent = tx;
        }
        paint(
          el,
          fxBox,
          potArt(t.A + jit + 0.05 * t.py, t.B + 0.08 * t.px, W, H, {
            t: R ? 0 : now / 1000,
            boil: t.boil,
            flame: t.flame,
            swap: t.swap,
            drip: t.drip,
            lower: 1,
            hover: t.hover,
            serve: t.serve,
            yolk: t.yolk,
            conf: t.conf,
          }),
        );
      }
      const atRest = (st === 0 || st === 5) && !t.drag,
        still =
          R &&
          painting &&
          !t.conf.length &&
          t.shake < 0.01 &&
          Math.abs(t.vA) + Math.abs(t.vB) < 1e-5 &&
          Math.abs(t.px) + Math.abs(t.py) < 1e-3;
      raf = atRest && (!onScreen || still) && now > awake ? 0 : requestAnimationFrame(frame);
    };
    run();

    const onMove = (e) => {
      const L = live.current,
        el = L.mode === "term" ? termPre.current : guiPre.current;
      if (!el) return;
      const rc = el.getBoundingClientRect(),
        t = getScene();
      t.mx = Math.max(-1, Math.min(1, (e.clientX - rc.left - rc.width / 2) / rc.width));
      t.my = Math.max(-1, Math.min(1, (e.clientY - rc.top - rc.height / 2) / rc.height));
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    // Capture phase: scrolls inside the terminal don't bubble, and a key or click may
    // mount the terminal's inline egg.
    const WAKE = ["scroll", "keydown", "pointerdown"],
      opts = { capture: true, passive: true };
    for (const ev of WAKE) document.addEventListener(ev, run, opts);
    window.addEventListener("resize", run);
    window.addEventListener("popstate", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      wake.current = () => {};
      document.removeEventListener("mousemove", onMove);
      for (const ev of WAKE) document.removeEventListener(ev, run, opts);
      window.removeEventListener("resize", run);
      window.removeEventListener("popstate", run);
      document.removeEventListener("visibilitychange", run);
    };
    // statusText only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crack, finish, setStage, setTimer]);

  const handlers = {
    onPointerDown: (e) => {
      const t = getScene();
      t.drag = { x: e.clientX, y: e.clientY };
      t.moved = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const t = getScene();
      if (!t.drag) return;
      const dx = e.clientX - t.drag.x,
        dy = e.clientY - t.drag.y;
      t.moved += Math.abs(dx) + Math.abs(dy);
      if (t.moved < 5) return;
      e.currentTarget.style.cursor = "grabbing";
      t.B += dx * 0.01;
      t.A += dy * 0.01;
      t.vB = dx * 0.003;
      t.vA = dy * 0.003;
      t.drag = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e) => {
      getScene().drag = null;
      e.currentTarget.style.cursor = "grab";
    },
    onPointerCancel: (e) => {
      getScene().drag = null;
      e.currentTarget.style.cursor = "grab";
    },
    onClick: () => {
      if (getScene().moved < 5) crack();
    },
  };

  // Derived copy for the GUI frame.
  const C = clockConfig(clockMode),
    ES = eggStages[stage] || eggStages[0],
    rs = result || { label: "", hint: "" };
  const view = {
    label: ES.label.replace("{r}", rs.label),
    tip: ES.tip,
    prompt: fillTimes(ES.prompt, C),
    enter: !!ES.enter,
    title: fillTimes(ES.title.replace("{r}", rs.label), C),
    sub: fillTimes(ES.sub.replace("{b}", rs.hint), C),
    stats: stats && stage === 5 ? statsView(stats, eggTypes) : null,
    stage,
    briefing,
    rulesSeen,
    rules: eggRules.map((r) => fillTimes(r, C)),
  };

  return {
    stage,
    crack,
    reset,
    handlers,
    view,
    guiPreRef: guiPre,
    guiFxRef: guiFx,
    guiClockRef: guiClock,
    guiBoxRef: guiBox,
    guiAnnounceRef: guiAnnounce,
    termPreRef: termPre,
    termFxRef: termFx,
    termStatusRef: termStatus,
    termBoxRef: termBox,
  };
}
