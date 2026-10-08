"use client";

// The two shells' state and keys: the full-screen terminal ("term") and the embedded
// one ("embed"). Each session keeps its output lines, prompt input, history and cwd.
// Commands run through the pure shell (src/lib/shell); what they do to the page (open a
// project, switch theme, scroll to a section…) is handed back through `onFx(k, fx)`, so
// the gui stays in App.jsx.

import { useEffect, useRef, useState } from "react";
import { shell, pstr } from "@/lib/shell";
import { SHORTCUT_CMDS } from "@/lib/shell/spec";
import { histStep } from "@/lib/shell/history";
import { spark } from "@/lib/github";

const bootCtx = { cwd: [], spark, hist: [] };
const BOOT_TERM = [
  ...shell.exec("whoami", "term", bootCtx).out,
  ...shell.exec("ls", "term", bootCtx).out,
  { t: "hint", text: "tree projects" },
];
const BOOT_EMBED = [
  { t: "dim", text: "zsh-ish shell · type help · ` or esc closes" },
  { t: "hint", text: "./app --mode terminal" },
];
const newSession = (lines) => ({ lines, input: "", hist: [], hi: -1, cwd: [], pend: null });

/**
 * `egg`: the minigame (an inline ./egg is reset when another command runs). `vimOpen`:
 * vim owns the terminal (shortcuts wait). `onFx(k, fx)`: apply a command's page effects.
 * `onExit(k)`: ctrl-d on an empty prompt.
 */
export function useShell({ keysOn, egg, vimOpen, termInputRef, onFx, onExit }) {
  const [sessions, setSessions] = useState(() => ({
    term: newSession(BOOT_TERM),
    embed: newSession(BOOT_EMBED),
  }));
  const [pressedTab, setPressedTab] = useState(-1);
  const autoType = useRef(null),
    runRef = useRef(null);
  const termEggRunning = sessions.term.lines.some((l) => l.t === "egg");

  const retireEgg = (lines, text) => lines.map((l) => (l.t === "egg" ? { t: "dim", text } : l));

  const patchSession = (k, o) => setSessions((s) => ({ ...s, [k]: { ...s[k], ...o } }));
  const appendLines = (k, extra, o = {}) =>
    setSessions((s) => ({ ...s, [k]: { ...s[k], ...o, lines: [...s[k].lines, ...extra] } }));

  // `typed`: the line came from the prompt. Clicks and shortcuts pass false.
  const run = (k, raw, typed = false) => {
    const T = sessions[k];
    if (T.pend && typed) {
      const yes = /^y(es)?$/i.test(raw.trim()),
        pend = T.pend;
      appendLines(
        k,
        [
          { t: "cmd", text: raw.trim(), cwd: pstr(T.cwd) },
          { t: "dim", text: yes ? "opening mail…" : "cancelled" },
        ],
        { pend: null, input: "" },
      );
      if (yes) window.location.assign(pend.href);
      return;
    }
    // A click or shortcut while `mail`'s y/N is waiting answers "no", then runs.
    const cancelled = T.pend ? [{ t: "dim", text: "cancelled" }] : [];
    const { out, fx, cwd } = shell.runLine(raw, k, {
      cwd: T.cwd,
      spark,
      hist: T.hist,
      keys: keysOn,
    });
    const tr = raw.trim(),
      hadEgg = T.lines.some((l) => l.t === "egg");
    setSessions((s) => {
      const TT = s[k];
      // Any other command puts a running inline egg away (and resets the game below).
      const prev = hadEgg
        ? retireEgg(TT.lines, fx.egg ? "(egg session moved below)" : "^C")
        : TT.lines;
      return {
        ...s,
        [k]: {
          ...TT,
          lines: fx.clear ? out : [...prev, ...cancelled, ...out],
          input: "",
          hist: tr ? [...TT.hist, tr] : TT.hist,
          hi: -1,
          cwd,
          pend: fx.pend || null,
        },
      };
    });
    if (hadEgg && !fx.egg) egg.reset();
    onFx(k, fx);
  };

  const complete = (k) => {
    const T = sessions[k],
      r = shell.complete(T.input, T.cwd);
    if (!r) return;
    const o = r.input != null ? { input: r.input } : {};
    if (r.matches)
      appendLines(
        k,
        [
          { t: "cmd", text: T.input, cwd: pstr(T.cwd) },
          { t: "txt", text: r.matches.join("   ") },
        ],
        o,
      );
    else patchSession(k, o);
  };

  // ./egg in terminal mode behaves like a foreground program: no prompt until ctrl-c.
  const quitEgg = () => {
    setSessions((s) => ({
      ...s,
      term: { ...s.term, lines: retireEgg(s.term.lines, "^C"), input: "", pend: null },
    }));
    egg.reset();
  };

  const stopAutoType = () => {
    clearTimeout(autoType.current);
    autoType.current = null;
    setPressedTab(-1);
  };

  // Bottom-bar shortcut (digit key or click): flash the tab, type the command into
  // the prompt, then run it.
  const typeRun = (i) => {
    const cmd = SHORTCUT_CMDS[i];
    if (!cmd || autoType.current || vimOpen) return; // vim owns the screen until :q
    if (termEggRunning) quitEgg();
    termInputRef.current?.focus({ preventScroll: true });
    setPressedTab(i);
    const finish = () => {
      stopAutoType();
      runRef.current("term", cmd);
    };
    let n = 0;
    const step = () => {
      n += 1;
      patchSession("term", { input: cmd.slice(0, n) });
      autoType.current = setTimeout(n < cmd.length ? step : finish, n < cmd.length ? 38 : 240);
    };
    autoType.current = setTimeout(step, 110);
  };

  const shellKey = (k, e) => {
    if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return; // IME
    const T = sessions[k],
      plain = !e.ctrlKey && !e.metaKey && !e.altKey,
      hasEgg = T.lines.some((l) => l.t === "egg");
    if (k === "term" && autoType.current) {
      // A shortcut is typing itself out: ctrl-c cancels it, other keys wait.
      if (e.metaKey) return;
      e.preventDefault();
      if (e.ctrlKey && e.key === "c") {
        stopAutoType();
        appendLines(k, [{ t: "cmd", text: T.input + "^C", cwd: pstr(T.cwd) }], { input: "" });
      }
      return;
    }
    if (k === "term" && hasEgg) {
      // The egg owns the keyboard: Enter plays, ctrl-c quits, everything else is ignored.
      if (e.metaKey) return;
      e.preventDefault();
      if (e.key === "Enter") egg.crack();
      else if (e.ctrlKey && e.key === "c") quitEgg();
      return;
    }
    if (
      k === "term" &&
      keysOn &&
      plain &&
      !T.input &&
      /^[0-9]$/.test(e.key) &&
      SHORTCUT_CMDS[+e.key]
    ) {
      e.preventDefault();
      typeRun(+e.key);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(k, T.input, true);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = histStep(T.hist, T.hi, e.key === "ArrowUp" ? 1 : -1);
      if (step) patchSession(k, step);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete(k);
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      patchSession(k, { lines: [] });
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      appendLines(k, [{ t: "cmd", text: T.input + "^C", cwd: pstr(T.cwd) }], {
        input: "",
        pend: null,
      });
    } else if (e.ctrlKey && e.key === "d" && !T.input) {
      // EOF on an empty prompt leaves the shell.
      e.preventDefault();
      onExit(k);
    }
  };

  // Prompt edits, except while ./egg runs or a shortcut is typing itself out.
  const setTermInput = (v) => {
    if (!termEggRunning && !autoType.current) patchSession("term", { input: v });
  };

  // Timers call the latest run.
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => () => clearTimeout(autoType.current), []);

  return {
    sessions,
    pressedTab,
    termEggRunning,
    run,
    shellKey,
    typeRun,
    quitEgg,
    stopAutoType,
    patchSession,
    setTermInput,
  };
}
