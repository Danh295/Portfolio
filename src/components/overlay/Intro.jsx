"use client";

import { useEffect, useRef, useState } from "react";
import { ui } from "@/config/ui";
import { introPlan, endIntro, BOOT, BOOT_END_MS } from "@/lib/intro";
import { prefersReducedMotion } from "@/lib/useReducedMotion";
import { projects } from "@/data/projects";
import styles from "./Intro.module.css";

const LOG = [
  "dannyos 26.09 · soft-boiled x86_64",
  "",
  "[ ok ] mounting /home/danny",
  "[ ok ] loading ~/projects (" + projects.length + ")",
  "[ ok ] reading ~/experience",
  "[ ok ] parsing ~/skills",
  "[ ok ] lighting the stove",
];

/**
 * Once-per-session intro. "boot" prints a log and a progress bar (~1.95s), then the
 * page is revealed line by line. "wipe" dissolves a █▓▒░ field. Click to skip.
 */
export default function Intro({ rootRef }) {
  const [fx, setFx] = useState(null);
  const ovRef = useRef(null),
    preRef = useRef(null),
    started = useRef(false); // plays once

  useEffect(() => {
    const plan = introPlan(ui.introFx);
    const uncover = () => {
      document.documentElement.classList.remove("boot-intro");
      if (plan.fx === "none") delete document.documentElement.dataset.loading;
    };
    if (plan.fx === "none") return uncover();
    if (started.current) return;
    const id = requestAnimationFrame(() => {
      started.current = true;
      setFx(plan.fx);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!fx) return;
    // The overlay is up now; drop the pre-paint cover (layout.js).
    document.documentElement.classList.remove("boot-intro");
    // The custom cursor shows its hourglass while this is up.
    document.documentElement.dataset.loading = "true";
    const ov = ovRef.current,
      pre = preRef.current;
    const cols = Math.ceil(window.innerWidth / 7.2) + 2,
      rows = Math.ceil(window.innerHeight / 14) + 1,
      th = [];
    for (let i = 0; i < cols * rows; i++) {
      const x = i % cols;
      th.push(fx === "wipe" ? (x / cols) * 0.6 + Math.random() * 0.4 : Math.random());
    }
    const t0 = performance.now();
    let raf = 0,
      done = false;
    const end = (reveal) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      setFx(null);
      delete document.documentElement.dataset.loading;
      endIntro(); // skipped early too: the hero heading starts now, not at the planned end
      // Under reduced motion the boot log still plays, but the page is uncovered at once.
      // (Read the media query directly: the useReducedMotion hook still reports the server
      // value during hydration, and the intro can end that early when skipped.)
      if (reveal && rootRef.current && !prefersReducedMotion()) {
        // The page is revealed line by line under a cover pinned to the screen, which
        // retracts top to bottom. (Clipping the page itself swept the whole document, so
        // a scroll during the reveal outran it into unrevealed page.) It sweeps the
        // screen at the speed the document sweep used to cross it.
        const share = Math.min(1, innerHeight / Math.max(1, rootRef.current.offsetHeight)),
          cover = document.createElement("div");
        cover.className = styles.cover;
        cover.dataset.revealCover = "";
        document.body.appendChild(cover);
        const sweep = cover.animate(
          [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }],
          {
            duration: BOOT.REVEAL_MS * share,
            easing: `steps(${Math.max(1, Math.round(28 * share))}, end)`,
          },
        );
        sweep.onfinish = sweep.oncancel = () => cover.remove();
      }
    };
    const dissolve = (p) => {
      let s = "";
      const RR = "█▓▒░ ";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const d = (p - th[x + y * cols]) / 0.12;
          s += d <= 0 ? "█" : RR[Math.min(4, (d * 4) | 0)];
        }
        s += "\n";
      }
      return s;
    };
    const step = (now) => {
      const e = now - t0;
      if (fx === "boot") {
        const n = Math.floor(e / BOOT.LINE_MS),
          logDone = BOOT.LINE_MS * BOOT.LINES,
          bar = Math.max(0, Math.min(BOOT.CELLS, Math.floor((e - logDone) / BOOT.CELL_MS)));
        pre.textContent =
          LOG.slice(0, Math.min(LOG.length, n)).join("\n") +
          (n >= BOOT.LINES
            ? "\n\n[" +
              "■".repeat(bar) +
              "□".repeat(24 - bar) +
              "] " +
              Math.round((bar / 24) * 100) +
              "%"
            : "") +
          (Math.floor(e / 250) % 2 ? " █" : "");
        if (e > BOOT_END_MS) return end(true);
      } else {
        const p = e / 850;
        pre.textContent = dissolve(p);
        if (p > 1.15) return end(false);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const skip = () => end(fx === "boot");
    // Keys belong to the intro while it plays: Esc, Enter or Space skip it, and nothing
    // reaches the page underneath (its selection would move unseen). Browser shortcuts
    // with cmd/ctrl still work.
    const onKey = (e) => {
      if (done || e.metaKey || e.ctrlKey) return;
      e.stopImmediatePropagation();
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    };
    ov.addEventListener("click", skip);
    window.addEventListener("keydown", onKey, true);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      ov.removeEventListener("click", skip);
      window.removeEventListener("keydown", onKey, true);
      delete document.documentElement.dataset.loading;
    };
  }, [fx, rootRef]);

  if (!fx) return null;
  return (
    <div
      ref={ovRef}
      className={fx === "boot" ? `${styles.ov} ${styles.boot}` : styles.ov}
      aria-hidden="true"
    >
      <pre
        ref={preRef}
        className={fx === "boot" ? `${styles.pre} ${styles.bootPre}` : styles.pre}
      />
    </div>
  );
}
