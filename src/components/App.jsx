"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header/Header";
import Hint, { KeyLabel } from "@/components/Hint";
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
import MenuModal from "@/components/overlay/MenuModal";
import Intro from "@/components/overlay/Intro";
import { site } from "@/config/site";
import { ui } from "@/config/ui";
import { projects, projectFolders } from "@/data/projects";
import { skills, skillTotal } from "@/lib/shell";
import { spark } from "@/lib/github";
import { useShell } from "@/components/shell/useShell";
import { useTheme } from "@/lib/useTheme";
import { useKeysPref } from "@/lib/useKeysPref";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { openBuffer, vimKey as vimStep } from "@/lib/vim";
import { isPhone } from "@/lib/egg/screen";
import { scrollPageTo } from "@/lib/pageLock";
import { alignTarget, focusQuiet, freeNav, holdNav, keepAligned, parseLocation } from "@/lib/nav";
import { parsePath, projUrl } from "@/lib/urls";
import { useOnChange } from "@/lib/useOnChange";
import { BARS_MEASURED } from "@/lib/bars";
import { useProjectHistory } from "@/lib/useProjectHistory";
import { routeKey } from "@/lib/keyRouter";
import { selectionLabel, SKILL_NAMES } from "@/lib/selection";
import styles from "./App.module.css";

// Read once per page load, not per render (a render must not read the clock).
const YEAR = new Date().getFullYear();
// Keys that scroll the page natively; pressing one hands activeSec back to the scroll spy.
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", " "]);
// What the g / l / r shortcuts open.
const LINKS = { github: site.github.profile, linkedin: site.linkedin, resume: site.resume };

// A new tab. One for an address of ours (the resume page) keeps its opener, so it can close
// itself and land back on this tab (a browser implies noopener for a plain target=_blank);
// another site never gets a handle on this page.
const openTab = (href) =>
  window.open(
    href,
    "_blank",
    new URL(href, window.location.href).origin === window.location.origin ? undefined : "noopener",
  );

/** `initialView`: the project slug a /projects/<slug>/ page starts on (pre-rendered). */
export default function App({ initialView = null }) {
  const reduce = useReducedMotion();
  const [dark, setDark, toggleTheme] = useTheme();
  // Single-character shortcuts on/off (WCAG 2.1.4); Enter, Space, arrows and Esc always work.
  const [keysOn, setKeysOn, toggleKeys] = useKeysPref();
  const [mode, setMode] = useState("gui");
  const [filter, setFilter] = useState("all");
  // The skill whose "used in" panel shows ({ name, up }), or null (src/components/skills).
  const [skillOpen, setSkillOpen] = useState(null);
  const [view, setView] = useState(initialView);
  const [sel, setSel] = useState(-1);
  const [expSel, setExpSel] = useState(-1);
  const [skillSel, setSkillSel] = useState(-1); // the j/k stop in ~/skills (-1 = its header)
  const [expOpen, setExpOpen] = useState(-1);
  const [activeSec, setActiveSec] = useState(0);
  const [termOpen, setTermOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Every section's header is its first stop (it shows the blinking cursor); j/k then
  // move through its elements (selected = inverted, no cursor). Hero stops: the heading
  // ("head"), "more…" ("more"), the egg prompt ("egg"); Enter only plays the egg while
  // its prompt is selected. Work/experience use sel/expSel, with -1 = the header.
  const [heroSel, setHeroSel] = useState("head");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [vim, setVim] = useState(null);

  const egg = useEggGame({ clockMode: ui.eggClock, mode });

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
    termFrameRef,
    termBoxRef: termBodyRef,
  } = egg;
  const embedPanelRef = useRef(null),
    embedInputRef = useRef(null),
    termInputRef = useRef(null);
  const navLock = useRef({ on: false, t: 0, target: null }),
    vimReg = useRef(null),
    keyHandler = useRef(null),
    fxRef = useRef(null),
    focusHandler = useRef(null),
    navRef = useRef(null),
    barRef = useRef(null),
    scrollSpy = useRef(null),
    tabFocus = useRef(null), // the element the Tab key last moved focus to
    pointerHeld = useRef(false); // a mouse button is down (a press's focus is no reason to scroll)

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
    resetEgg: egg.reset,
    crackEgg: egg.crack,
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
    scrollPageTo(top, behavior);
  };

  // On a phone, park the egg panel's top under the nav, so the whole panel (it is as tall as
  // the band between the bars) is on screen for a round. Its own scroll-margin-top is the
  // nav's height, not a section jump's --nav-offset. Returns whether it scrolled.
  const unpark = useRef(null);
  const parkEgg = (behavior = smooth) => {
    const box = guiBoxRef.current;
    if (!box || !isPhone()) return false;
    const top = alignTarget(box);
    holdNav(navLock, 400, top);
    scrollPageTo(top, behavior);
    unpark.current?.();
    unpark.current = keepAligned(box, { smooth: behavior === "smooth" });
    return true;
  };

  // The egg wanted from a project page (the embedded shell's ./egg): when it was asked for
  // (0 = not asked), so it parks once the list, and with it the hero, is back (landOnList)
  // and a request that never landed can't misfire on a later jump home.
  const parkOnLand = useRef(0);

  // Leaving a project page for the section list ({ scrollTo }: the list position it was
  // opened from; { sec }: a section aligned under the nav). State first, from the leave
  // or Back/Forward itself: the active section, and a keyboard selection follows the
  // project last shown (←/→ may have moved on from the row that opened it).
  const leaveState = (land, prevSlug) => {
    if (land.sec != null) setActiveSec(land.sec);
    const row = list.findIndex((p) => p.slug === prevSlug);
    if (sel >= 0 && row >= 0) setSel(row);
  };
  // Then, once the list is back: scroll there (a restored position's scroll event lets the
  // spy pick the active section) and move focus, which was on the page that is gone, to
  // that project's row.
  const landOnList = (land, prevSlug) => {
    const park =
      land.sec === 0 && parkOnLand.current > 0 && performance.now() - parkOnLand.current < 2000;
    parkOnLand.current = 0;
    if (land.scrollTo != null) window.scrollTo({ top: land.scrollTo, behavior: "auto" });
    else if (!(park && parkEgg("auto"))) scrollSec(land.sec, "auto");
    // A project outside the current filter has no row: fall back to the selected one.
    const row = list.findIndex((p) => p.slug === prevSlug);
    const focusRow = row >= 0 ? row : sel;
    if (focusRow >= 0 && document.activeElement === document.body)
      focusQuiet(document.querySelector('[data-row="' + focusRow + '"]'));
  };

  // Back/Forward leaves any popup, the embedded shell and the rules card behind.
  const closeOverlays = () => {
    setHelp(false);
    setAboutOpen(false);
    setMenuOpen(false);
    setTermOpen(false);
    setRulesOpen(false);
  };

  const { openProject: openView, leaveProject } = useProjectHistory({
    view,
    setView,
    onLeave: leaveState,
    onLand: landOnList,
    onPop: closeOverlays,
  });

  const openProject = (slug) => {
    setRulesOpen(false);
    egg.release();
    // Stepping with ←/→ keeps a keyboard selection on the project being shown (←/→ walk
    // every project; one outside the current filter leaves the selection where it was).
    const row = list.findIndex((p) => p.slug === slug);
    if (view && sel >= 0 && row >= 0) setSel(row);
    openView(slug);
  };

  const goBack = () => leaveProject(1, "back");

  // Jump to section n, landing on its header unless `stop` names an element: a row
  // index for work (1) / experience (2), or a hero stop ("more" | "egg") for 0.
  const goSec = (n, stop) => {
    if (mode !== "gui") return;
    setActiveSec(n);
    setHeroSel(n === 0 && stop ? stop : "head");
    if (n === 1) setSel(stop ?? -1);
    if (n === 2) setExpSel(stop ?? -1);
    setSkillOpen(null);
    if (n === 3) setSkillSel(stop ?? -1);
    if (view) leaveProject(n);
    else {
      focusStop(n, stop ?? -1);
      scrollSec(n);
    }
  };

  // Focus follows the j/k selection (one point of focus, so Tab goes on from where the
  // selection is): the selected row of ~/projects, ~/experience or ~/skills takes real
  // focus, or the section's heading for a header stop. Quiet: no scroll, no focus ring. The
  // hero's stops stay a highlight read out by the live region.
  const focusStop = (sec, stop) => {
    if (sec < 1) return;
    const row =
      stop < 0
        ? null
        : document.querySelector(
            [
              '[data-row="' + stop + '"]',
              '[data-exprow="' + stop + '"] > button',
              '[data-skillrow="' + stop + '"]',
            ][sec - 1],
          );
    focusQuiet(row ?? document.querySelector('[data-sec="' + sec + '"] h2'));
  };

  // Into the selected skill's projects: the panel shows already, unless Esc put it away.
  const enterSkillPanel = () => {
    const row = document.querySelector('[data-skillrow="' + skillSel + '"]');
    const go = () =>
      row?.querySelector("[data-skill-panel] button")?.focus({ preventScroll: true });
    if (row?.querySelector("[data-skill-panel]")) return go();
    setSkillOpen({ name: SKILL_NAMES[skillSel] });
    requestAnimationFrame(go);
  };

  // A step between the panel's project buttons: `d.dir` (wrapping) or `d.to` "first" | "last".
  const stepPanel = (d) => {
    const at = document.activeElement,
      btns = [...(at?.closest("[data-skill-panel]")?.querySelectorAll("button") ?? [])];
    if (!btns.length) return;
    const i = d.to ? (d.to === "first" ? 0 : btns.length - 1) : btns.indexOf(at) + d.dir;
    btns[(i + btns.length) % btns.length].focus({ preventScroll: true });
  };

  // Esc with nothing left to close: the selection goes, and focus goes with it (to its
  // section's heading, when it sat on a row) so the two never split.
  const clearSelection = () => {
    const sec = document.activeElement
      ?.closest("[data-row], [data-exprow], [data-skillrow]")
      ?.closest("[data-sec]")?.dataset.sec;
    setSel(-1);
    setExpSel(-1);
    setSkillSel(-1);
    setSkillOpen(null);
    setHeroSel("head");
    if (sec) focusStop(+sec, -1);
  };

  // Selection follows focus, the other way: a row (or a section's heading) that takes focus,
  // by Tab or a click, becomes the j/k selection, so the two never drift apart. A skill's
  // panel opens only for a focus Tab made (tabFocus): focusQuiet (our own moves, and Esc's
  // return to the row) must not bring back a panel just put away.
  const followFocus = (t) => {
    if (!(t instanceof Element)) return;
    const skill = t.closest("[data-skillrow]"),
      row = t.closest("[data-row]"),
      role = t.closest("[data-exprow]"),
      head = t.matches("[data-sec] > h2") ? t.parentElement : null;
    if (skill) {
      const i = +skill.dataset.skillrow;
      setActiveSec(3);
      setSkillSel(i);
      if (t === skill && t === tabFocus.current) setSkillOpen({ name: SKILL_NAMES[i] });
    } else if (row) {
      setActiveSec(1);
      setSel(+row.dataset.row);
    } else if (role) {
      setActiveSec(2);
      setExpSel(+role.dataset.exprow);
    } else if (head && +head.dataset.sec >= 1) {
      const n = +head.dataset.sec;
      setActiveSec(n);
      if (n === 1) setSel(-1);
      if (n === 2) setExpSel(-1);
      if (n === 3) setSkillSel(-1);
    }
  };

  // The j/k stop `i` in ~/skills (-1 = the header): selected, focused, and its panel showing
  // (the keyboard form of hovering it). Focus first: the row it leaves closes its own panel.
  const selectSkill = (i) => {
    setActiveSec(3);
    setSkillSel(i);
    focusStop(3, i);
    setSkillOpen(i >= 0 ? { name: SKILL_NAMES[i] } : null);
  };

  // A project picked in a skill's panel: its row in the list, selected but not opened. A
  // folder filter that hides it goes back to all first.
  const jumpToProject = (slug) => {
    const hidden = !list.some((p) => p.slug === slug);
    if (hidden) setFilter("all");
    const row = (hidden ? projects : list).findIndex((p) => p.slug === slug);
    goSec(1, row);
    // The button that was clicked is gone with the panel: focus goes to the row it chose.
    requestAnimationFrame(() => focusQuiet(document.querySelector('[data-row="' + row + '"]')));
  };

  // Select a hero stop ("head" | "more" | "rules" | "egg"), making the hero the active
  // section. It doesn't scroll (goSec and goHome do).
  const selectHero = (stop) => {
    setActiveSec(0);
    setHeroSel(stop);
  };

  // "[h] ~/danny" and the h key: the hero, from anywhere (a project page included).
  const goHome = () => {
    if (view) leaveProject(0);
    else scrollSec(0);
    selectHero("head");
  };

  // Starting or advancing the egg puts the rules card away (it would sit over the pot).
  const startEgg = () => {
    // Starting a round parks the panel on a phone (tap or keyboard, since both come here); the
    // later presses (pull the eggs, play again) must not move the page: they are timed.
    if (egg.view.stage === 0) parkEgg();
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
    egg.release();
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
      if (fx.exp != null && fx.sec === 2) setExpSel(fx.exp);
      if (fx.filter) {
        setFilter(fx.filter);
        setSel(-1);
      }
    }
    if (fx.href) {
      if (fx.href.startsWith("mailto:")) window.location.assign(fx.href);
      else openTab(fx.href);
    }
    // A section the embedded shell went to (cd / cat …, or `./egg` → the hero with the
    // egg selected): scroll there, leaving an open project page first.
    const to = fx.sec0 ? 0 : k === "embed" && fx.sec != null && !fx.open ? fx.sec : null;
    if (fx.sec0) selectHero("egg");
    if (to != null) {
      // Only `./egg` wants the egg panel; `cd ~` and the like go to the top of the hero.
      if (view) {
        parkOnLand.current = fx.sec0 ? performance.now() : 0;
        leaveProject(to);
      } else setTimeout(() => (fx.sec0 && parkEgg()) || scrollSec(to), 50);
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

  // The facts of one keydown for the key router (src/lib/keyRouter.js decides): the key,
  // where focus is, and the page's state.
  const keyFacts = (e) => {
    const ae = document.activeElement,
      focused = ae && ae !== document.body ? ae : null,
      onControl = !!focused?.closest("a, button, summary, select"),
      eggRc = guiBoxRef.current?.getBoundingClientRect();
    return {
      key: e.key,
      repeat: e.repeat,
      shift: e.shiftKey,
      meta: e.metaKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      typing: !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"),
      onButton: !!focused?.closest("a, button"),
      onControl,
      tabFocused: onControl && ae === tabFocus.current,
      selectionCollapsed: window.getSelection()?.isCollapsed ?? true,
      mode,
      vim: !!vim,
      help,
      aboutOpen,
      menuOpen,
      termOpen,
      skillOpen: !!skillOpen,
      skillSel,
      inSkillPanel: !!focused?.closest("[data-skill-panel]"),
      keysOn,
      view,
      viewIdx: projects.findIndex((p) => p.slug === view),
      projectCount: projects.length,
      activeSec,
      heroSel,
      sel,
      expSel,
      expOpen,
      rulesOpen,
      rulesSeen: egg.view.rulesSeen,
      briefing: egg.view.briefing,
      eggOnScreen: !!eggRc && eggRc.bottom > 80 && eggRc.top < window.innerHeight - 80,
      listLength: list.length,
      filterIdx: projectFolders.indexOf(filter),
      folderCount: projectFolders.length,
    };
  };

  // Carries out the router's decision. No conditions on the page's state here: those are
  // the router's (a different situation is a different decision).
  const applyKey = (d, e) => {
    if (!d) return;
    if (d.blur) document.activeElement?.blur();
    if (d.prevent) e.preventDefault();
    if (d.flashSelected) pressFx(document.querySelector(d.flashSelected));
    switch (d.do) {
      case "vim":
        vimKey(e);
        break;
      case "termShell":
        termInputRef.current?.focus({ preventScroll: true });
        shellKey("term", e);
        break;
      case "focusTerm":
        termInputRef.current?.focus({ preventScroll: true });
        break;
      case "scrollPopup": {
        // Lines (±1), pages (±2) or the ends (±3) of the popup's list.
        const box = document.querySelector("[data-popup-scroll]"),
          n = Math.abs(d.dir);
        if (box)
          box.scrollBy({
            top: d.dir * (n === 3 ? box.scrollHeight : n === 2 ? box.clientHeight * 0.45 : 40),
          });
        break;
      }
      case "toggleShell":
        setTermOpen((o) => !o);
        break;
      case "closeSkill": {
        // Focus inside the panel would vanish with it: hand it to the skill's row, quietly
        // (a focus ring there would only open the panel again).
        const row = document.activeElement?.closest?.("[data-skill]");
        setSkillOpen(null);
        focusQuiet(row);
        break;
      }
      case "toggleKeys":
        toggleKeys();
        break;
      case "focusEmbed":
        embedInputRef.current?.focus({ preventScroll: true });
        if (d.enter) shellKey("embed", e);
        break;
      case "resetEgg":
        egg.reset();
        break;
      case "proceedRules":
        selectHero("egg");
        startEgg();
        break;
      case "startEgg":
        startEgg();
        break;
      case "openAbout":
        setAboutOpen(true);
        break;
      case "toggleRules":
        setRulesOpen((o) => !o);
        break;
      case "openProject":
        openProject(list[d.row].slug);
        break;
      case "openProjectIdx":
        openProject(projects[d.idx].slug);
        break;
      case "setExpOpen":
        setExpOpen(d.i);
        break;
      case "closeHelp":
        setHelp(false);
        break;
      case "closeAbout":
        setAboutOpen(false);
        break;
      case "closeMenu":
        setMenuOpen(false);
        break;
      case "closeRules":
        setRulesOpen(false);
        break;
      case "closeShell":
        setTermOpen(false);
        break;
      case "goBack":
        goBack();
        break;
      case "collapseExp":
        setExpOpen(-1);
        break;
      case "clearSelection":
        clearSelection();
        break;
      case "toggleHelp":
        setMenuOpen(false);
        setAboutOpen(false);
        setHelp((h) => !h);
        break;
      case "toggleAbout":
        setMenuOpen(false);
        setHelp(false);
        setAboutOpen((o) => !o);
        break;
      case "toggleTheme":
        toggleTheme();
        break;
      case "goHome":
        goHome();
        break;
      case "goSec":
        goSec(d.n, d.stop);
        break;
      case "selectHero":
        selectHero(d.heroSel);
        break;
      case "selectRow":
        setSel(d.sel);
        focusStop(1, d.sel);
        break;
      case "selectExp":
        setExpSel(d.expSel);
        focusStop(2, d.expSel);
        break;
      case "selectSkill":
        selectSkill(d.skillSel);
        break;
      case "enterSkillPanel":
        enterSkillPanel();
        break;
      case "panelStep":
        stepPanel(d);
        break;
      case "setFilter":
        setFilter(projectFolders[d.idx]);
        setSel(-1);
        break;
      case "mail":
        window.location.assign("mailto:" + site.email);
        break;
      case "openLink":
        openTab(LINKS[d.link]);
        break;
    }
    // A shortcut with a visible button (header, bottom bar, hero, project page, dialog
    // close) flashes it; the last match is the topmost (dialogs render after the page).
    if (d.flashKey) {
      const keyed = document.querySelectorAll('[data-key="' + CSS.escape(d.flashKey) + '"]');
      pressFx(keyed[keyed.length - 1]);
    }
  };

  const handleKey = (e) => applyKey(routeKey(keyFacts(e)), e);

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
    focusHandler.current = followFocus;
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
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollEv, { passive: true });
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
    // Remember what Tab focused (the router's `tabbed`, src/lib/keyRouter.js); a click or
    // script focus clears it.
    let tabbing = false;
    const onAnyKey = (e) => {
      tabbing = e.key === "Tab";
    };
    const onPointer = () => {
      tabbing = false;
      pointerHeld.current = true;
    };
    const onPointerEnd = () => {
      pointerHeld.current = false;
    };
    const onFocusIn = (e) => {
      tabFocus.current = tabbing ? e.target : null;
      focusHandler.current?.(e.target);
    };
    window.addEventListener("keydown", onAnyKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("pointerup", onPointerEnd, true);
    window.addEventListener("pointercancel", onPointerEnd, true);
    window.addEventListener("focusin", onFocusIn);
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
        if (!parsePath(window.location.pathname, "").slug)
          history.replaceState(history.state, "", projUrl(r.slug));
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
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("pointerdown", onPress);
      window.removeEventListener("keydown", onAnyKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("pointerup", onPointerEnd, true);
      window.removeEventListener("pointercancel", onPointerEnd, true);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("click", onKeyClick, true);
      freeNav(navLock, true); // quietly: the sections are unmounting too
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
    // Anything measuring the band between them (src/lib/bars.js) measures again.
    const measure = () => {
      bars.forEach(
        ([r, v]) =>
          r.current && root.style.setProperty(v, r.current.getBoundingClientRect().height + "px"),
      );
      window.dispatchEvent(new Event(BARS_MEASURED));
    };
    const ro = new ResizeObserver(measure);
    bars.forEach(([r]) => r.current && ro.observe(r.current));
    measure();
    // Terminal mode has no bars: the properties go with them (html's scroll-padding-bottom
    // reads --bar-h, and would keep a padding for a bar that isn't there).
    return () => {
      ro.disconnect();
      bars.forEach(([, v]) => root.style.removeProperty(v));
    };
  }, [mode]);

  // The menu popup stands in for the nav's buttons under 600px (Header.module.css); when
  // the window grows past that they're back (behind the inert page), so the menu goes.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const onChange = () => {
      if (!mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
    // Under a held mouse press the row is already under the pointer: scrolling it away would
    // lose the click.
    if (!row || pointerHeld.current) return;
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
    // Closed: useProjectHistory lands the list (landOnList), with no scroll animation.
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
  useOnChange(skillSel, () => skillSel >= 0 && ensureVisible('[data-skillrow="' + skillSel + '"]'));

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
  const popup = help || aboutOpen || menuOpen;
  // The j/k selection is shown by colour only, so it's also read out (a polite live region).
  // The rows of the other sections take focus and carry their own names, so only the hero's
  // stops are read out here.
  const selName = selectionLabel({ mode, view, activeSec, heroSel });

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
      menuOpen={menuOpen}
      onHome={goHome}
      onSection={goSec}
      onShell={() => setTermOpen((o) => !o)}
      onTheme={toggleTheme}
      onHelp={() => setHelp((h) => !h)}
      onMenu={() => setMenuOpen(true)}
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
      held={egg.held}
      keysOn={keysOn}
      onRules={() => {
        selectHero("rules");
        setRulesOpen((o) => !o);
      }}
      announceRef={guiAnnounceRef}
      onSelectEgg={() => selectHero("egg")}
      onStart={() => {
        selectHero("egg");
        startEgg();
      }}
      onMore={() => {
        selectHero("more");
        setAboutOpen(true);
      }}
    />
  );
  const projectList = (
    <ProjectList
      list={list}
      filter={filter}
      sel={sel}
      active={activeSec === 1}
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
      active={activeSec === 2}
      onToggle={(i) => {
        setExpSel(i);
        setActiveSec(2);
        setExpOpen(expOpen === i ? -1 : i);
      }}
    />
  );
  const tail = (
    <div className={styles.tail}>
      <Skills
        skills={skills}
        total={skillTotal}
        active={activeSec === 3}
        open={skillOpen}
        skillSel={skillSel}
        onOpen={setSkillOpen}
        onProject={jumpToProject}
      />
      <div className={styles.foot}>
        <span suppressHydrationWarning>© {YEAR} danny hu · ontario, canada</span>
        <KeyLabel>
          [↑/↓] sections<Hint> · [?] all keys · [`] shell</Hint>
        </KeyLabel>
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
            >
              {view ? (
                <ProjectDetail slug={view} onBack={goBack} onOpen={(slug) => openProject(slug)} />
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
                panelRef={embedPanelRef}
                inputRef={embedInputRef}
                onRun={(c) => run("embed", c)}
                onInput={(v) => patchSession("embed", { input: v })}
                onKey={(e) => shellKey("embed", e)}
                onClose={() => setTermOpen(false)}
              />
            )}
            {menuOpen && (
              <MenuModal
                dark={dark}
                shellOpen={termOpen}
                onClose={() => setMenuOpen(false)}
                onShell={() => {
                  setMenuOpen(false);
                  setTermOpen((o) => !o);
                }}
                onTheme={() => {
                  setMenuOpen(false);
                  toggleTheme();
                }}
                onHelp={() => {
                  setMenuOpen(false);
                  setHelp(true);
                }}
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
            bodyRef={termBodyRef}
            inputRef={termInputRef}
            vim={vim}
            vimRef={vimRef}
            spark={spark}
            eggHandlers={egg.handlers}
            eggPreRef={termPreRef}
            eggFxRef={termFxRef}
            eggStatusRef={termStatusRef}
            eggFrameRef={termFrameRef}
            eggTouch={{
              held: egg.held,
              stage: egg.view.stage,
              enter: egg.view.enter,
              prompt: egg.view.prompt,
              play: egg.crack,
              quit: quitEgg,
              release: egg.release,
            }}
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
      <Intro rootRef={rootRef} />
    </>
  );
}
