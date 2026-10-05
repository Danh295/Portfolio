"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header/Header";
import Hint from "@/components/Hint";
import BottomBar from "@/components/frame/BottomBar";
import Hero from "@/components/egg/Hero";
import { useEggGame } from "@/components/egg/useEggGame";
import ProjectList from "@/components/work/ProjectList";
import ProjectDetail from "@/components/work/ProjectDetail";
import Experience from "@/components/experience/Experience";
import Skills from "@/components/skills/Skills";
import MiniShell from "@/components/shell/MiniShell";
import Terminal from "@/components/shell/Terminal";
import Tooltip from "@/components/overlay/Tooltip";
import Cursor from "@/components/overlay/Cursor";
import { pressFx, PRESSABLE } from "@/lib/pressFx";
import HelpModal from "@/components/overlay/HelpModal";
import AboutModal from "@/components/overlay/AboutModal";
import Intro from "@/components/overlay/Intro";
import { site } from "@/config/site";
import { ui } from "@/config/ui";
import { projects, projectFolders } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { skills, pstr } from "@/lib/shell";
import { spark } from "@/lib/github";
import { useShell } from "@/components/shell/useShell";
import { useTheme } from "@/lib/useTheme";
import { useKeysPref } from "@/lib/useKeysPref";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { openBuffer, vimKey as vimStep } from "@/lib/vim";
import {
  alignTarget,
  focusQuiet,
  freeNav,
  holdNav,
  parseLocation,
  projUrl,
  secUrl,
} from "@/lib/nav";
import { useOnChange } from "@/lib/useOnChange";
import { EXP_MAIN, EXP_TOGGLE, HAS_EARLY, stepSelection } from "@/lib/selection";
import styles from "./App.module.css";

// Read once per page load, not per render (a render must not read the clock).
const YEAR = new Date().getFullYear();
// Keys that scroll the page natively; pressing one hands activeSec back to the scroll spy.
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", " "]);
// While a popup is open, these scroll its list (marked data-popup-scroll) instead of the
// page behind it: lines (±1), pages (±2) or the ends (±3); 0 just stops the page moving.
const POPUP_SCROLL = {
  ArrowDown: 1,
  ArrowUp: -1,
  ArrowLeft: 0,
  ArrowRight: 0,
  PageDown: 2,
  PageUp: -2,
  " ": 2,
  Home: -3,
  End: 3,
};
// Keys that toggle, open or activate something: a held key acts once, not at key-repeat
// speed (a held t would strobe the whole page between themes). Moving keys still repeat.
const NO_REPEAT = new Set([..."?msitf`eglr", "Enter", "Escape", "Backspace"]);
// Keys that move the gui selection.
const NAV_KEYS = new Set([
  "j",
  "k",
  "h",
  "1",
  "2",
  "3",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/** `initialView`: the project slug a /projects/<slug>/ page starts on (pre-rendered). */
export default function App({ initialView = null }) {
  const reduce = useReducedMotion();
  const [dark, setDark, toggleTheme] = useTheme();
  // Single-character shortcuts on/off (WCAG 2.1.4); Enter, Space, arrows and Esc always work.
  const [keysOn, setKeysOn, toggleKeys] = useKeysPref();
  const [mode, setMode] = useState("gui");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState(initialView);
  const [sel, setSel] = useState(-1);
  const [expSel, setExpSel] = useState(-1);
  const [expOpen, setExpOpen] = useState(-1);
  const [expEarlier, setExpEarlier] = useState(false);
  const [activeSec, setActiveSec] = useState(0);
  const [termOpen, setTermOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Every section's header is its first stop (it shows the blinking cursor); j/k then
  // move through its elements (selected = inverted, no cursor). Hero stops: the heading
  // ("head"), "more…" ("more"), the egg prompt ("egg"); Enter only plays the egg while
  // its prompt is selected. Work/experience use sel/expSel, with -1 = the header.
  const [heroSel, setHeroSel] = useState("head");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [vim, setVim] = useState(null);

  const egg = useEggGame({ reduce, clockMode: ui.eggClock, mode });

  const rootRef = useRef(null),
    contentRef = useRef(null),
    listRef = useRef(null),
    vimRef = useRef(null);
  const {
    guiPreRef,
    guiFxRef,
    guiClockRef,
    guiBoxRef,
    guiAnnounceRef,
    termPreRef,
    termFxRef,
    termStatusRef,
    termBoxRef: termBodyRef,
  } = egg;
  const embedPanelRef = useRef(null),
    embedBodyRef = useRef(null),
    embedInputRef = useRef(null),
    termInputRef = useRef(null);
  const navLock = useRef({ on: false, t: 0, target: null }),
    pendingSec = useRef(null),
    returnScroll = useRef(null),
    vimReg = useRef(null),
    keyHandler = useRef(null),
    fxRef = useRef(null),
    navRef = useRef(null),
    barRef = useRef(null),
    scrollSpy = useRef(null);

  // Both shells (state, commands, keys); their page effects come back through applyFx,
  // defined below and reached through fxRef.
  const {
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
  } = useShell({
    keysOn,
    reduce,
    egg,
    vimOpen: !!vim,
    termInputRef,
    onFx: (k, fx) => fxRef.current(k, fx),
    onExit: (k) => (k === "term" ? toGui() : setTermOpen(false)),
  });

  const list = useMemo(
    () => projects.filter((p) => filter === "all" || p.category === filter),
    [filter],
  );

  /* ---------- navigation ---------- */

  const smooth = reduce ? "auto" : "smooth";

  // Sections carry scroll-margin-top: var(--nav-offset); alignTarget parks them under the nav.
  const scrollSec = (n, behavior = smooth) => {
    const el = n === 0 ? null : document.querySelector('[data-sec="' + n + '"]');
    if (n !== 0 && !el) return;
    const top = el ? alignTarget(el) : 0;
    holdNav(navLock, 400, top);
    window.scrollTo({ top, behavior });
  };

  // Stepping between projects or leaving one replaces the entry, so Back leaves the
  // project pages in one press and never reopens a project you just closed.
  const setUrl = (h, replace = false) => {
    try {
      if (replace) history.replaceState(null, "", h);
      else history.pushState(null, "", h);
    } catch {
      // ignore (sandboxed iframes)
    }
  };

  const openProject = (slug, push = true) => {
    // Remember where the list was, so closing the project puts it back exactly there.
    if (!view) returnScroll.current = window.scrollY;
    setRulesOpen(false);
    setView(slug);
    if (push) setUrl(projUrl(slug), !!view);
  };

  // Close the project page and land on section n once the list is back (useOnChange(view)
  // below scrolls there). `replace`: swap the history entry instead of adding one.
  const leaveProject = (n, replace = false) => {
    pendingSec.current = n;
    setView(null);
    setUrl(secUrl(n), replace);
  };

  const goBack = () => {
    leaveProject(1, true);
    setActiveSec(1);
  };

  // Jump to section n, landing on its header unless `stop` names an element: a row
  // index for work (1) / experience (2), or a hero stop ("more" | "egg") for 0.
  const goSec = (n, stop) => {
    if (mode !== "gui") return;
    setActiveSec(n);
    setHeroSel(n === 0 && stop ? stop : "head");
    if (n === 1) setSel(stop ?? -1);
    if (n === 2) setExpSel(stop ?? -1);
    if (view) leaveProject(n);
    else scrollSec(n);
  };

  // "[h] ~/danny" and the h key: the hero, from anywhere (a project page included).
  const goHome = () => {
    if (view) leaveProject(0);
    else scrollSec(0);
    setActiveSec(0);
    setHeroSel("head");
  };

  // Fold/unfold the early roles, keeping the selection on the toggle (whose index
  // moves) or on a visible row.
  const toggleEarlier = () => {
    const next = !expEarlier;
    setExpEarlier(next);
    if (!next && experienceEntries[expOpen]?.early) setExpOpen(-1);
    if (expSel === EXP_TOGGLE(expEarlier) || (!next && expSel >= EXP_MAIN))
      setExpSel(EXP_TOGGLE(next));
  };
  const active2Toggle = activeSec === 2 && HAS_EARLY && expSel === EXP_TOGGLE(expEarlier);

  // Starting or advancing the egg puts the rules card away (it would sit over the pot).
  const startEgg = () => {
    setRulesOpen(false);
    egg.crack();
  };

  const switchMode = (m) => {
    stopAutoType();
    try {
      sessionStorage.setItem("danny-mode", m); // a reload comes back to this mode
    } catch {
      // storage blocked: reloads start in the gui
    }
    // Leaving the terminal with ./egg still running quits it, as closing a shell would.
    if (m === "gui" && termEggRunning) quitEgg();
    setMode(m);
    setTermOpen(false);
    if (m === "gui") setVim(null);
  };

  const toGui = () => switchMode("gui");

  /* ---------- shell ---------- */

  // What a shell command does to the page (src/components/shell/useShell.js runs it).
  const applyFx = (k, fx) => {
    if (fx.theme) setDark(fx.theme === "dark");
    if (fx.keys) setKeysOn(fx.keys === "on");
    if (fx.mode) switchMode(fx.mode);
    if (fx.close) setTermOpen(false);
    if (fx.vim) {
      setVim(openBuffer(fx.vim.name, fx.vim.lines, vimReg.current));
      termInputRef.current?.blur();
    }
    if (fx.sec != null && !fx.open) setActiveSec(fx.sec);
    if (k === "embed") {
      if (fx.open) openProject(fx.open);
      if (fx.exp != null && fx.sec === 2) {
        // A folded "earlier" role unfolds so its row can be selected.
        if (experienceEntries[fx.exp]?.early) setExpEarlier(true);
        setExpSel(fx.exp);
      }
      if (fx.filter) {
        setFilter(fx.filter);
        setSel(-1);
      }
    }
    if (fx.href) {
      if (fx.href.startsWith("mailto:")) window.location.assign(fx.href);
      else window.open(fx.href, "_blank", "noopener");
    }
    // A section the embedded shell went to (cd / cat …, or `./egg` → the hero with the
    // egg selected): scroll there, leaving an open project page first.
    const to = fx.sec0 ? 0 : k === "embed" && fx.sec != null && !fx.open ? fx.sec : null;
    if (fx.sec0) {
      setActiveSec(0);
      setHeroSel("egg");
    }
    if (to != null) {
      if (view) leaveProject(to);
      else setTimeout(() => scrollSec(to), 50);
    }
  };

  /* ---------- keyboard ---------- */

  // vim's modes, motions and registers live in src/lib/vim.js; this only applies its
  // side effects. The unnamed register is kept across files.
  const vimKey = (e) => {
    if (e.metaKey || e.altKey) return;
    let r;
    try {
      r = vimStep(vim, e.key, e.ctrlKey);
    } catch {
      // A vim bug must not break the page: swallow the key and keep the buffer.
      e.preventDefault();
      return;
    }
    if (!r.handled) return;
    e.preventDefault();
    vimReg.current = r.state.reg;
    if (r.clipboard != null) navigator.clipboard?.writeText(r.clipboard).catch(() => {});
    if (r.theme) setDark(r.theme === "dark");
    setVim(r.quit ? null : r.state);
  };

  const handleKey = (e) => {
    const ae = document.activeElement,
      typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA");
    if (mode === "term") {
      // vim takes every key, except Enter/Space on a focused button (e.g. [exit]).
      if (vim) {
        if (!((e.key === "Enter" || e.key === " ") && ae && ae.closest("a, button"))) vimKey(e);
      } else if (
        !typing &&
        // A focused button or link handles its own Enter, as in the gui.
        ((e.key === "Enter" && !(ae && ae !== document.body && ae.closest("a, button"))) ||
          (e.ctrlKey && e.key === "c" && window.getSelection().isCollapsed))
      ) {
        termInputRef.current?.focus({ preventScroll: true });
        shellKey("term", e);
      } else if (
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.length === 1 &&
        !(e.key === " " && ae && ae.closest("button, a"))
      )
        // Typing anywhere goes to the prompt.
        termInputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (e.repeat && !typing && NO_REPEAT.has(e.key)) {
      e.preventDefault();
      return;
    }
    // A popup (keys or more…) owns the keyboard: only Esc, the popup keys (? and m, which
    // swap between them) and s (in the keys popup) work. Scroll keys scroll the popup, not
    // the page behind it; Enter and Space still press a focused button inside it.
    if ((help || aboutOpen) && !["Escape", "?", "m", "s"].includes(e.key)) {
      const dir = POPUP_SCROLL[e.key];
      if (dir === undefined || (e.key === " " && ae?.closest("a, button"))) return;
      e.preventDefault();
      const box = document.querySelector("[data-popup-scroll]");
      if (!box || !dir) return;
      const d = e.key === " " && e.shiftKey ? -2 : dir;
      const by =
        Math.abs(d) === 3
          ? d * box.scrollHeight
          : Math.abs(d) === 2
            ? d * box.clientHeight * 0.45
            : d * 40;
      box.scrollBy({ top: by });
      return;
    }
    if (e.key === "`") {
      if (!keysOn) return; // the header's terminal button still works
      e.preventDefault();
      setTermOpen((o) => !o);
      pressFx(document.querySelector('[data-key="`"]'));
      return;
    }
    if (typing) {
      if (e.key === "Escape") {
        setTermOpen(false);
        ae.blur();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // In the keys popup, s flips the shortcuts on/off (its toggle button says so).
    if (help && e.key === "s") {
      e.preventDefault();
      toggleKeys();
      pressFx(document.querySelector('[data-key="s"]'));
      return;
    }
    // The embedded shell is open but its input lost focus (e.g. after selecting output
    // to copy): typing goes back to its prompt instead of firing gui shortcuts. Enter
    // still activates a focused control; Esc closes the shell below.
    if (
      termOpen &&
      !help &&
      !aboutOpen &&
      (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") &&
      !((e.key === " " || e.key === "Enter") && ae && ae.closest("button, a"))
    ) {
      embedInputRef.current?.focus({ preventScroll: true });
      if (e.key === "Enter") shellKey("embed", e);
      return;
    }
    // The first-round rules card is up: Enter, Space or any character key proceeds (it
    // says so; with shortcuts off only Enter and Space do). Esc puts it away; arrows, Tab
    // and the like keep their usual jobs.
    const eggRc = guiBoxRef.current?.getBoundingClientRect(),
      eggOnScreen = !!eggRc && eggRc.bottom > 80 && eggRc.top < window.innerHeight - 80;
    if (egg.view.briefing && eggOnScreen && !view && !help && !aboutOpen) {
      const proceed = e.key === "Enter" || e.key === " " || (keysOn && e.key.length === 1);
      if (e.key === "Escape") {
        e.preventDefault();
        egg.reset();
        return;
      }
      if (proceed) {
        e.preventDefault();
        setActiveSec(0);
        setHeroSel("egg");
        startEgg();
        return;
      }
    }
    // Moving the selection with the keyboard drops focus left on a button by an earlier
    // click, so Enter/Space then act on the selection rather than that button.
    if (
      NAV_KEYS.has(e.key) &&
      (keysOn || e.key.length > 1) &&
      ae &&
      ae !== document.body &&
      ae.closest("a, button")
    )
      ae.blur();
    // With the egg selected, Enter/Space play it even if a button kept focus from an
    // earlier click (e.g. the rules chip), so a timed press never goes elsewhere.
    const eggKey =
      (e.key === "Enter" || e.key === " ") &&
      !view &&
      !help &&
      !termOpen &&
      !aboutOpen &&
      activeSec === 0 &&
      heroSel === "egg";
    // Leave Enter/Space on focused links and buttons to the browser.
    if (
      !eggKey &&
      (e.key === "Enter" || e.key === " ") &&
      ae &&
      ae !== document.body &&
      ae.closest("a, button, summary, select")
    )
      return;
    // The egg plays only while its frame is on screen.
    const playEgg = () => {
      if (eggOnScreen) startEgg();
    };
    // The element Enter/Space act on in the gui: the selected hero stop, project row or
    // experience row (null on a section header or with an overlay up).
    const selectedEl = () => {
      if (view || help || termOpen || aboutOpen) return null;
      if (activeSec === 0) {
        if (heroSel === "more") return document.querySelector('[data-key="m"]');
        if (heroSel === "rules") return document.querySelector('[data-key="i"]');
        if (heroSel === "egg") return document.querySelector("[data-egg]");
        return null;
      }
      if (activeSec === 1 && list[sel]) return document.querySelector('[data-row="' + sel + '"]');
      if (activeSec === 2 && expSel >= 0)
        return expSel === EXP_TOGGLE(expEarlier)
          ? document.querySelector("[data-earlier]")
          : document.querySelector('[data-exprow="' + expSel + '"] > button');
      return null;
    };
    const activate = () => {
      if (view || help || termOpen || aboutOpen) return;
      pressFx(selectedEl());
      if (activeSec === 0) {
        if (heroSel === "more") return setAboutOpen(true);
        if (heroSel === "rules") return setRulesOpen((o) => !o);
        if (heroSel === "egg") playEgg();
      } else if (activeSec === 1 && list[sel]) openProject(list[sel].slug);
      else if (activeSec === 2 && expSel >= 0) {
        if (expSel === EXP_TOGGLE(expEarlier)) toggleEarlier();
        else setExpOpen(expOpen === expSel ? -1 : expSel);
      }
    };
    // j/k: one step of the selection model (src/lib/selection.js).
    const step = (dir) => {
      if (!home) return;
      const r = stepSelection(dir, {
        activeSec,
        heroSel,
        sel,
        expSel,
        expEarlier,
        rulesSeen: egg.view.rulesSeen,
        listLength: list.length,
      });
      if (!r) return;
      if (r.goSec) goSec(...r.goSec);
      else if (r.heroSel) setHeroSel(r.heroSel);
      else if (r.sel != null) setSel(r.sel);
      else if (r.expSel != null) setExpSel(r.expSel);
    };
    const home = !view,
      idx = projects.findIndex((p) => p.slug === view),
      open = (u) => window.open(u, "_blank", "noopener");
    const map = {
      Escape: () =>
        help
          ? setHelp(false)
          : aboutOpen
            ? setAboutOpen(false)
            : rulesOpen && !view
              ? setRulesOpen(false)
              : termOpen
                ? setTermOpen(false)
                : view
                  ? goBack()
                  : expOpen >= 0
                    ? setExpOpen(-1)
                    : (setSel(-1), setExpSel(-1), setHeroSel("head")),
      "?": () => {
        setAboutOpen(false);
        setHelp((h) => !h);
      },
      m: () => {
        setHelp(false);
        setAboutOpen((o) => !o);
      },
      i: () => !view && setRulesOpen((o) => !o),
      t: toggleTheme,
      h: goHome,
      1: () => goSec(1),
      2: () => goSec(2),
      3: () => goSec(3),
      ArrowDown: () => goSec(Math.min(3, activeSec + 1)),
      ArrowUp: () => goSec(Math.max(0, activeSec - 1)),
      f: () => {
        setFilter(projectFolders[(projectFolders.indexOf(filter) + 1) % projectFolders.length]);
        setSel(-1);
      },
      j: () => step(1),
      k: () => step(-1),
      Enter: () => {
        if (!home || help || termOpen || aboutOpen) return;
        // On the hero heading, Enter jumps to the egg; otherwise it activates the
        // selected element.
        if (activeSec === 0 && heroSel === "head") return setHeroSel("egg");
        activate();
      },
      // On the main page ←/→ move like k/j; on a project they step between projects.
      ArrowRight: () => (home ? map.j() : openProject(projects[(idx + 1) % projects.length].slug)),
      ArrowLeft: () =>
        home ? map.k() : openProject(projects[(idx - 1 + projects.length) % projects.length].slug),
      Backspace: () => view && goBack(),
      e: () => {
        window.location.assign("mailto:" + site.email);
      },
      g: () => open(site.github.profile),
      l: () => open(site.linkedin),
      r: () => open(site.resume),
    };
    // Space presses the selected element like Enter does (with nothing selected it
    // scrolls the page as usual). With the egg selected, both always play it.
    if (eggKey) {
      e.preventDefault();
      if (!e.repeat) activate();
      return;
    }
    if (e.key === " ") {
      if (selectedEl()) {
        e.preventDefault();
        if (!e.repeat) activate();
      }
      return;
    }
    // Shortcuts off: every single-character key (letters, digits, ?) is left alone.
    if (!keysOn && e.key.length === 1) return;
    const fn = map[e.key];
    if (!fn) return;
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !home && idx < 0) return;
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !home) return;
    e.preventDefault();
    fn();
    // A shortcut with a visible button (header, bottom bar, hero, project page, dialog
    // close) flashes it; the last match is the topmost (dialogs render after the page).
    const keyed = document.querySelectorAll('[data-key="' + CSS.escape(e.key) + '"]');
    pressFx(keyed[keyed.length - 1]);
  };

  // Scroll spy: the last section whose top is above 55% of the viewport is active.
  const onScroll = () => {
    if (mode !== "gui" || view) return;
    let a = 0;
    const line = window.innerHeight * 0.55,
      secs = document.querySelectorAll("[data-sec]");
    secs.forEach((el) => {
      if (el.getBoundingClientRect().top < line) a = +el.getAttribute("data-sec");
    });
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 &&
      secs.length
    )
      a = +secs[secs.length - 1].getAttribute("data-sec");
    if (a !== activeSec) setActiveSec(a);
  };

  /* ---------- effects ---------- */

  // Tells the pre-paint script's fail-safe (layout.js) that hidden type-in text will be
  // revealed by the app, so it must not un-hide it early.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);

  // Global listeners call through refs so they always see the latest render.
  useEffect(() => {
    keyHandler.current = handleKey;
    fxRef.current = applyFx;
    scrollSpy.current = onScroll;
  });

  useEffect(() => {
    const release = () => freeNav(navLock);
    const onKey = (e) => {
      // Already handled by a shell input (Enter, Tab, arrows…). Without this, e.g. the
      // Enter that runs `exit` would reach the gui's handler after the mode switch.
      if (e.defaultPrevented) return;
      // Mid-composition (IME: Japanese, Chinese…): the keys belong to the composer.
      if (e.isComposing || e.keyCode === 229) return;
      if (SCROLL_KEYS.has(e.key)) release();
      if (keyHandler.current) keyHandler.current(e);
    };
    // The spy measures every section, so it runs at most once per frame.
    let spyFrame = 0;
    const onScrollEv = () => {
      // Our own scroll is still moving: keep the lock until it settles.
      if (navLock.current.on) holdNav(navLock, 160);
      else if (!spyFrame)
        spyFrame = requestAnimationFrame(() => {
          spyFrame = 0;
          if (!navLock.current.on && scrollSpy.current) scrollSpy.current();
        });
    };
    const onPop = () => {
      // Back/forward leaves any popup, the embedded shell and the rules card behind.
      setHelp(false);
      setAboutOpen(false);
      setTermOpen(false);
      setRulesOpen(false);
      const r = parseLocation();
      if (r.slug) setView(r.slug);
      else {
        pendingSec.current = r.sec;
        setView(null);
        setActiveSec(r.sec);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollEv, { passive: true });
    window.addEventListener("popstate", onPop);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("pointerdown", release);
    // A mouse press needs no flash: the pointer is already over the element, so its hover
    // look holds while pressed and after the click. Touch has no hover, so it gets the flash.
    const onPress = (e) => {
      if (e.pointerType !== "mouse" && e.button === 0 && e.target instanceof Element)
        pressFx(e.target.closest(PRESSABLE));
    };
    window.addEventListener("pointerdown", onPress);
    // A focused button activated by Enter/Space fires a click with detail 0: flash it too.
    const onKeyClick = (e) => {
      if (e.detail === 0 && e.target instanceof Element) pressFx(e.target.closest(PRESSABLE));
    };
    window.addEventListener("click", onKeyClick, true);
    // Seed from the URL (/#projects, /#projects/recall, redirect stubs). A reload has
    // no hash by now (see layout.js) and always starts at the top on home.
    const reloaded = performance.getEntriesByType("navigation")[0]?.type === "reload";
    const seed = requestAnimationFrame(() => {
      if (reloaded) window.scrollTo(0, 0);
      let savedMode = null;
      try {
        savedMode = sessionStorage.getItem("danny-mode");
      } catch {
        // storage blocked
      }
      if (savedMode === "term") setMode("term");
      else document.documentElement.classList.remove("boot-term"); // never leave it hidden
      const r = parseLocation();
      if (r.slug) {
        setView(r.slug);
        // An old-style link (/#projects/<slug>): show the project's real URL instead.
        if (!window.location.pathname.includes("/projects/"))
          history.replaceState(null, "", projUrl(r.slug));
      } else if (r.sec) {
        setActiveSec(r.sec);
        holdNav(navLock, 400);
        document.querySelector('[data-sec="' + r.sec + '"]')?.scrollIntoView({ block: "start" });
      }
    });
    return () => {
      cancelAnimationFrame(seed);
      cancelAnimationFrame(spyFrame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollEv);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("pointerdown", onPress);
      window.removeEventListener("click", onKeyClick, true);
      freeNav(navLock);
    };
  }, []);

  // Publish the sticky nav/bottom-bar heights so the hero can fill exactly the space
  // between them (Hero.module.css).
  useEffect(() => {
    if (mode !== "gui") return;
    const root = document.documentElement,
      bars = [
        [navRef, "--nav-h"],
        [barRef, "--bar-h"],
      ];
    const measure = () =>
      bars.forEach(
        ([r, v]) =>
          r.current && root.style.setProperty(v, r.current.getBoundingClientRect().height + "px"),
      );
    const ro = new ResizeObserver(measure);
    bars.forEach(([r]) => r.current && ro.observe(r.current));
    measure();
    return () => ro.disconnect();
  }, [mode]);

  useEffect(() => {
    const p = view && projects.find((x) => x.slug === view);
    document.title = p ? p.title + " | " + site.name : site.title;
  }, [view]);

  const fade = (el) => {
    if (!el || reduce) return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(.2,.7,.2,1)",
      },
    );
  };

  // Keep a selected row inside the visible band between the sticky nav and bottom bar.
  // Measured against where the page is heading (an in-flight jump's target), so a row
  // picked right after a section jump doesn't cancel the jump. If the row fits with its
  // section aligned under the nav, align it; otherwise scroll just enough to show it.
  const ensureVisible = (selector) => {
    const row = document.querySelector(selector);
    if (!row) return;
    const sec = row.closest("[data-sec]");
    const viewTop = (navRef.current?.getBoundingClientRect().height ?? 58) + 8,
      viewBottom = window.innerHeight - (barRef.current?.getBoundingClientRect().height ?? 38) - 8;
    const rowTop = row.getBoundingClientRect().top + window.scrollY,
      rowBottom = rowTop + row.offsetHeight;
    const fits = (y) => rowTop - y >= viewTop && rowBottom - y <= viewBottom;
    const heading = navLock.current.target ?? window.scrollY;
    if (fits(heading)) return;
    const aligned = sec ? alignTarget(sec) : null;
    const top =
      aligned != null && fits(aligned)
        ? aligned
        : rowTop - heading < viewTop
          ? rowTop - viewTop
          : rowBottom - viewBottom;
    holdNav(navLock, 400, top);
    window.scrollTo({ top, behavior: smooth });
  };

  useOnChange(mode, () => {
    // Restored terminal mode is up: stop hiding the gui (see the boot script in layout.js).
    document.documentElement.classList.remove("boot-term");
    fade(rootRef.current);
    if (mode === "term") {
      window.scrollTo(0, 0);
      setTimeout(() => termInputRef.current?.focus({ preventScroll: true }), 50);
    } else if (view) window.scrollTo(0, 0);
    // Back in the gui: land on whatever section the terminal last pointed at.
    else scrollSec(activeSec, "auto");
  });

  useOnChange(view, () => {
    fade(contentRef.current);
    if (view) {
      window.scrollTo(0, 0); // opened (or switched) a project: start at its top
      // Screen readers follow focus: land on the project's title (the clicked row is gone).
      focusQuiet(document.querySelector("[data-detail-title]"));
      return;
    }
    // Closed a project: go straight back, no scroll animation from the top. Back to the
    // projects list restores the exact position it was opened from; any other section
    // is aligned under the nav.
    const n = pendingSec.current,
      saved = returnScroll.current;
    pendingSec.current = null;
    returnScroll.current = null;
    if (n === 1 && saved != null) {
      holdNav(navLock, 400, saved);
      window.scrollTo({ top: saved, behavior: "auto" });
    } else if (n != null) scrollSec(n, "auto");
    // Focus was on the project page, which is gone: put it on the selected row.
    if (document.activeElement === document.body && sel >= 0)
      focusQuiet(document.querySelector('[data-row="' + sel + '"]'));
  });

  useOnChange(filter, () => fade(listRef.current));

  useOnChange(termOpen, () => {
    // Closed: focus was in the shell, which is gone; hand it to the button that opens it.
    if (!termOpen) {
      if (document.activeElement === document.body)
        focusQuiet(document.querySelector('nav [data-key="`"]'));
      return;
    }
    fade(embedPanelRef.current);
    embedInputRef.current?.focus({ preventScroll: true });
  });

  useOnChange(sel, () => sel >= 0 && ensureVisible('[data-row="' + sel + '"]'));
  useOnChange(expSel, () => expSel >= 0 && ensureVisible('[data-exprow="' + expSel + '"]'));

  useOnChange(vim, (prev) => {
    if (prev && !vim) {
      setTimeout(() => termInputRef.current?.focus({ preventScroll: true }), 0);
      return;
    }
    const box = vimRef.current,
      row = vim && box && box.querySelector('[data-vl="' + vim.r + '"]');
    if (!row) return;
    if (row.offsetTop < box.scrollTop + 12) box.scrollTop = row.offsetTop - 12;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight - 12)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 12;
  });

  /* ---------- render ---------- */

  // A popup (keys or more…) is modal: everything behind it is inert (no Tab, no clicks,
  // hidden from screen readers) until it closes.
  const popup = help || aboutOpen;
  // The j/k selection is shown by colour only, so it's also read out (a polite live region).
  const selName =
    mode !== "gui" || view
      ? ""
      : activeSec === 1 && list[sel]
        ? list[sel].title + ", project " + (sel + 1) + " of " + list.length
        : activeSec === 2 && expSel >= 0
          ? expSel === EXP_TOGGLE(expEarlier)
            ? expEarlier
              ? "hide earlier roles"
              : "earlier roles"
            : experienceEntries[expSel].title + " at " + experienceEntries[expSel].company
          : activeSec === 0 && heroSel !== "head"
            ? { more: "more about me", rules: "how to play", egg: "egg minigame" }[heroSel]
            : "";
  const termCwd = pstr(sessions.term.cwd),
    embedCwd = pstr(sessions.embed.cwd);

  // The gui's big pieces are built up front, not inside the mode/view conditionals
  // below: React Compiler caches each element on its own inputs, so a keystroke in the
  // embedded shell (which only changes `sessions`) re-renders none of them.
  const header = (
    <Header
      inert={popup}
      navRef={navRef}
      activeSec={view ? 1 : activeSec}
      dark={dark}
      shellOpen={termOpen}
      onHome={goHome}
      onSection={goSec}
      onShell={() => setTermOpen((o) => !o)}
      onTheme={toggleTheme}
      onHelp={() => setHelp((h) => !h)}
    />
  );
  const hero = (
    <Hero
      view={egg.view}
      handlers={egg.handlers}
      boxRef={guiBoxRef}
      clockRef={guiClockRef}
      preRef={guiPreRef}
      fxRef={guiFxRef}
      active={activeSec === 0}
      heroSel={heroSel}
      rulesOpen={rulesOpen}
      keysOn={keysOn}
      onRules={() => {
        setActiveSec(0);
        setHeroSel("rules");
        setRulesOpen((o) => !o);
      }}
      announceRef={guiAnnounceRef}
      onSelectEgg={() => {
        setActiveSec(0);
        setHeroSel("egg");
      }}
      onStart={() => {
        setActiveSec(0);
        setHeroSel("egg");
        startEgg();
      }}
      onMore={() => {
        setActiveSec(0);
        setHeroSel("more");
        setAboutOpen(true);
      }}
      reduce={reduce}
    />
  );
  const projectList = (
    <ProjectList
      list={list}
      filter={filter}
      sel={sel}
      active={activeSec === 1}
      reduce={reduce}
      listRef={listRef}
      onFilter={(key) => {
        setFilter(key);
        setSel(-1);
        setActiveSec(1);
      }}
      onOpen={(slug) => openProject(slug)}
    />
  );
  const experience = (
    <Experience
      expSel={expSel}
      expOpen={expOpen}
      expEarlier={expEarlier}
      active={activeSec === 2}
      reduce={reduce}
      onToggle={(i) => {
        setExpSel(i);
        setActiveSec(2);
        setExpOpen(expOpen === i ? -1 : i);
      }}
      earlierSel={active2Toggle}
      onToggleEarlier={() => {
        setActiveSec(2);
        toggleEarlier();
      }}
    />
  );
  const tail = (
    <div className={styles.tail}>
      <Skills skills={skills} active={activeSec === 3} reduce={reduce} />
      <div className={styles.foot}>
        <span suppressHydrationWarning>© {YEAR} danny hu · soft-boiled in waterloo</span>
        <span>
          [↑/↓] sections<Hint> · [?] all keys · [`] shell</Hint>
        </span>
      </div>
    </div>
  );
  const bottomBar = <BottomBar inert={popup} spark={spark} barRef={barRef} />;

  return (
    <>
      <div ref={rootRef} data-mode={mode} className={styles.root}>
        {mode === "gui" ? (
          <>
            {header}
            <main
              inert={popup}
              ref={contentRef}
              className={view ? `${styles.main} ${styles.mainDetail}` : styles.main}
              data-snap={view ? undefined : ""}
            >
              {view ? (
                <ProjectDetail
                  slug={view}
                  reduce={reduce}
                  onBack={goBack}
                  onOpen={(slug) => openProject(slug)}
                />
              ) : (
                <>
                  {hero}
                  {projectList}
                  {experience}
                  {tail}
                </>
              )}
            </main>
            {bottomBar}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {selName}
            </div>
            {termOpen && (
              <MiniShell
                inert={popup}
                session={sessions.embed}
                cwd={embedCwd}
                panelRef={embedPanelRef}
                bodyRef={embedBodyRef}
                inputRef={embedInputRef}
                onRun={(c) => run("embed", c)}
                onInput={(v) => patchSession("embed", { input: v })}
                onKey={(e) => shellKey("embed", e)}
                onClose={() => setTermOpen(false)}
              />
            )}
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            {help && (
              <HelpModal onClose={() => setHelp(false)} keysOn={keysOn} onToggleKeys={toggleKeys} />
            )}
          </>
        ) : (
          <Terminal
            session={sessions.term}
            cwd={termCwd}
            bodyRef={termBodyRef}
            inputRef={termInputRef}
            vim={vim}
            vimRef={vimRef}
            spark={spark}
            eggHandlers={egg.handlers}
            eggPreRef={termPreRef}
            eggFxRef={termFxRef}
            eggStatusRef={termStatusRef}
            running={termEggRunning}
            pressedTab={pressedTab}
            keysOn={keysOn}
            onShortcut={typeRun}
            onRun={(c) => run("term", c)}
            onInput={setTermInput}
            onKey={(e) => shellKey("term", e)}
            onExit={toGui}
          />
        )}
      </div>
      <Tooltip />
      <Cursor mode={mode} />
      <Intro reduce={reduce} rootRef={rootRef} />
    </>
  );
}
