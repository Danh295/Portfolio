// Browser check: drives the built site (out/) in headless Chrome and checks what unit tests
// can't reach: when sections type in, the intro, a smoke run of the main features, and
// reduced motion. Local only (not in pages.yml): it's timing-sensitive and needs Chrome.
//
// Usage: npm run build && npm run check:browser
//   ONLY=smoke               only the cases whose title contains this
//   CHROME=/path/to/chrome   another Chrome/Chromium binary (default: the macOS app, then
//                            google-chrome / chromium on PATH)
//
// No dependencies: a node:http server serves out/ at /Portfolio/ (unknown paths get
// 404.html, like GitHub Pages), and Chrome is driven over the DevTools protocol with
// Node's own WebSocket. Every case runs in a fresh tab, so the intro, sessionStorage and
// the played type-ins start over. Exits 1 on any failed check or console error.

import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const BASE = "/Portfolio/";
const DESKTOP = { width: 1291, height: 808 };
const PHONE = { width: 390, height: 844 };
// Tall enough that skills peeks well over START_PX below experience after a jump to it, so
// "a section peeking below a jump waits" is actually tested (at 808px it peeks only ~72px).
const TALL = { width: 1291, height: 1000 };
// The keys the cases press: key → [code, windowsVirtualKeyCode].
const KEY = {
  Enter: ["Enter", 13],
  Escape: ["Escape", 27],
  Tab: ["Tab", 9],
  " ": ["Space", 32],
  "`": ["Backquote", 192],
  "?": ["Slash", 191],
  2: ["Digit2", 50],
  3: ["Digit3", 51],
  j: ["KeyJ", 74],
  t: ["KeyT", 84],
};
// Page-side expressions: the nav button whose label includes `label`; the hero's heading
// as typed so far, and in full (its aria-label, src/data/home.js `heading`).
const navButton = (label) =>
  `[...document.querySelectorAll('nav button, nav a')].find(b=>b.textContent.includes('${label}'))`;
const H1_TEXT = `document.querySelector('h1').textContent.trim()`;
const H1_FULL = `document.querySelector('h1').ariaLabel`;

if (!existsSync(join(OUT, "index.html"))) {
  console.error("out/ has no build: run `npm run build` first.");
  process.exit(1);
}

/* ---------- static server ---------- */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};
const fileFor = (path) => {
  const rel = decodeURIComponent(path.slice(BASE.length)).replace(/\.\.+/g, "");
  for (const c of [rel, join(rel, "index.html"), rel.replace(/\/$/, "") + ".html"]) {
    const f = join(OUT, c);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
};
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  const file = path.startsWith(BASE) ? fileFor(path) : null;
  const body = readFileSync(file ?? join(OUT, "404.html"));
  res.writeHead(file ? 200 : 404, { "content-type": TYPES[extname(file ?? ".html")] ?? "" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const SITE = `http://127.0.0.1:${server.address().port}${BASE}`;

/* ---------- Chrome over the DevTools protocol ---------- */

const findChrome = () => {
  if (process.env.CHROME) return process.env.CHROME;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execFileSync("which", [name]).toString().trim();
    } catch {
      // not on PATH
    }
  }
  throw new Error("no Chrome found: set CHROME=/path/to/chrome");
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "browser-check-"));
const chrome = spawn(
  findChrome(),
  ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run"],
  { stdio: "ignore" },
);
let browserWs = null;
for (let i = 0; i < 100 && !browserWs; i++) {
  await sleep(100);
  const portFile = join(profile, "DevToolsActivePort");
  if (existsSync(portFile)) {
    const [port, path] = readFileSync(portFile, "utf8").trim().split("\n");
    if (port && path) browserWs = `ws://127.0.0.1:${port}${path}`;
  }
}
if (!browserWs) throw new Error("Chrome didn't start");
const ws = new WebSocket(browserWs);
await new Promise((r, j) => {
  ws.addEventListener("open", r);
  ws.addEventListener("error", j);
});

let nextId = 0;
const waiting = new Map(),
  listeners = new Set();
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  } else listeners.forEach((l) => l(msg));
});
const cdp = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const id = ++nextId;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

/** A fresh tab with helpers; `errors` collects exceptions and console errors. */
async function openTab({ width, height, mobile = false, reducedMotion = false }) {
  const { result } = await cdp("Target.createTarget", { url: "about:blank" });
  const targetId = result.targetId;
  const { result: att } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  const sid = att.sessionId;
  const send = (method, params) => cdp(method, params, sid);
  const errors = [];
  const onEvent = (msg) => {
    if (msg.sessionId !== sid) return;
    if (msg.method === "Runtime.exceptionThrown")
      errors.push(msg.params.exceptionDetails.exception?.description?.split("\n")[0]);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error")
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  };
  listeners.add(onEvent);
  await send("Runtime.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  if (mobile)
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (reducedMotion)
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.result?.exceptionDetails)
      throw new Error("page script failed: " + expression.slice(0, 60));
    return r.result?.result?.value;
  };
  const sendKey = (type, key) => {
    if (!KEY[key]) throw new Error("no KEY entry for " + JSON.stringify(key));
    const [code, keyCode] = KEY[key];
    return send("Input.dispatchKeyEvent", {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      text: type === "keyDown" && key.length === 1 ? key : undefined,
    });
  };
  const tab = {
    errors,
    width,
    height,
    send,
    evaluate,
    go: async (path, wait = 2500) => {
      await send("Page.navigate", { url: SITE + path });
      await sleep(wait);
    },
    // Presses `key` (a KEY entry): down, then up. keyDown/keyUp send one half.
    keyDown: (key) => sendKey("keyDown", key),
    keyUp: (key) => sendKey("keyUp", key),
    key: async (key) => {
      await sendKey("keyDown", key);
      await sendKey("keyUp", key);
      await sleep(150);
    },
    // A trackpad-like scroll (touch gestures under ~30px get eaten by touch slop).
    gesture: (dy) =>
      send("Input.synthesizeScrollGesture", {
        x: Math.round(width / 2),
        y: Math.round(height / 2),
        yDistance: -dy,
        speed: 1200,
        gestureSourceType: "touch",
        preventFling: true,
      }),
    // Clicks the element `findExpr` finds: its centre, or `fromLeft` px in from its left.
    click: async (findExpr, fromLeft) => {
      const p = await evaluate(
        `(()=>{const e=${findExpr};if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+(${fromLeft ?? "r.width/2"}),y:r.y+r.height/2}})()`,
      );
      if (!p) return false;
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", {
          type,
          ...p,
          button: "left",
          buttons: type === "mousePressed" ? 1 : 0,
          clickCount: 1,
        });
      return true;
    },
    // A finger tap on the element `findExpr` finds (touch emulation is on for the phone).
    tap: async (findExpr) => {
      const p = await evaluate(
        `(()=>{const e=${findExpr};if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      );
      if (!p) return false;
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      return true;
    },
    typeIn: (n) => evaluate(`document.querySelector('[data-sec="${n}"]').dataset.fx || "started"`),
    top: (n) =>
      evaluate(
        `Math.round(document.querySelector('[data-sec="${n}"]').getBoundingClientRect().top)`,
      ),
    // The band between the nav and the bottom bar, where a jump parks a header, and the
    // offset a scroll needs before a section starts (START_PX in src/lib/useTextFx.js).
    band: () =>
      evaluate(`(()=>{const cs=getComputedStyle(document.documentElement),
        nav=Math.ceil(parseFloat(cs.getPropertyValue('--nav-h'))||56),
        bar=Math.ceil(parseFloat(cs.getPropertyValue('--bar-h'))||40);
        return {nav,bar,bottom:innerHeight-bar,
          parked:Math.round(parseFloat(getComputedStyle(document.querySelector('[data-sec="1"]')).scrollMarginTop)),
          off:Math.max(0,Math.min(120,Math.floor((innerHeight-nav-bar)/4)))}})()`),
    // Stamps when (ms since the stamp) and where (frame top) each waiting frame starts.
    watchStarts: () =>
      evaluate(`(()=>{window.__t0=performance.now();window.__at={};
        document.querySelectorAll('[data-sec]').forEach(f=>{if(!f.dataset.fx)return;
          new MutationObserver((m,o)=>{if(!f.dataset.fx){__at[f.dataset.sec]={ms:Math.round(performance.now()-__t0),top:Math.round(f.getBoundingClientRect().top)};o.disconnect()}})
            .observe(f,{attributes:true,attributeFilter:['data-fx']})})})()`),
    startedAt: (n) => evaluate(`window.__at && window.__at['${n}'] || null`),
    close: async () => {
      listeners.delete(onEvent);
      await cdp("Target.closeTarget", { targetId });
    },
  };
  // Put section n's top `px` above the bottom bar, arriving by a real gesture so the page
  // counts it as the visitor's own scroll.
  tab.showTop = async (n, px) => {
    const band = await tab.band();
    await evaluate(
      `scrollTo(0, Math.round(document.querySelector('[data-sec="${n}"]').getBoundingClientRect().top + scrollY - ${band.bottom} + ${px} - 80))`,
    );
    await sleep(300);
    await tab.gesture(80);
    await sleep(900);
  };
  return tab;
}

/* ---------- checks ---------- */

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}${ok || detail === undefined ? "" : "  " + JSON.stringify(detail)}`,
  );
};
const quick = (at) => at !== null && at.ms <= 120;

async function run(title, view, body) {
  if (process.env.ONLY && !title.includes(process.env.ONLY)) return;
  console.log(`\n${title}`);
  const tab = await openTab(view);
  try {
    await body(tab);
  } catch (e) {
    check("ran without error", false, String(e));
  }
  check("no console errors", tab.errors.length === 0, tab.errors.slice(0, 3));
  await tab.close();
}

await run("type-in on scroll (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  const band = await tab.band();
  await tab.showTop(1, band.off - 50);
  const before = await tab.typeIn(1);
  await tab.gesture(100);
  await sleep(900);
  check(
    `projects waits under ${band.off}px shown, then types in past it`,
    before === "pending" && (await tab.typeIn(1)) === "started",
    { before },
  );
  await tab.showTop(3, band.off - 50);
  const skills = await tab.typeIn(3);
  await tab.gesture(100);
  await sleep(900);
  check(
    "skills waits, then types in",
    skills === "pending" && (await tab.typeIn(3)) === "started",
    {
      skills,
    },
  );
});

await run("type-in scrolling up (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#skills");
  const band = await tab.band();
  const bottom = () =>
    tab.evaluate(
      `Math.round(document.querySelector('[data-sec="2"]').getBoundingClientRect().bottom)`,
    );
  // Its bottom 80px short of (off - 50) below the nav; the gesture up adds the 80.
  await tab.evaluate(`scrollTo(0, scrollY + ${await bottom()} - ${band.nav + band.off - 50 - 80})`);
  await sleep(300);
  await tab.gesture(-80);
  await sleep(900);
  const before = await tab.typeIn(2);
  await tab.gesture(-100);
  await sleep(900);
  check(
    "experience waits until its bottom clears the nav by the offset",
    before === "pending" && (await tab.typeIn(2)) === "started",
    { before },
  );
});

await run("type-in after skipping the intro (1291×808)", DESKTOP, async (tab) => {
  await tab.go("", 1200);
  await tab.key("Enter");
  await sleep(1200);
  const band = await tab.band();
  await tab.showTop(1, band.off + 60);
  check(
    "keyboard mode from the skip doesn't stop a scroll's type-in",
    (await tab.typeIn(1)) === "started",
  );
});

await run("type-in on Space (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.key(" ");
  await sleep(1000);
  check("Space scrolls projects in and it types in", (await tab.typeIn(1)) === "started");
});

await run("type-in on a nav click (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.watchStarts();
  const clicked = await tab.click(navButton("skills"));
  await sleep(1800);
  check("skills (the target) types in", clicked && (await tab.startedAt(3)) !== null);
  check(
    "projects and experience (flown past) wait",
    (await tab.typeIn(1)) === "pending" && (await tab.typeIn(2)) === "pending",
  );
  await tab.gesture(-400);
  await sleep(900);
  check("scrolling back up types experience in", (await tab.typeIn(2)) === "started");
});

const keyboardJumps = async (tab) => {
  await tab.go("#home");
  await tab.key("j");
  await tab.key("j");
  await tab.watchStarts();
  await tab.key("j");
  await sleep(1200);
  check(
    "j onto projects types it in right away",
    quick(await tab.startedAt(1)),
    await tab.startedAt(1),
  );
  await tab.watchStarts();
  await tab.key("2");
  await sleep(1500);
  check("2 types experience in right away", quick(await tab.startedAt(2)), await tab.startedAt(2));
  check("skills peeking below experience waits", (await tab.typeIn(3)) === "pending");
  for (let i = 0; i < 5; i++) {
    await tab.key("j");
    await sleep(150);
  }
  await sleep(900);
  check("j down every role: skills still waits", (await tab.typeIn(3)) === "pending");
  await tab.watchStarts();
  await tab.key("j");
  await sleep(1200);
  check(
    "j onto skills types it in right away",
    quick(await tab.startedAt(3)),
    await tab.startedAt(3),
  );
};
await run("type-in on keyboard jumps (1291×808)", DESKTOP, keyboardJumps);
await run("type-in on keyboard jumps (1291×1000)", TALL, keyboardJumps);

await run("type-in on focus (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  let sec = "-";
  for (let i = 0; i < 40 && sec !== "1"; i++) {
    await tab.key("Tab");
    sec = await tab.evaluate(
      `(document.activeElement.closest('[data-sec]') || {}).dataset?.sec ?? "-"`,
    );
  }
  await sleep(300);
  check(
    "Tab into a project row types projects in",
    sec === "1" && (await tab.typeIn(1)) === "started",
    {
      sec,
    },
  );
});

// A tab of its own: a second go("#home") in the same tab only changes the hash, so the page
// (and what has already typed in) wouldn't start over.
await run("type-in on the shell's cd (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.watchStarts();
  await tab.key("`");
  await sleep(500);
  await tab.send("Input.insertText", { text: "cd experience" });
  await tab.key("Enter");
  await sleep(1800);
  check(
    "the shell's cd types experience in, projects (flown past) waits",
    (await tab.startedAt(2)) !== null && (await tab.typeIn(1)) === "pending",
  );
});

await run("type-in under a wrapped bottom bar (resized to 480px)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.send("Emulation.setDeviceMetricsOverride", {
    width: 480,
    height: DESKTOP.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(800);
  await tab.showTop(3, -10);
  check("skills still under the taller bar waits", (await tab.typeIn(3)) === "pending", {
    top: await tab.top(3),
  });
});

await run("phone (390×844, touch)", { ...PHONE, mobile: true }, async (tab) => {
  await tab.go("#home");
  const hero = () =>
    tab.evaluate(
      `Math.round(document.querySelector('[data-sec="0"]').getBoundingClientRect().height)`,
    );
  const h0 = await hero();
  const band = await tab.band();
  const tapped = await tab.tap(navButton("skills"));
  await sleep(2000);
  check("the nav button takes a tap", tapped && (await tab.top(3)) < band.parked + 200);
  check("the hero keeps its height when the selection leaves it", (await hero()) === h0, {
    before: h0,
    after: await hero(),
  });
  const top = await tab.top(3);
  check(
    "a nav tap parks skills under the nav and types it in",
    Math.abs(top - band.parked) <= 3 && (await tab.typeIn(3)) === "started",
    { top, parked: band.parked },
  );
});

// How much of the screen the intro's reveal still covers (0 once it's done).
const COVERED = `(()=>{const c=document.querySelector('[data-reveal-cover]');const a=c&&c.getAnimations().find(x=>x.playState==='running');
  if(!a)return c?innerHeight:0;const n=+(String(a.effect.getTiming().easing).match(/steps\\((\\d+)/)||[0,1])[1];
  return Math.round(innerHeight*(1-Math.floor(a.effect.getComputedTiming().progress*n)/n))})()`;
const waitForCover = async (tab) => {
  for (let i = 0; i < 300; i++) {
    if (await tab.evaluate("!!document.querySelector('[data-reveal-cover]')")) return true;
    await sleep(20);
  }
  return false;
};

await run("intro (1291×808)", DESKTOP, async (tab) => {
  await tab.go("", 0);
  const appeared = await waitForCover(tab);
  const covered = await tab.evaluate(COVERED);
  await sleep(800);
  check(
    "the reveal uncovers the screen, then goes",
    appeared && covered > 0 && (await tab.evaluate(COVERED)) === 0,
    { appeared, covered },
  );
  await sleep(1500);
  check(
    "the heading types in after it",
    (await tab.evaluate(H1_TEXT)) === (await tab.evaluate(H1_FULL)),
  );
});

await run("intro skipped with Enter (1291×808)", DESKTOP, async (tab) => {
  await tab.go("", 900);
  const playing = await tab.evaluate("!!document.documentElement.dataset.loading");
  await tab.key("Enter");
  await sleep(1600);
  check(
    "Enter skips it and the heading types in",
    playing && (await tab.evaluate(H1_TEXT)) === (await tab.evaluate(H1_FULL)),
    { playing },
  );
});

// A fast scroll as the reveal starts, and again mid-sweep (it uncovers the screen in ~0.3s).
for (const after of [0, 150])
  await run(`scrolling ${after}ms into the intro's reveal (1291×808)`, DESKTOP, async (tab) => {
    await tab.go("", 0);
    await waitForCover(tab);
    await sleep(after);
    await tab.send("Input.synthesizeScrollGesture", {
      x: 640,
      y: 500,
      yDistance: -1200,
      speed: 3000,
      gestureSourceType: "touch",
      preventFling: true,
    });
    const covered = await tab.evaluate(COVERED);
    check("a fast scroll never runs into unrevealed page", covered === 0, {
      covered,
      y: await tab.evaluate("Math.round(scrollY)"),
    });
  });

await run("smoke (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#projects");
  await tab.gesture(120);
  await sleep(600);
  const y0 = await tab.evaluate("Math.round(scrollY)");
  await tab.click(`document.querySelector('[data-row="1"]')`, 30);
  await sleep(1200);
  const opened =
    (await tab.evaluate("location.pathname")).includes("/projects/") &&
    (await tab.evaluate("!!document.querySelector('[data-detail-title]')"));
  await tab.key("Escape");
  await sleep(1500);
  const y1 = await tab.evaluate("Math.round(scrollY)");
  check(
    "a project opens, and Esc comes back to the same list position",
    opened && Math.abs(y1 - y0) <= 2,
    { opened, y0, y1 },
  );
  const theme = await tab.evaluate("document.documentElement.dataset.theme");
  await tab.key("t");
  check(
    "t switches the theme",
    (await tab.evaluate("document.documentElement.dataset.theme")) !== theme,
  );
  await tab.key("t");
  await tab.key("?");
  await sleep(300);
  const popup = await tab.evaluate("!!document.querySelector('[role=dialog]')");
  await tab.key("Escape");
  await sleep(300);
  check(
    "? opens the keys popup and Esc closes it",
    popup && !(await tab.evaluate("!!document.querySelector('[role=dialog]')")),
  );
  await tab.key("`");
  await sleep(400);
  await tab.send("Input.insertText", { text: "./app --mode terminal" });
  await tab.key("Enter");
  await sleep(1200);
  const mode = () => tab.evaluate("document.querySelector('[data-mode]')?.dataset.mode");
  const term = await mode();
  await tab.send("Input.insertText", { text: "exit" });
  await tab.key("Enter");
  await sleep(1200);
  check("terminal mode opens and exit comes back", term === "term" && (await mode()) === "gui", {
    term,
  });
  await tab.go("projects/recall/");
  check(
    "a project deep link shows the project",
    await tab.evaluate("!!document.querySelector('[data-detail-title]')"),
  );
  await tab.go("nope/", 1500);
  check(
    "an unknown path shows the 404",
    /nope/.test(await tab.evaluate("document.body.innerText")),
  );
  await tab.go("#home", 3000);
  const egg = await tab.click(
    `[...document.querySelectorAll('button')].find(b=>/to start/.test(b.textContent))`,
  );
  await sleep(800);
  check(
    "the egg's start box starts a round",
    egg &&
      !(await tab.evaluate(
        `[...document.querySelectorAll('button')].some(b=>/to start/.test(b.textContent))`,
      )),
  );
});

// Reduced motion reduces, it doesn't remove: text still types in, carets blink, the egg
// plays and presses flash; what moves across the screen calms (no reveal sweep, instant
// jumps).
const REDUCED = { ...DESKTOP, reducedMotion: true };

await run("reduced motion: the intro (1291×808)", REDUCED, async (tab) => {
  await tab.go("", 900);
  const booting = await tab.evaluate("!!document.documentElement.dataset.loading");
  let cover = false;
  for (let i = 0; i < 200 && !cover; i++) {
    cover = await tab.evaluate("!!document.querySelector('[data-reveal-cover]')");
    if (await tab.evaluate("!document.documentElement.dataset.loading")) break;
    await sleep(25);
  }
  // Typing, not just shown: some sample catches the heading part-way.
  const full = await tab.evaluate(H1_FULL),
    seen = new Set();
  for (let i = 0; i < 120; i++) {
    seen.add(await tab.evaluate(H1_TEXT));
    await sleep(25);
  }
  const partway = [...seen].some((s) => s && s !== full);
  check("the boot log still plays", booting);
  check("but the page is uncovered at once (no reveal sweep)", !cover);
  check("and the heading types in after it", partway && seen.has(full), [...seen].slice(0, 4));
});

await run("reduced motion: the page (1291×808)", REDUCED, async (tab) => {
  await tab.go("#home");
  const egg = () => tab.evaluate(`document.querySelector('[data-sec="0"] pre')?.textContent ?? ""`);
  const e0 = await egg();
  await sleep(600);
  check("the egg keeps moving", e0 !== "" && (await egg()) !== e0);
  const caret = await tab.evaluate(
    `getComputedStyle(document.querySelector('h1'), '::after').animationName`,
  );
  check("the selected header's caret blinks", caret && caret !== "none", { caret });
  await tab.keyDown("t");
  const flashed = await tab.evaluate(`!!document.querySelector('[data-pressed]')`);
  await tab.keyUp("t");
  check("a key press flashes its button", flashed);
  const band = await tab.band();
  const before = await tab.typeIn(1);
  await tab.showTop(1, band.off + 60);
  check(
    "a section types in on scroll",
    before === "pending" && (await tab.typeIn(1)) === "started",
    {
      before,
    },
  );
  // Time from the key to skills parked, measured in the page.
  await tab.evaluate(`(()=>{window.__jumpMs=null;addEventListener('keydown',()=>{const s=performance.now(),
    f=document.querySelector('[data-sec="3"]');(function step(){
    if(Math.abs(f.getBoundingClientRect().top-${band.parked})<=2)__jumpMs=Math.round(performance.now()-s);
    else if(performance.now()-s<1500)requestAnimationFrame(step)})()},{once:true,capture:true})})()`);
  await tab.key("3");
  await sleep(600);
  const ms = await tab.evaluate("window.__jumpMs");
  check("a jump is instant (parked within 50ms of the key)", ms !== null && ms <= 50, { ms });
});

/* ---------- done ---------- */

ws.close();
const exited = new Promise((r) => chrome.once("exit", r));
chrome.kill();
await exited;
server.close();
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
