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
import { inflateSync } from "node:zlib";
import { extname, join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
const BASE = "/Portfolio/";
const DESKTOP = { width: 1291, height: 808 };
const PHONE = { width: 390, height: 844 };
// Tall enough that skills peeks well over START_PX below experience after a jump to it, so
// "a section peeking below a jump waits" is actually tested (at 808px it peeks only ~72px).
const TALL = { width: 1291, height: 1000 };
// How much of a section must show before a scroll starts it, read from the source (this
// script can't import the app's modules) so the two can't drift apart.
const START_PX = Number(
  readFileSync(new URL("../src/lib/useTextFx.js", import.meta.url), "utf8").match(
    /const START_PX = (\d+);/,
  )?.[1],
);
if (!Number.isFinite(START_PX)) throw new Error("START_PX not found in src/lib/useTextFx.js");
// The keys the cases press: key → [code, windowsVirtualKeyCode].
const KEY = {
  Enter: ["Enter", 13],
  Escape: ["Escape", 27],
  Tab: ["Tab", 9],
  ArrowUp: ["ArrowUp", 38],
  ArrowDown: ["ArrowDown", 40],
  ArrowRight: ["ArrowRight", 39],
  " ": ["Space", 32],
  "`": ["Backquote", 192],
  "?": ["Slash", 191],
  2: ["Digit2", 50],
  3: ["Digit3", 51],
  j: ["KeyJ", 74],
  k: ["KeyK", 75],
  t: ["KeyT", 84],
  "+": ["Equal", 187],
  "-": ["Minus", 189],
  0: ["Digit0", 48],
  g: ["KeyG", 71],
  r: ["KeyR", 82],
};
// Page-side expressions: the nav button whose label includes `label`; the hero's heading
// as typed so far, and in full (its aria-label, src/data/home.js `heading`).
// A shell's scroll box (the nearest scrolling ancestor of its log) inside `root`.
const shellBox = (root) =>
  `(() => { let e = document.querySelector('${root} [role="log"]'); while (e && getComputedStyle(e).overflowY !== "auto") e = e.parentElement; return e; })()`;
const atBottom = (root) =>
  `(() => { const b = ${shellBox(root)}; return Math.round(b.scrollHeight - b.scrollTop - b.clientHeight); })()`;
// The phone menu popup's row whose label is `label`.
const menuRow = (label) =>
  `[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.trim()==='${label}')`;
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
  ".mjs": "text/javascript", // pdf.js's worker (the resume page); GitHub Pages sends the same
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
  for (const mac of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ])
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
// A run cut off (Ctrl-C, a kill) must not leave its headless browser behind: orphans pile up
// and make every later run slow and flaky.
process.on("exit", () => chrome.kill());
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => process.exit(130));
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
  let at = null; // the page go() last loaded, without its hash
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
      // Enter carries "\r": without it Chrome doesn't turn the press into a click on a button.
      text:
        type === "keyDown"
          ? key.length === 1
            ? key
            : key === "Enter"
              ? "\r"
              : undefined
          : undefined,
    });
  };
  const tab = {
    errors,
    width,
    height,
    send,
    evaluate,
    // Loads `path` fresh. The same page with another hash would be a hash-only navigation,
    // which keeps the page (its state, its scroll, a running intro): leave it first, so go()
    // always means a new load. `hash` is the in-page navigation, when that is the point.
    go: async (path, wait = 2500) => {
      const url = SITE + path,
        base = url.split("#")[0];
      if (at === base) {
        await send("Page.navigate", { url: "about:blank" });
        await sleep(200);
      }
      at = base;
      await send("Page.navigate", { url });
      await sleep(wait);
    },
    hash: async (path, wait = 1000) => {
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
    // offset a scroll needs before a section starts: START_PX, capped at a quarter of the
    // band (that formula is a copy of the one in src/lib/useTextFx.js).
    band: () =>
      evaluate(`(()=>{const cs=getComputedStyle(document.documentElement),
        nav=Math.ceil(parseFloat(cs.getPropertyValue('--nav-h'))||56),
        bar=Math.ceil(parseFloat(cs.getPropertyValue('--bar-h'))||40);
        return {nav,bar,bottom:innerHeight-bar,
          parked:Math.round(parseFloat(getComputedStyle(document.querySelector('[data-sec="1"]')).scrollMarginTop)),
          off:Math.max(0,Math.min(${START_PX},Math.floor((innerHeight-nav-bar)/4)))}})()`),
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
  // One browser profile serves every case and storage is per origin: start each with none, so
  // a preference a case sets (shortcuts off, the egg counter) can't leak into the next. (Only
  // the tab's own session can do this: the browser-level call answers "Internal error".)
  const cleared = await tab.send("Storage.clearDataForOrigin", {
    origin: new URL(SITE).origin,
    storageTypes: "local_storage,session_storage",
  });
  check("storage cleared before the case", !cleared.error, cleared.error);
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

await run("type-in under a wrapped nav (resized to 400px)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.send("Emulation.setDeviceMetricsOverride", {
    width: 400,
    height: DESKTOP.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(800);
  // Hints show here (a desktop window), so the one-row nav still wraps; the band must
  // follow the measured height, not the phone's 45px.
  const navH = await tab.evaluate(`document.querySelector("nav").getBoundingClientRect().height`);
  check("the nav wraps at 400px with hints", navH > 46, { navH });
  await tab.showTop(3, -10);
  check("skills still under the taller nav waits", (await tab.typeIn(3)) === "pending", {
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

// The phone's bars: one row each, and the menu holds terminal / theme / keys.
const CHROME_H = `(() => {
  const h = (q) => Math.round(document.querySelector(q).getBoundingClientRect().height);
  return { nav: h("nav"), bar: h("footer"), overflow: document.documentElement.scrollWidth - innerWidth };
})()`;
for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 320, height: 640 },
]) {
  await run(
    `phone bars (${size.width}×${size.height}, touch)`,
    { ...size, mobile: true },
    async (tab) => {
      await tab.go("#home");
      const c = await tab.evaluate(CHROME_H);
      check("no sideways scroll", c.overflow === 0, c);
      // 320 is too narrow for the nav's four links and the menu: it may wrap to two rows.
      const max = size.width >= 360 ? 48 : 90;
      check("nav is one row (~44px)", c.nav <= max, c);
      check("bottom bar is one row (~44px)", c.bar <= 48, c);
      // The nav's five items are spread across the row like the bottom bar's four links: the gaps
      // between them are even (they were ~8px between the section links and all the spare room
      // before the menu button).
      if (size.width >= 360) {
        const gaps = await tab.evaluate(`(() => {
          const items = [...document.querySelectorAll("nav button")].filter((b) => b.getClientRects().length > 0);
          const box = items.map((b) => b.getBoundingClientRect());
          const gaps = box.slice(1).map((b, i) => Math.round(b.left - box[i].right));
          return { n: items.length, gaps };
        })()`);
        check(
          "the nav's items are evenly spread (" + gaps.gaps.join(", ") + "px apart)",
          gaps.n === 5 && Math.max(...gaps.gaps) - Math.min(...gaps.gaps) <= 2,
          gaps,
        );
      }
      const inset = await tab.evaluate(`(() => {
        const pad = (q) => getComputedStyle(document.querySelector(q)).paddingLeft;
        return { nav: pad("nav > div"), bar: pad("footer > div") };
      })()`);
      check("the nav and the bottom bar have the same side inset", inset.nav === inset.bar, inset);
      // The hero: the heading stays on one line, and (on a tall enough screen) the egg
      // panel's title peeks in above the bottom bar, so the first screen doesn't look done.
      const hero = await tab.evaluate(`(() => {
        const h = document.querySelector("h1"),
          fs = parseFloat(getComputedStyle(h).fontSize);
        let egg = document.querySelector("[data-egg]");
        while (egg && getComputedStyle(egg).containerType !== "inline-size") egg = egg.parentElement;
        const bar = document.querySelector("footer").getBoundingClientRect().top;
        const cs = getComputedStyle(h),
          box = h.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        return { lines: Math.round(box / (fs * 1.05)), fs, peek: Math.round(bar - egg.getBoundingClientRect().top) };
      })()`);
      check("the heading is one line", hero.lines === 1, hero);
      if (size.height >= 800)
        check("the egg panel's title peeks in above the bar", hero.peek >= 60, hero);
      await tab.tap(navButton("menu"));
      await sleep(300);
      const rows = await tab.evaluate(
        `[...document.querySelectorAll('[role="dialog"] button')].map((b) => b.textContent.trim()).join()`,
      );
      check("the menu lists terminal, theme and keys", /terminal,(light|dark),keys/.test(rows), {
        rows,
      });
      await tab.tap(menuRow("keys"));
      await sleep(300);
      check(
        "keys swaps the menu for the keys popup",
        await tab.evaluate(
          `document.querySelectorAll('[role="dialog"]').length === 1 && document.querySelector('[role="dialog"]').textContent.includes("single-key shortcuts")`,
        ),
      );
    },
  );
}

// Project pages and the folder list on a phone: the buttons above a project share one row
// and are 44px tall, the folder rows are at least 28px (WCAG 2.5.8 spacing needs 24px).
await run(
  "phone project page and folder rows (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("projects/ai-room-editor/");
    const r = await tab.evaluate(`(() => {
      const row = [...document.querySelectorAll("button")].filter((b) =>
        /cd \\.\\.|previous project|next project/.test(b.innerText + " " + b.ariaLabel));
      const box = row.map((b) => b.getBoundingClientRect());
      return {
        n: row.length,
        tops: box.map((x) => Math.round(x.top)),
        heights: box.map((x) => Math.round(x.height)),
        text: row.map((b) => b.innerText.trim()),
      };
    })()`);
    check("cd .., previous and next are three buttons", r.n === 3, r);
    check("they share one row", Math.max(...r.tops) - Math.min(...r.tops) <= 2, r);
    check(
      "each is 44px tall",
      r.heights.every((h) => h >= 44),
      r,
    );
    check(
      "the project names are hidden",
      r.text.every((x) => x === "← cd .." || x === "←" || x === "→"),
      r,
    );
    await tab.go("#projects");
    const rows = await tab.evaluate(
      `[...document.querySelectorAll('[aria-label="project folders"] button')].map((b) => Math.round(b.getBoundingClientRect().height))`,
    );
    check("the folder rows are 28px or more", rows.length > 0 && rows.every((h) => h >= 28), {
      rows,
    });
  },
);

// The egg on a phone (CONTEXT.md "held"): the panel is exactly the band between the bars, so a
// whole round can be seen and played, and starting scrolls it into place just under the nav.
const EGG_POT = `document.querySelector('[data-sec="0"] pre[role="img"]')`;
// The hero's egg panel: the pot's nearest ancestor that is a size container.
const EGG_PANEL = `(() => { let e = ${EGG_POT}; while (e && getComputedStyle(e).containerType !== "inline-size") e = e.parentElement; return e; })()`;
const PANEL_RECT = `(() => { const r = ${EGG_PANEL}.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; })()`;
for (const size of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
]) {
  await run(
    `phone egg fits the band between the bars (${size.width}×${size.height}, touch)`,
    { ...size, mobile: true },
    async (tab) => {
      await tab.go("#home");
      const band = await tab.band();
      const before = await tab.evaluate(PANEL_RECT);
      const want = size.height - band.nav - band.bar;
      check(
        "the egg panel is as tall as the band between the bars",
        Math.abs(before.h - want) <= 1,
        { before, want },
      );
      await tab.evaluate(
        `document.querySelector("[data-egg]").scrollIntoView({ block: "center" })`,
      );
      await sleep(400);
      await tab.tap(`document.querySelector("[data-egg]")`);
      await sleep(1500);
      const p = await tab.evaluate(PANEL_RECT);
      check(
        "starting scrolls the panel's top to just under the nav",
        Math.abs(p.top - band.nav) <= 1,
        {
          p,
          nav: band.nav,
        },
      );
      check(
        "the whole panel is between the bars",
        p.top >= band.nav - 1 && p.bottom <= band.bottom + 1,
        {
          p,
          band,
        },
      );
      check("the panel keeps its height once started", Math.abs(p.h - before.h) <= 1, {
        p,
        before,
      });
    },
  );
}

// Held (CONTEXT.md): a tap in the egg frame hands the pot one finger. Its drags turn the egg
// and don't scroll the page (touch-action: pinch-zoom, so a pinch still zooms); everything
// else on the page still scrolls, so there's no trap. A tap outside, the round ending or
// leaving the gui lets go.
await run(
  "phone egg: a held pot takes one finger (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const NAV = `parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"))`;
    const panelUnderNav = async () => {
      await tab.evaluate(
        `scrollTo(0, ${EGG_PANEL}.getBoundingClientRect().top + scrollY - ${NAV})`,
      );
      await sleep(500);
    };
    const pan = () => tab.evaluate(`getComputedStyle(${EGG_POT}).touchAction`);
    const held = () => tab.evaluate(`${EGG_PANEL}.hasAttribute("data-held")`);
    // Where a finger lands on `find`'s element: its middle, or (`corner`) near its top left,
    // clear of the start button that sits over the pot's middle.
    const where = (find, corner) =>
      tab.evaluate(
        `(() => { const r = (${find}).getBoundingClientRect(); return ${
          corner
            ? "{ x: Math.round(r.x + 20), y: Math.round(r.y + 20) }"
            : "{ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }"
        }; })()`,
      );
    const tapPot = async () => {
      const p = await where(EGG_POT, true);
      await tab.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
      await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(200);
    };
    // A finger drag up from `find`'s element; how far the page scrolled.
    const drag = async (find, corner) => {
      const p = await where(find, corner);
      const y0 = await tab.evaluate(`scrollY`);
      await tab.send("Input.synthesizeScrollGesture", {
        ...p,
        yDistance: -150,
        speed: 800,
        gestureSourceType: "touch",
        preventFling: true,
      });
      await sleep(600);
      return (await tab.evaluate(`scrollY`)) - y0;
    };
    await panelUnderNav();
    check("an untouched pot lets the page scroll (pan-y)", (await pan()) === "pan-y", {
      pan: await pan(),
    });
    check("and isn't held", !(await held()));
    check("a drag on it scrolls the page", (await drag(EGG_POT, true)) > 20);
    // Only a completed tap holds: a swipe that starts on the pot (the pot fills most of a
    // phone's screen) is scrolling the page, and must not leave the next swipe turning the egg.
    check("and a swipe that scrolls the page doesn't hold it", !(await held()), {
      held: await held(),
      pan: await pan(),
    });
    await panelUnderNav();
    await tapPot();
    check("a tap in the frame holds it", (await held()) && (await pan()) === "pinch-zoom", {
      held: await held(),
      pan: await pan(),
    });
    check("a held pot's drag leaves the page where it is", (await drag(EGG_POT, true)) === 0);
    await panelUnderNav();
    check(
      "the egg's header still scrolls the page while held",
      (await drag(`${EGG_PANEL}.firstElementChild`)) > 20,
    );
    // A tap outside the frame (the hero's heading) lets go.
    await tab.evaluate(`scrollTo(0, 0)`);
    await sleep(400);
    await tab.tap(`document.querySelector('[data-sec="0"] h1')`);
    await sleep(200);
    check("a tap outside the frame lets go", !(await held()) && (await pan()) === "pan-y", {
      held: await held(),
      pan: await pan(),
    });
    // Play a round: the start tap holds; the result lets go.
    await tab.evaluate(`document.querySelector("[data-egg]").scrollIntoView({ block: "center" })`);
    await sleep(400);
    await tab.tap(`document.querySelector("[data-egg]")`);
    await sleep(600);
    await tab.tap(`document.querySelector('[role="dialog"][aria-label="how to play"]')`);
    check("tapping the start box holds the frame", await held());
    const text = () => tab.evaluate(`document.querySelector("[data-egg]")?.innerText ?? ""`);
    const until = async (re, ms) => {
      for (let t = 0; t < ms && !re.test(await text()); t += 500) await sleep(500);
      return re.test(await text());
    };
    check("the round reaches the pull button", await until(/pull them out/, 12000));
    // Pulling the eggs is timing-critical: the press must not move the page (only starting parks).
    await tab.evaluate(`scrollBy(0, 30)`);
    await sleep(300);
    const yBeforePull = await tab.evaluate(`scrollY`);
    await tab.tap(`document.querySelector("[data-egg]")`);
    await sleep(500);
    check(
      "pulling the eggs doesn't move the page",
      Math.abs((await tab.evaluate(`scrollY`)) - yBeforePull) <= 2,
      {
        before: yBeforePull,
        after: await tab.evaluate(`scrollY`),
      },
    );
    check("and the result", await until(/play again/, 30000));
    check("the round ending lets go", !(await held()) && (await pan()) === "pan-y", {
      held: await held(),
      pan: await pan(),
    });
    // A tap holds it again, to turn the finished egg; leaving the gui lets go.
    await panelUnderNav();
    await tapPot();
    check("a tap on the result holds it again", await held());
    // Any tap outside lets go, so leaving is tried by keyboard only: the embedded shell
    // (`), terminal mode (./app --mode terminal), and back (exit).
    await tab.key("`");
    await sleep(400);
    await tab.send("Input.insertText", { text: "./app --mode terminal" });
    await tab.key("Enter");
    await sleep(1500);
    await tab.send("Input.insertText", { text: "exit" });
    await tab.key("Enter");
    await sleep(1500);
    check(
      "leaving the gui for terminal mode and coming back lets go",
      !(await held()) && (await pan()) === "pan-y",
      { held: await held(), pan: await pan() },
    );
  },
);

// `./egg` in the embedded shell closes it and takes the visitor to the egg: on a phone that is
// the panel under the nav (the hero's top has only the intro), on a desktop the top of the page.
const EMBED_RUN = async (tab, cmd) => {
  await tab.key("`");
  await sleep(500);
  await tab.send("Input.insertText", { text: cmd });
  await tab.key("Enter");
  await sleep(1800);
};
const EMBED_EGG = (tab) => EMBED_RUN(tab, "./egg");
await run(
  "embedded ./egg lands on the egg panel (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const band = await tab.band();
    await EMBED_EGG(tab);
    const p = await tab.evaluate(PANEL_RECT);
    check("the panel's top is just under the nav", Math.abs(p.top - band.nav) <= 1, {
      p,
      nav: band.nav,
    });
    check("and the whole panel is between the bars", p.bottom <= band.bottom + 1, { p, band });
    check(
      "the shell is closed",
      await tab.evaluate(`!document.querySelector('[aria-label="embedded shell"]')`),
    );
  },
);
await run(
  "embedded ./egg from a project page lands on the egg panel (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("projects/ai-room-editor/");
    const nav = await tab.evaluate(
      `Math.ceil(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")))`,
    );
    await EMBED_EGG(tab);
    check(
      "the project page is left",
      await tab.evaluate(`!!document.querySelector('[data-sec="0"]')`),
    );
    const p = await tab.evaluate(PANEL_RECT);
    check("the panel's top is just under the nav", Math.abs(p.top - nav) <= 1, { p, nav });
  },
);
// The hero's layout can still settle for a moment after the page lands (fonts, hydration; a
// heavy machine made it up to 40px): the parked panel follows it instead of being left off by
// the difference. Made certain here: 40px sit above the panel while ./egg lands and are taken
// away a moment later.
await run(
  "the parked egg panel follows a layout that settles (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("projects/ai-room-editor/");
    const nav = await tab.evaluate(
      `Math.ceil(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")))`,
    );
    // The hero doesn't exist on a project page: add the extra 40px when it comes back.
    await tab.evaluate(
      `new MutationObserver((m, o) => { const h = document.querySelector('[data-sec="0"]'); if (h) { h.style.paddingTop = "40px"; o.disconnect(); } }).observe(document.body, { childList: true, subtree: true })`,
    );
    await tab.key("`");
    await sleep(500);
    await tab.send("Input.insertText", { text: "./egg" });
    await tab.key("Enter");
    await sleep(700);
    await tab.evaluate(`document.querySelector('[data-sec="0"]').style.paddingTop = ""`);
    await sleep(600);
    const p = await tab.evaluate(PANEL_RECT);
    check("the panel's top is still just under the nav", Math.abs(p.top - nav) <= 1, { p, nav });
  },
);
// Nothing asked for the egg here: going home from a project page just after it loaded lands at
// the top of the hero (a "not asked" flag of 0 once counted as asked for the first 2s of a load).
await run(
  "going home from a freshly loaded project page lands at the top (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("projects/ai-room-editor/", 300);
    await tab.tap(navButton("~/danny"));
    await sleep(1500);
    check("the page is at the top, not parked on the egg", (await tab.evaluate(`scrollY`)) <= 2, {
      y: await tab.evaluate(`scrollY`),
    });
  },
);
// The keyboard path starts the egg too (a narrow window or an iPad with a keyboard): Enter on the
// selected egg parks the panel just like the tap.
// With motion allowed the park is a smooth scroll; the re-park that follows it (for a layout
// that settles) must not cancel it by jumping to the target on the next frame.
await run(
  "starting scrolls the panel smoothly (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const nav = await tab.evaluate(
      `Math.ceil(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")))`,
    );
    // 200px short of the parked position, with the start box still on screen.
    await tab.evaluate(
      `scrollTo(0, Math.round(${EGG_PANEL}.getBoundingClientRect().top + scrollY - ${nav} - 200))`,
    );
    await sleep(500);
    const y0 = await tab.evaluate(`scrollY`);
    await tab.tap(`document.querySelector("[data-egg]")`);
    await sleep(80);
    const y1 = await tab.evaluate(`scrollY`);
    await sleep(1500);
    const y2 = await tab.evaluate(`scrollY`);
    check("it scrolls to the parked position", y2 - y0 >= 150, { y0, y2 });
    check("and was still on its way 80ms in (not jumped)", y1 < y2 - 10, { y0, y1, y2 });
  },
);
await run(
  "keyboard Enter on the selected egg parks the panel (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const band = await tab.band();
    await tab.key("j");
    await tab.key("j");
    await tab.evaluate(`scrollTo(0, 0)`);
    await sleep(500);
    await tab.key("Enter");
    await sleep(1500);
    const p = await tab.evaluate(PANEL_RECT);
    check("the panel's top is just under the nav", Math.abs(p.top - band.nav) <= 1, {
      p,
      nav: band.nav,
    });
  },
);
// With the keyboard up the embedded shell locks the page (html.locked: body fixed), which used to
// throw the scroll position away (the document is one screen tall while locked): `./egg` then
// scrolled from the top of the page, and `cd` computed its target from the locked page and went
// nowhere. A headless browser has no keyboard, so the visual viewport is shrunk by hand and its
// resize fired, which drives the real lock.
const KEYBOARD = (tab, height, shrinkInner = false) =>
  tab.evaluate(`(() => {
    const vv = visualViewport;
    ${height ? `Object.defineProperty(vv, "height", { get: () => ${height}, configurable: true });` : `delete vv.height;`}
    // iOS also shrinks the layout viewport itself once the keyboard is fully up.
    ${shrinkInner ? (height ? `Object.defineProperty(window, "innerHeight", { get: () => ${height}, configurable: true });` : `delete window.innerHeight;`) : ""}
    vv.dispatchEvent(new Event("resize"));
  })()`);
const LOCKED = `document.documentElement.classList.contains("locked")`;
// Opens the embedded shell with the keyboard "up", runs `cmd` on its prompt.
const RUN_WITH_KEYBOARD = async (tab, cmd) => {
  await tab.key("`");
  await sleep(500);
  await KEYBOARD(tab, 508);
  await sleep(300);
  await tab.send("Input.insertText", { text: cmd });
  await tab.evaluate(
    `document.querySelector('[aria-label="embedded shell"] input').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`,
  );
};
await run(
  "embedded cd with the keyboard up moves the page underneath at once (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const band = await tab.band();
    await tab.evaluate(`scrollTo(0, 620)`);
    await sleep(400);
    await RUN_WITH_KEYBOARD(tab, "cd projects");
    await sleep(700);
    check("the page is locked while the keyboard is up", await tab.evaluate(LOCKED));
    check(
      "the shell is still open",
      await tab.evaluate(`!!document.querySelector('[aria-label="embedded shell"]')`),
    );
    // Behind the open shell the page is already at the section: its top sits where a jump
    // parks it (the locked page is shifted, not scrolled, so its rect is what is on screen).
    const behind = await tab.top(1);
    check("projects is already parked behind the shell", Math.abs(behind - band.parked) <= 3, {
      behind,
      parked: band.parked,
    });
    // Close the shell and let the keyboard go: the page stays there.
    await KEYBOARD(tab, 0);
    await tab.evaluate(`document.activeElement.blur()`);
    await tab.key("Escape");
    await sleep(1500);
    check("the page is unlocked again", !(await tab.evaluate(LOCKED)));
    const top = await tab.top(1);
    check("and projects is still parked under the nav", Math.abs(top - band.parked) <= 3, {
      top,
      parked: band.parked,
    });
  },
);
// The last section is where the page's end clamps a jump. With the keyboard up (and iOS's
// layout viewport shrunk with it) the shell's `cd skills` must land where an unlocked jump
// would, both behind the open shell and after it closes: the furthest the page can scroll is
// measured on the unlocked page first.
await run(
  "embedded cd to the last section clamps like an unlocked jump (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const want = await tab.evaluate(`(() => {
      const el = document.querySelector('[data-sec="3"]');
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop);
      const doc = el.getBoundingClientRect().top + scrollY;
      const y = Math.min(document.documentElement.scrollHeight - innerHeight, doc - margin);
      return { y: Math.round(y), top: Math.round(doc - y) };
    })()`);
    await tab.key("`");
    await sleep(500);
    await KEYBOARD(tab, 508, true);
    await sleep(300);
    await tab.send("Input.insertText", { text: "cd skills" });
    await tab.evaluate(
      `document.querySelector('[aria-label="embedded shell"] input').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`,
    );
    await sleep(700);
    const behind = await tab.top(3);
    check(
      "behind the open shell the last section is where an unlocked jump puts it",
      Math.abs(behind - want.top) <= 2,
      { behind, want },
    );
    await KEYBOARD(tab, 0, true);
    await tab.evaluate(`document.activeElement.blur()`);
    await tab.key("Escape");
    await sleep(1500);
    const y = await tab.evaluate(`scrollY`);
    check("and so is the page once the shell closes", Math.abs(y - want.y) <= 2, { y, want });
  },
);
await run(
  "embedded ./egg with the keyboard up scrolls from where the page is (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    await tab.evaluate(
      `scrollTo(0, Math.round(${EGG_PANEL}.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"))))`,
    );
    await sleep(500);
    const y0 = await tab.evaluate(`scrollY`);
    await RUN_WITH_KEYBOARD(tab, "./egg");
    // Once the page is unlocked, it is where it was: never back at the top on the way.
    await tab.evaluate(
      `(async () => { for (let t = 0; t < 3000 && ${LOCKED}; t += 50) await new Promise((r) => setTimeout(r, 50)); })()`,
    );
    const ys = await tab.evaluate(
      `(async () => { const out = []; for (let t = 0; t < 1500; t += 40) { out.push(Math.round(scrollY)); await new Promise((r) => setTimeout(r, 40)); } return out; })()`,
    );
    check("the page never goes back to the top", Math.min(...ys) >= y0 - 5, {
      y0,
      min: Math.min(...ys),
      max: Math.max(...ys),
    });
  },
);
await run(
  "embedded cd ~ goes to the top of the hero, not the egg (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    await tab.evaluate(`scrollTo(0, 1200)`);
    await sleep(400);
    await EMBED_RUN(tab, "cd ~");
    check("the page is at the top", (await tab.evaluate(`scrollY`)) <= 2, {
      y: await tab.evaluate(`scrollY`),
    });
  },
);
// A narrow window that is short too (a desktop browser squeezed below the phone layout's 600px)
// must not squash the egg panel: it keeps room for its header, pot and footer.
await run(
  "the egg panel keeps a usable height in a short narrow window (580×300)",
  { width: 580, height: 300 },
  async (tab) => {
    await tab.go("#home");
    const h = await tab.evaluate(`Math.round(${EGG_PANEL}.getBoundingClientRect().height)`);
    check("the panel is at least 360px tall", h >= 360, { h });
  },
);
await run(
  "embedded ./egg goes to the top of the page on a desktop (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("#home");
    await tab.evaluate(`scrollTo(0, 900)`);
    await sleep(400);
    await EMBED_EGG(tab);
    check("the page is at the top", (await tab.evaluate(`scrollY`)) <= 2, {
      y: await tab.evaluate(`scrollY`),
    });
  },
);

// ./egg in terminal mode on a phone (CONTEXT.md "held"): the same as the gui. Shortcut tabs and
// ./egg keep the keyboard away (the buttons play, the prompt is hidden), the egg block fills the
// visible output area exactly and keeps itself aligned to it through a keyboard closing, the
// status text wraps instead of running off the screen, a tap on the pot only holds it, the
// stages are played with buttons, and `quit` brings the prompt back.
const TERM = '[data-mode="term"]';
const T_POT = `document.querySelector('${TERM} pre[aria-label="ascii egg minigame"]')`;
const T_BTN = (label) =>
  `[...document.querySelectorAll('${TERM} button')].find((b) => b.textContent.trim() === '${label}')`;
// The egg block is the pot's nearest ancestor with a --s style (the pot's scale).
const TERM_STATE = `(() => {
  const body = ${shellBox(TERM)};
  const pot = ${T_POT};
  let blk = pot; while (blk && !blk.style.getPropertyValue("--s")) blk = blk.parentElement;
  const bb = body.getBoundingClientRect(), eb = blk && blk.getBoundingClientRect();
  return {
    active: document.activeElement?.tagName,
    top: eb && Math.round(eb.top - bb.top),
    bottom: eb && Math.round(bb.bottom - eb.bottom),
    // What sits under the block when the output is pinned to its bottom: the log's row gap and
    // the area's bottom padding (the block stops above them, so that pin leaves it in place).
    slack: Math.round(
      (parseFloat(getComputedStyle(body.firstElementChild).rowGap) || 0) +
        parseFloat(getComputedStyle(body).paddingBottom),
    ),
    over: body.scrollWidth - body.clientWidth,
    held: !!blk && blk.hasAttribute("data-held"),
    pan: pot && getComputedStyle(pot).touchAction,
    tail: body.innerText.slice(-100),
  };
})()`;
const TERM_TEXT = `${shellBox(TERM)}.innerText`;
const openTerm = async (tab) => {
  await tab.go("#home");
  await tab.evaluate(`sessionStorage.setItem("danny-mode", "term")`);
  await tab.send("Page.reload");
  await sleep(2500);
  // The boot intro (a deep link doesn't skip it after a reload) takes every key while it plays,
  // and terminal mode types a couple of commands itself at load: keys wait for both.
  await tab.evaluate(
    `(async () => { for (let t = 0; t < 12000; t += 250) { const intro = document.documentElement.classList.contains("boot-intro") || document.documentElement.dataset.loading; if (!intro && /try: tree projects/.test(${TERM_TEXT})) return; await new Promise((r) => setTimeout(r, 250)); } })()`,
  );
  await sleep(600);
};
// `keyboard`: pretend the on-screen keyboard is up (a headless browser has none): the page
// marks the frame `data-kb` for it, and that is what tells it to put the keyboard away.
const typeEgg = async (tab, keyboard = false) => {
  await tab.evaluate(`document.querySelector('${TERM} input').focus()`);
  await tab.send("Input.insertText", { text: "./egg" });
  if (keyboard) await tab.evaluate(`document.querySelector('${TERM} > div').dataset.kb = ""`);
  // A synthetic Enter on the prompt: a real key press sent first thing in a fresh tab can be
  // dropped by the headless browser (no page focus yet), which says nothing about the page.
  await tab.evaluate(
    `document.querySelector('${TERM} input').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`,
  );
  await sleep(900);
};
const aligned = (st) =>
  st.top !== null &&
  st.bottom !== null &&
  Math.abs(st.top) <= 1 &&
  Math.abs(st.bottom - st.slack) <= 2;
await run("terminal: Enter right after typing runs the command", DESKTOP, async (tab) => {
  await openTerm(tab);
  await tab.evaluate(`document.querySelector('${TERM} input').focus()`);
  // No wait between the text and the Enter: the Enter must act on what was just typed, not on
  // the prompt as of the last render.
  await tab.send("Input.insertText", { text: "./egg" });
  await tab.key("Enter");
  await sleep(1500); // the egg mounts at once; the rest is slack for a loaded machine
  check("the egg starts", await tab.evaluate(`!!${T_POT}`));
});
await run(
  "phone terminal egg keeps the keyboard away (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await openTerm(tab);
    // The prompt has focus from the start (the terminal autofocuses it); put it away, then tap
    // the `ls -la` tab, whose long listing nothing before it printed.
    await tab.evaluate(`document.activeElement.blur()`);
    await tab.tap(
      `[...document.querySelectorAll('${TERM} button[aria-pressed]')].find((b) => /ls -la/.test(b.textContent))`,
    );
    await sleep(250); // still typing itself out
    let st = await tab.evaluate(TERM_STATE);
    check("a shortcut tab doesn't focus the prompt (no keyboard)", st.active !== "INPUT", st);
    await sleep(1800);
    const out = await tab.evaluate(TERM_TEXT);
    check("but it still types and runs the command", /184k/.test(out), { tail: out.slice(-120) });
    await typeEgg(tab, true);
    st = await tab.evaluate(TERM_STATE);
    check("the egg is running", st.top !== null && st.pan !== null, st);
    check(
      "typing ./egg with the keyboard up puts it away (the prompt loses focus)",
      st.active !== "INPUT",
      st,
    );
  },
);
// The smallest phones: the pot's narrowest frame (288px) must fit between the terminal's side
// padding, so nothing runs off the side at 320px either.
await run(
  "phone terminal egg fits the width at 320px (320×900, touch)",
  { width: 320, height: 900, mobile: true },
  async (tab) => {
    await openTerm(tab);
    await typeEgg(tab);
    await sleep(1300);
    const st = await tab.evaluate(TERM_STATE);
    check("the egg is running", st.top !== null, st);
    check("nothing runs off the side of the screen", st.over <= 0, st);
  },
);
// An iPad with a hardware keyboard counts as touch but has no on-screen keyboard (no `data-kb`):
// the prompt keeps its focus, so Enter and ctrl-c still work.
await run(
  "phone terminal egg keeps the prompt without an on-screen keyboard (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await openTerm(tab);
    await typeEgg(tab);
    const st = await tab.evaluate(TERM_STATE);
    check("the egg is running", st.top !== null, st);
    check("the prompt keeps focus", st.active === "INPUT", st);
  },
);
// The alignment is a phone thing: on a desktop terminal shorter than the egg (a short window,
// browser zoom) the output stays pinned to the bottom, where the key hints are.
await run(
  "terminal egg stays pinned to the bottom on a short desktop window (1291×400)",
  { width: 1291, height: 400 },
  async (tab) => {
    await openTerm(tab);
    await typeEgg(tab);
    await sleep(1600); // past the settle timers
    const gap = await tab.evaluate(atBottom(TERM));
    check("the output is at its bottom", gap <= 2, { gap });
    check(
      "and the hints are in view",
      await tab.evaluate(
        `(() => { const b = ${shellBox(TERM)}; return /click the pot to start/.test(b.innerText) && b.scrollHeight - b.scrollTop - b.clientHeight <= 2; })()`,
      ),
    );
  },
);
for (const size of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  await run(
    `phone terminal egg fills the output area (${size.width}×${size.height}, touch)`,
    { ...size, mobile: true },
    async (tab) => {
      await openTerm(tab);
      await typeEgg(tab);
      await sleep(1300);
      let st = await tab.evaluate(TERM_STATE);
      check("the block fills the output area, top edge to its bottom padding", aligned(st), st);
      check("nothing runs off the side of the screen", st.over <= 0, st);
      // A keyboard coming up and going away in steps, as iOS does (--vv-h/data-kb are the
      // visible area the viewport hook sets; a headless browser has no keyboard).
      const frame = (js) =>
        tab.evaluate(`(() => { const t = document.querySelector('${TERM} > div'); ${js} })()`);
      await frame(`t.style.setProperty("--vv-h", "${size.height - 336}px"); t.dataset.kb = "";`);
      await sleep(500);
      await frame(`t.style.setProperty("--vv-h", "${size.height - 140}px");`);
      await sleep(200);
      await frame(`t.style.removeProperty("--vv-h"); delete t.dataset.kb;`);
      await sleep(1600);
      st = await tab.evaluate(TERM_STATE);
      check("after the keyboard goes away it is aligned again", aligned(st), st);
    },
  );
}
await run(
  "phone terminal egg is played with buttons and held (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await openTerm(tab);
    await typeEgg(tab);
    await sleep(800);
    // A finger near the pot's top left, clear of the buttons.
    const tapPot = async () => {
      const p = await tab.evaluate(
        `(() => { const r = ${T_POT}.getBoundingClientRect(); return { x: Math.round(r.x + 20), y: Math.round(r.y + 20) }; })()`,
      );
      await tab.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
      await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(300);
    };
    let st = await tab.evaluate(TERM_STATE);
    check("an untouched pot isn't held", st.top !== null && !st.held && st.pan === "pan-y", st);
    await tapPot();
    st = await tab.evaluate(TERM_STATE);
    check("a tap on the pot holds it", st.held && st.pan === "pinch-zoom", st);
    check("and doesn't open the keyboard", st.active !== "INPUT", st);
    check("or start the round", /soft-boiled/.test(await tab.evaluate(TERM_TEXT)), {
      tail: st.tail,
    });
    // A tap outside the block (the terminal's header text) lets go.
    await tab.tap(`document.querySelector('${TERM} > div').firstElementChild.firstElementChild`);
    await sleep(300);
    st = await tab.evaluate(TERM_STATE);
    check("a tap outside the block lets go", !st.held && st.pan === "pan-y", st);
    const logHas = (re, ms) =>
      tab.evaluate(
        `(async () => { for (let t = 0; t < ${ms}; t += 300) { if (${re}.test(${TERM_TEXT})) return true; await new Promise((r) => setTimeout(r, 300)); } return false; })()`,
      );
    check(
      "the start button starts the round",
      (await tab.tap(T_BTN("start"))) && (await logHas("/waiting for a rolling boil/", 3000)),
    );
    check("the round reaches the pull button", await logHas("/pull it at/", 12000));
    await tab.tap(T_BTN("pull them out"));
    check("the pull button pulls the eggs", await logHas("/into the ice bath/", 4000));
    check("and the round gets to the result", await logHas("/cooked on this device/", 20000));
    st = await tab.evaluate(TERM_STATE);
    check("the result's status fits the width", st.over <= 0, st);
    await tab.tap(T_BTN("quit"));
    await sleep(500);
    check(
      "quit brings the prompt back",
      await tab.evaluate(
        `getComputedStyle(document.querySelector('${TERM} input').parentElement).height !== "0px"`,
      ),
    );
    // The quit press was a tap inside the block, which held it: running ./egg again must not
    // start already held (the outline and touch-action on an untouched pot).
    await typeEgg(tab);
    st = await tab.evaluate(TERM_STATE);
    check("a new ./egg starts untouched", st.top !== null && !st.held && st.pan === "pan-y", st);
  },
);

// Terminal mode on a phone fills the screen: the header at the very top, the shortcut bar at
// the very bottom, nothing scrolling. (The on-screen keyboard, which a headless browser
// can't open, is covered by useVisualViewportFrame and the real-phone check.)
await run("phone terminal mode (390×844, touch)", { ...PHONE, mobile: true }, async (tab) => {
  await tab.go("#home");
  await tab.evaluate(`sessionStorage.setItem("danny-mode", "term")`);
  await tab.send("Page.reload");
  await sleep(2500);
  const r = await tab.evaluate(`(() => {
    const term = document.querySelector('[data-mode="term"] > div');
    const head = term?.firstElementChild?.getBoundingClientRect();
    const bar = term?.lastElementChild?.getBoundingClientRect();
    return {
      mode: document.querySelector("[data-mode]")?.dataset.mode,
      headTop: head && Math.round(head.top),
      barBottom: bar && Math.round(bar.bottom),
      h: innerHeight,
      scroll: scrollY,
      overflow: document.documentElement.scrollHeight - innerHeight,
    };
  })()`);
  check("terminal mode is on", r.mode === "term", r);
  check("the header is at the top of the screen", r.headTop === 0, r);
  check("the shortcut bar is at the bottom of the screen", r.barBottom === r.h, r);
  check("the page doesn't scroll", r.scroll === 0 && r.overflow <= 0, r);
  const TERM = '[data-mode="term"]';
  for (let i = 0; i < 3; i++) {
    await tab.send("Input.insertText", { text: "help" });
    await tab.key("Enter");
  }
  await sleep(300);
  await tab.evaluate(`${shellBox(TERM)}.scrollTop = 0`);
  await sleep(200);
  const tAway = await tab.evaluate(atBottom(TERM));
  check("terminal mode has output to scroll", tAway > 100, { tAway });
  await tab.evaluate(`document.querySelector('${TERM} input').focus()`);
  await tab.send("Input.insertText", { text: "l" });
  await sleep(300);
  const tBack = await tab.evaluate(atBottom(TERM));
  check("typing brings terminal mode back to its prompt", tBack <= 2, { tBack });
  // Focusing the prompt with no keyboard (a headless browser has none) isn't a keyboard: the
  // frame follows the visible area and the shortcut bar stays.
  await tab.evaluate(`document.querySelector('[data-mode="term"] input').focus()`);
  await sleep(300);
  const focus = await tab.evaluate(`(() => {
    const term = document.querySelector('[data-mode="term"] > div');
    return {
      kb: term.dataset.kb !== undefined,
      vvH: term.style.getPropertyValue("--vv-h"),
      h: innerHeight,
      bar: getComputedStyle(term.lastElementChild).display,
    };
  })()`);
  check(
    "focusing the prompt without a keyboard keeps the bar",
    !focus.kb && focus.vvH === focus.h + "px" && focus.bar !== "none",
    focus,
  );
  const sizes = await tab.evaluate(`(() => {
    const px = (e) => parseFloat(getComputedStyle(e).fontSize);
    const t = document.querySelector('[data-mode="term"]');
    const input = t.querySelector("input");
    return {
      log: px(t.querySelector('[role="log"]')),
      input: px(input) * new DOMMatrix(getComputedStyle(input).transform).a,
      real: px(input),
    };
  })()`);
  check(
    "terminal mode's output is 14px, its prompt looks the same and is 16px for iOS",
    sizes.log === 14 && Math.abs(sizes.input - sizes.log) < 0.1 && sizes.real >= 16,
    sizes,
  );
  const termRow = await tab.evaluate(`(() => {
    const t = document.querySelector('[data-mode="term"]');
    return { input: t.querySelector("input").offsetHeight, line: parseFloat(getComputedStyle(t.querySelector('[role="log"]')).lineHeight) };
  })()`);
  check(
    "terminal mode's prompt is as tall as a printed line",
    Math.abs(termRow.input - termRow.line) < 0.5,
    termRow,
  );
  const bars = await tab.evaluate(`(() => {
    const term = document.querySelector('[data-mode="term"] > div');
    const head = term.firstElementChild, tabs = term.lastElementChild;
    const cs = (e) => getComputedStyle(e);
    return {
      head: Math.round(head.getBoundingClientRect().height),
      tabs: Math.round(tabs.getBoundingClientRect().height),
      headPad: cs(head).paddingLeft,
      locked: document.documentElement.classList.contains("locked"),
      body: cs(document.body).position,
      tabsPan: cs(tabs).touchAction,
      headPan: cs(head).touchAction,
      spark: [...tabs.querySelectorAll("span")].some((s) => /git log/.test(s.textContent) && s.getClientRects().length > 0),
    };
  })()`);
  check("the header and the shortcut bar are the same height", bars.head === bars.tabs, bars);
  check("the sparkline is left out on a phone", !bars.spark, bars);
  check("the page is locked, so nothing drags", bars.locked && bars.body === "fixed", bars);
  check(
    "the bars take no vertical drag",
    bars.tabsPan === "pan-x" && bars.headPan === "none",
    bars,
  );
  // A keyboard up, simulated with the variables useVisualViewportFrame sets: the frame is the
  // 500px above it (shifted down 40px, as if iOS had panned), the prompt stays inside, and the
  // shortcut bar is gone (it comes back with the keyboard closed).
  await tab.evaluate(`(() => {
    const term = document.querySelector('[data-mode="term"] > div');
    term.style.setProperty("--vv-top", "40px");
    term.style.setProperty("--vv-h", "500px");
    term.dataset.kb = "";
  })()`);
  await sleep(300); // the output re-pins to the prompt when its pane resizes
  const k = await tab.evaluate(`(() => {
    const term = document.querySelector('[data-mode="term"] > div');
    const rect = (e) => e.getBoundingClientRect();
    const input = term.querySelector("input");
    return {
      headTop: Math.round(rect(term.firstElementChild).top),
      bar: getComputedStyle(term.lastElementChild).display,
      inputBottom: Math.round(rect(input).bottom),
    };
  })()`);
  check("with a keyboard the header stays at the top of the visible area", k.headTop === 40, k);
  check("the shortcut bar is out of the way", k.bar === "none", k);
  check("the prompt stays above the keyboard", k.inputBottom <= 540, k);
});

// The gui's bars stay put on a phone: the nav at the very top and the bottom bar at the very
// bottom of the screen at every scroll position, and again after the window's height changes
// (Safari's toolbar collapsing and coming back changes innerHeight like this).
await run(
  "phone bars stay put while scrolling (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    const edges = () =>
      tab.evaluate(`(() => ({
      navTop: Math.round(document.querySelector("nav").getBoundingClientRect().top),
      barBottom: Math.round(document.querySelector("footer").getBoundingClientRect().bottom),
      h: innerHeight,
      y: Math.round(scrollY),
    }))()`);
    const holds = async (label) => {
      for (const y of [0, 700, 1800, 1e6]) {
        await tab.evaluate(`scrollTo(0, ${y})`);
        await sleep(250);
        const e = await edges();
        check(
          `${label}: the nav is at the top and the bar at the bottom (scrolled to ${e.y})`,
          e.navTop === 0 && Math.abs(e.barBottom - e.h) <= 1, // at the page's end a fractional height can leave <1px
          e,
        );
      }
    };
    // iOS's rubber-band bounce moved the whole page, the nav and bar included (phone telemetry:
    // the nav reached top +157 at the top, the bar went past the screen's bottom at the end).
    const bounce = await tab.evaluate(
      `getComputedStyle(document.documentElement).overscrollBehaviorY`,
    );
    check("the page doesn't rubber-band on touch", bounce === "none", { bounce });
    await holds("at 844px");
    for (const height of [760, 844, 700]) {
      await tab.send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await sleep(400);
      await holds("after the window became " + height + "px tall");
    }
  },
);

// The embedded shell on a phone with a keyboard up (set by hand: a headless browser has no
// keyboard, the real one is covered by the phone check): the panel is the visible area above
// the keyboard, inset 8px, wherever iOS has panned the page to.
await run(
  "phone embedded shell with a keyboard (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    await tab.tap(navButton("menu"));
    await sleep(300);
    await tab.tap(menuRow("terminal"));
    await sleep(700);
    const shell = `document.querySelector('[aria-label="embedded shell"]')`;
    // Typing returns the output to the prompt, even after scrolling up to read.
    const EMBED = '[aria-label="embedded shell"]';
    for (let i = 0; i < 3; i++) {
      await tab.send("Input.insertText", { text: "help" });
      await tab.key("Enter");
    }
    await sleep(300);
    await tab.evaluate(`${shellBox(EMBED)}.scrollTop = 0`);
    await sleep(200);
    const away = await tab.evaluate(atBottom(EMBED));
    check("the embedded shell has output to scroll", away > 100, { away });
    await tab.evaluate(`document.querySelector('${EMBED} input').focus()`);
    await tab.send("Input.insertText", { text: "l" });
    await sleep(300);
    const back = await tab.evaluate(atBottom(EMBED));
    check("typing brings the embedded shell back to its prompt", back <= 2, { back });
    const rest = await tab.evaluate(`(() => {
    const r = ${shell}.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight };
  })()`);
    check(
      "without a keyboard the panel sits between the bars",
      rest.top > 40 && rest.bottom < rest.h - 40,
      rest,
    );
    await tab.evaluate(`(() => {
    const el = ${shell};
    el.style.setProperty("--vv-top", "40px");
    el.style.setProperty("--vv-h", "400px");
    el.dataset.kb = "";
  })()`);
    await sleep(300);
    const kb = await tab.evaluate(`(() => {
    const r = ${shell}.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
  })()`);
    check(
      "with a keyboard the panel fills the visible area, inset 8px",
      kb.top === 48 && kb.bottom === 432,
      kb,
    );
  },
);

// While a shell has the keyboard up (html.locked), nothing may drag the page: telemetry from an
// iPhone showed the page panning 216px under the pinned nav and bar, which teleported. The
// gui's bars are hidden while it's locked, the page takes only pinch zoom, and a shell's
// output scrolls without handing the drag on to the page.
await run(
  "a locked page can't be dragged (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    await tab.tap(navButton("menu"));
    await sleep(300);
    await tab.tap(menuRow("terminal"));
    await sleep(700);
    await tab.evaluate(`document.documentElement.classList.add("locked")`);
    const s = await tab.evaluate(`(() => {
    const cs = (e) => getComputedStyle(e);
    let box = document.querySelector('[aria-label="embedded shell"] [role="log"]');
    while (box && cs(box).overflowY !== "auto") box = box.parentElement;
    return {
      html: cs(document.documentElement).touchAction,
      nav: cs(document.querySelector("nav")).visibility,
      bar: cs(document.querySelector("footer")).visibility,
      boxPan: cs(box).touchAction,
      boxChain: cs(box).overscrollBehaviorY,
    };
  })()`);
    check("the page takes only pinch zoom", s.html === "pinch-zoom", s);
    check("the gui's bars are hidden", s.nav === "hidden" && s.bar === "hidden", s);
    check("the shell's output scrolls up and down", s.boxPan === "pan-y", s);
    check("and doesn't hand the drag on to the page", s.boxChain === "contain", s);
  },
);

// A heading's box must contain its typing cursor's ink. The "type" effect draws a full-block
// cursor that sticks out below (and above) the heading's line box; Safari repaints only the
// box, so on a phone a strip of the block was left under the first letter ("hey, i'm_danny")
// until the page was scrolled. The check measures the glyph with the heading's own font.
const INK_OVERFLOW = (sel) => `(async () => {
  await document.fonts.ready;
  const h = document.querySelector(${JSON.stringify(sel)});
  const cs = getComputedStyle(h);
  const c = document.createElement("canvas").getContext("2d");
  c.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  const m = c.measureText("█");
  const fs = parseFloat(cs.fontSize);
  const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight);
  const half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
  return {
    above: Math.max(0, m.actualBoundingBoxAscent - (m.fontBoundingBoxAscent + half)),
    below: Math.max(0, m.actualBoundingBoxDescent - (m.fontBoundingBoxDescent + half)),
    padTop: parseFloat(cs.paddingTop),
    padBottom: parseFloat(cs.paddingBottom),
    marginTop: parseFloat(cs.marginTop),
    marginBottom: parseFloat(cs.marginBottom),
  };
})()`;
await run(
  "headings contain their cursor's ink (390×844, touch)",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    for (const [label, path, sel] of [
      ["the hero heading", "#home", "h1"],
      ["a project's heading", "projects/ai-room-editor/", "[data-detail-title]"],
    ]) {
      await tab.go(path);
      const k = await tab.evaluate(INK_OVERFLOW(sel));
      check(
        label + "'s box covers the cursor's ink above and below",
        k.padTop >= k.above && k.padBottom >= k.below,
        k,
      );
      check(
        label + " keeps its layout (the padding is cancelled by an equal negative margin)",
        k.marginTop === -k.padTop && k.marginBottom === -k.padBottom,
        k,
      );
    }
  },
);

await run(
  "the menu closes when the window grows past 600px",
  { ...PHONE, mobile: true },
  async (tab) => {
    await tab.go("#home");
    await tab.tap(navButton("menu"));
    await sleep(300);
    const open = () => tab.evaluate(`document.querySelectorAll('[role="dialog"]').length`);
    check("the menu is open", (await open()) === 1);
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await sleep(500);
    check("it closes at 800px wide", (await open()) === 0);
  },
);

// Key labels: [data-hint] (one-character keys) and [data-keyhint] (esc, enter, arrows) that
// are on screen, and the touch wording that stands in for them.
const LABELS_SHOWN = `[...document.querySelectorAll("[data-hint],[data-keyhint]")].filter((e) => e.getClientRects().length > 0).length`;
const START_TEXT = `document.querySelector("[data-egg]")?.innerText.trim()`;

// Desktop is unchanged by all of the above: a mouse never holds the egg, and the pot keeps its
// own touch-action and no outline.
await run("the egg frame is unchanged on a desktop (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  await tab.evaluate(`${EGG_PANEL}.scrollIntoView({ block: "center" })`);
  await sleep(400);
  await tab.click(`document.querySelector("[data-egg]")`);
  await sleep(500);
  const s = await tab.evaluate(`(() => {
    const panel = ${EGG_PANEL};
    return {
      held: panel.hasAttribute("data-held"),
      pan: getComputedStyle(${EGG_POT}).touchAction,
      outline: getComputedStyle(panel).outlineStyle,
      h: Math.round(panel.getBoundingClientRect().height),
      vh: innerHeight,
    };
  })()`);
  check("a mouse press in the frame doesn't hold it", !s.held, s);
  check("the pot keeps pan-y", s.pan === "pan-y", s);
  check("and there is no outline", s.outline === "none", s);
  check("the panel isn't stretched to the viewport", s.h < s.vh - 100, s);
});

await run("touch screens show no key labels (390×844)", { ...PHONE, mobile: true }, async (tab) => {
  await tab.go("#home");
  check(
    "the emulation is a touch screen",
    await tab.evaluate(`matchMedia("(hover: none) and (pointer: coarse)").matches`),
  );
  check("no key label is on screen", (await tab.evaluate(LABELS_SHOWN)) === 0, {
    shown: await tab.evaluate(LABELS_SHOWN),
  });
  check("the egg's start box says tap", (await tab.evaluate(START_TEXT)) === "tap to start", {
    text: await tab.evaluate(START_TEXT),
  });
  await tab.evaluate(`document.querySelector("[data-egg]").scrollIntoView({ block: "center" })`);
  await sleep(400);
  await tab.tap(`document.querySelector("[data-egg]")`);
  await sleep(500);
  const rule = await tab.evaluate(
    `[...document.querySelectorAll('[role="dialog"][aria-label="how to play"] div')].map((d) => d.innerText).find((t) => t.includes("pull them out"))`,
  );
  check("the rules card says tap, with no key names", /exactly \d.*: tap$/.test(rule ?? ""), {
    rule,
  });
  await tab.tap(navButton("menu"));
  await sleep(300);
  await tab.tap(menuRow("terminal"));
  await sleep(600);
  const px = await tab.evaluate(
    `parseFloat(getComputedStyle(document.querySelector('[aria-label="embedded shell"] input')).fontSize)`,
  );
  check("the shell's prompt is 16px or more, so iOS doesn't zoom", px >= 16, { px });
  // The prompt stays 16px (smaller and iOS zooms the page when it takes focus) but is scaled
  // down, so it looks like the 14px output above it.
  const looks = await tab.evaluate(`(() => {
    const sh = document.querySelector('[aria-label="embedded shell"]');
    const input = sh.querySelector("input");
    const scale = new DOMMatrix(getComputedStyle(input).transform).a;
    return {
      log: parseFloat(getComputedStyle(sh.querySelector('[role="log"]')).fontSize),
      input: parseFloat(getComputedStyle(input).fontSize) * scale,
    };
  })()`);
  check(
    "the embedded shell's output is 14px and its prompt looks the same size",
    looks.log === 14 && Math.abs(looks.input - looks.log) < 0.1,
    looks,
  );
  // The prompt line and a printed line are the same height, or pressing Enter shifts the text
  // (a 16px prompt scaled to look 14px sat in a row ~3px taller than the 14px lines).
  const rowH = await tab.evaluate(`(() => {
    const sh = document.querySelector('[aria-label="embedded shell"]');
    const input = sh.querySelector("input");
    return { input: input.offsetHeight, line: parseFloat(getComputedStyle(sh.querySelector('[role="log"]')).lineHeight) };
  })()`);
  check(
    "the embedded shell's prompt is as tall as a printed line",
    Math.abs(rowH.input - rowH.line) < 0.5,
    rowH,
  );
  check(
    "the shell's close button has no [esc] label",
    !(
      await tab.evaluate(`document.querySelector('[aria-label="embedded shell"] button').innerText`)
    ).includes("[esc]"),
  );
});

// A touch tablet (wide enough for the frames' right-hand legends): the key legend goes,
// the skills legend (not a key label) stays.
await run(
  "touch tablet keeps the skills legend (820×1180)",
  { width: 820, height: 1180, mobile: true },
  async (tab) => {
    await tab.go("#skills");
    const legends = await tab.evaluate(
      `[...document.querySelectorAll("[data-sec] > span")].filter((e) => e.getClientRects().length > 0).map((e) => e.innerText.trim()).join("|")`,
    );
    check("the skills legend shows", legends.includes("share of"), { legends });
    check(
      "its hover wording is a key label, so touch drops it",
      !legends.includes("hover or tab"),
      {
        legends,
      },
    );
    check("no key legend shows", !legends.includes("[↲]") && !legends.includes("move"), {
      legends,
    });
  },
);

// A skill row is a name, a 16-cell bar and the project·job·course counts: all three must fit
// their columns (the longest name is "Hugging Face"), down to the smallest phones.
for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 320, height: 640 },
]) {
  await run(
    `skills rows fit at ${size.width}px (${size.width}×${size.height}, touch)`,
    { ...size, mobile: true },
    async (tab) => {
      await tab.go("#skills");
      const st = await tab.evaluate(`(() => {
        const rows = [...document.querySelectorAll("#skills [data-skillrow]")];
        const over = (e) => e.scrollWidth - e.clientWidth;
        return {
          rows: rows.length,
          page: document.documentElement.scrollWidth - innerWidth,
          row: Math.max(...rows.map(over)),
          name: Math.max(...rows.map((r) => over(r.firstElementChild))),
        };
      })()`);
      // A phone has no hover, so each row prints what it was used in underneath (always shown:
      // nothing toggles, so no layout moves under a jump).
      const used = await tab.evaluate(`(() => {
        const lines = [...document.querySelectorAll("#skills [data-used]")];
        return {
          lines: lines.length,
          shown: lines.filter((l) => l.getClientRects().length > 0 && /^used in: ./.test(l.innerText)).length,
          hidden: lines.filter((l) => l.getAttribute("aria-hidden") !== "true").length,
        };
      })()`);
      check(
        "every row shows its used-in line, and screen readers don't hear it twice",
        used.lines > 20 && used.shown === used.lines && used.hidden === 0,
        used,
      );
      check("the skill rows are there", st.rows > 20, st);
      check("no row runs past its box, no name past its column", st.row <= 0 && st.name <= 0, st);
      check("the page doesn't scroll sideways", st.page <= 0, st);
    },
  );
}

// With a mouse the used-in line is the row's tooltip, not text on the page.
await run(
  "skills rows keep their used-in line off the page until hovered on desktop (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("#skills");
    const shown = await tab.evaluate(
      `[...document.querySelectorAll("#skills [data-used]")].filter((l) => l.getClientRects().length > 0).length`,
    );
    check("no used-in line takes space under a row", shown === 0, { shown });
    check(
      "no panel is rendered until a row is hovered or focused",
      (await tab.evaluate(`document.querySelectorAll("#skills [data-skill-panel]").length`)) === 0,
    );
  },
);

// A skill's "used in" panel: the projects it was used in as buttons (a job merged with its
// project among them), then the jobs and courses in one muted line. Clicking a project goes to
// its row in the list, selected but not opened, whatever folder filter was on.
const SKILL = (name) => `document.querySelector('#skills [data-skill="${name}"]')`;
const PANEL = `document.querySelector("#skills [data-skill-panel]")`;
// The panel's project buttons whose name isn't ppeo scan (the only professional-folder project).
const NOT_PPEO = `[...document.querySelectorAll("#skills [data-skill-panel] button")].filter((b) => !b.innerText.includes("ppeo scan"))`;
// A project button's name: without the tree prefix, the " at org" and the "(via …)".
const projName = `(b) => b.innerText.replace(/^.*█\\s*/, "").replace(/\\s+at\\s.*$/, "").replace(/\\s*\\(.*$/, "").trim()`;
// Where the page is after a jump to a project row: no project page, the row selected inside the band.
const LANDED = (title) => `(() => {
  const cs = getComputedStyle(document.documentElement),
    nav = parseFloat(cs.getPropertyValue("--nav-h")) || 56, bar = parseFloat(cs.getPropertyValue("--bar-h")) || 40,
    row = document.querySelector('[data-row][aria-current="true"]'), r = row && row.getBoundingClientRect();
  return { path: location.pathname, detail: !!document.querySelector("[data-detail-title]"),
    all: document.querySelector('[aria-label="project folders"] button[aria-pressed="true"]')?.innerText.includes("projects/"),
    row: row ? row.innerText : null, named: !!row && row.innerText.includes(${JSON.stringify(title)}),
    inBand: !!r && r.top >= nav - 1 && r.bottom <= innerHeight - bar + 1,
    focused: document.activeElement === row, panel: !!document.querySelector("#skills [data-skill-panel]") };
})()`;

await run("skills panel jumps to a project (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  // Filter the list to the professional folder, so the project picked below is hidden by it.
  await tab.click(
    `[...document.querySelectorAll('[aria-label="project folders"] button')].find((b) => b.innerText.includes("professional"))`,
  );
  await sleep(300);
  await tab.evaluate(`document.getElementById("skills").scrollIntoView({ block: "center" })`);
  await sleep(500);
  const height = await tab.evaluate(`document.documentElement.scrollHeight`);
  const at = await tab.evaluate(
    `(() => { const r = ${SKILL("Python")}.getBoundingClientRect(); return { x: r.x + 30, y: r.y + r.height / 2 }; })()`,
  );
  await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  await sleep(250);
  const panel = await tab.evaluate(`(() => {
    const p = ${PANEL}; if (!p) return null;
    const r = p.getBoundingClientRect(), last = p.lastElementChild;
    return { projects: p.querySelectorAll("button").length, first: p.children[0].tagName,
      mutedLast: last.tagName === "DIV", rest: last.innerText, bottom: Math.round(r.bottom), h: document.documentElement.scrollHeight,
      sr: document.querySelectorAll("#skills [data-skill-panel]").length };
  })()`);
  check("hovering a skill opens one panel", panel && panel.sr === 1, panel);
  check(
    "it lists projects as buttons, then a muted jobs and courses line",
    panel && panel.projects > 0 && panel.mutedLast && /[▓▒]/.test(panel.rest),
    panel,
  );
  check("opening it changes no height", panel && panel.h === height, { panel, height });
  const title = await tab.evaluate(`(${projName})(${NOT_PPEO}[0])`);
  await tab.click(`${NOT_PPEO}[0]`);
  await sleep(1500);
  const after = await tab.evaluate(LANDED(title));
  check("a project outside the filter is listed under its name", title.length > 0, { title });
  check(
    "the click opened no project page",
    !/\/projects\//.test(after.path) && !after.detail,
    after,
  );
  check("the folder filter went back to all", after.all === true, after);
  check("its row is the selected one", after.named, after);
  check("the row is on screen between the bars", after.inBand, after);
  check("the panel closed and focus is on the row", !after.panel && after.focused, after);
});

await run("skills panel by keyboard (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#skills");
  await tab.key("Tab"); // keyboard modality, so a script focus counts as :focus-visible
  await tab.evaluate(`${SKILL("Python")}.focus()`);
  await sleep(250);
  check("a focused row opens its panel", await tab.evaluate(`!!${PANEL}`));
  await tab.key("Tab");
  check(
    "Tab goes on into the panel's first project",
    await tab.evaluate(`document.activeElement.matches("[data-skill-panel] button")`),
  );
  await tab.key("Escape");
  const esc = await tab.evaluate(
    `({ panel: !!${PANEL}, row: document.activeElement === ${SKILL("Python")} })`,
  );
  check("Esc closes the panel and keeps focus on its row", !esc.panel && esc.row, esc);
  await tab.key("Tab"); // Tab made the next focus, like a user coming back to the row
  await tab.evaluate(`${SKILL("Python")}.focus()`);
  await sleep(250);
  await tab.key("Tab");
  const title = await tab.evaluate(`(${projName})(document.activeElement)`);
  await tab.key("Enter");
  await sleep(1500);
  const after = await tab.evaluate(LANDED(title));
  check(
    "Enter on a project selects its row, opening nothing",
    after.named && !after.detail && !/\/projects\//.test(after.path),
    after,
  );
});

// Tab follows the j/k selection: the selected row has real focus, so the next Tab goes on from
// it, and a row that takes focus by Tab becomes the selection.
await run("focus follows the j/k selection and the other way (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#projects");
  await tab.key("j");
  const at = () =>
    tab.evaluate(`(() => { const a = document.activeElement, cur = document.querySelector('[data-row][aria-current="true"]');
      return { focused: a.dataset.row ?? null, current: cur ? cur.dataset.row : null }; })()`);
  const first = await at();
  check(
    "j puts focus on the selected project row",
    first.focused === "0" && first.current === "0",
    first,
  );
  await tab.key("Tab");
  const next = await at();
  check(
    "Tab goes on to the next row, which becomes the selection",
    next.focused === "1" && next.current === "1",
    next,
  );
  await tab.key("j");
  const down = await at();
  check("and j carries on from there", down.focused === "2" && down.current === "2", down);
});

// The skill selection and where focus is, for the skill cases.
const SKILL_STATE = `(() => { const a = document.activeElement, cur = document.querySelector('[data-skillrow][aria-current="true"]');
  return { focused: a.dataset?.skillrow ?? null, current: cur ? cur.dataset.skillrow : null,
    heading: a.matches("[data-sec] > h2"), inPanel: !!a.closest("[data-skill-panel]"),
    panel: document.querySelector("[data-skill-panel]")?.parentElement.dataset.skill ?? null,
    stops: document.querySelectorAll('[data-skillrow][tabindex="0"]').length }; })()`;

await run("skills are j/k stops with a panel you can walk (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#skills");
  const row = () => tab.evaluate(SKILL_STATE);
  for (let i = 0; i < 3; i++) await tab.key("j");
  const third = await row();
  check(
    "j walks into the skills: the row is selected and focused",
    third.focused === "2" && third.current === "2",
    third,
  );
  check(
    "its panel shows with it, and the list is one Tab stop",
    third.panel === "Python" && third.stops === 1,
    third,
  );
  await tab.key("Enter");
  const inPanel = () =>
    tab.evaluate(`(() => { const a = document.activeElement, btns = [...document.querySelectorAll("[data-skill-panel] button")];
      return { in: a.matches("[data-skill-panel] button"), at: btns.indexOf(a), n: btns.length }; })()`);
  const entered = await inPanel();
  check(
    "Enter goes into the panel's first project",
    entered.in && entered.at === 0 && entered.n > 1,
    entered,
  );
  await tab.key("j");
  check("j moves to the next project", (await inPanel()).at === 1);
  await tab.key("ArrowUp");
  check("↑ moves back", (await inPanel()).at === 0);
  await tab.key("k");
  check("k wraps to the last", (await inPanel()).at === entered.n - 1);
  await tab.key("Escape");
  const out = await row();
  check(
    "Esc comes back to the skill and puts the panel away",
    out.focused === "2" && out.current === "2" && out.panel === null,
    out,
  );
  await tab.key("Enter");
  check("Enter goes back in", (await inPanel()).in);
  const title = await tab.evaluate(`(${projName})(document.activeElement)`);
  await tab.key("Enter");
  await sleep(1500);
  const after = await tab.evaluate(LANDED(title));
  check(
    "Enter on a project selects its row, opening nothing",
    after.named && !after.detail && !/\/projects\//.test(after.path),
    after,
  );
  await tab.key("j");
  check(
    "and j carries on in the projects",
    (await tab.evaluate(`document.activeElement.dataset.row`)) !== null,
  );
});

await run(
  "skills: Tab onto a row selects it, Tab leaves its panel, a second Esc clears (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("#skills");
    await tab.evaluate(`document.querySelector("#skills h2").focus()`);
    await tab.key("Tab");
    const first = await tab.evaluate(SKILL_STATE);
    check(
      "Tab from the heading lands on the first skill, selected, its panel showing",
      first.focused === "0" && first.current === "0" && first.panel === "JavaScript",
      first,
    );
    let tabs = 0,
      st = first;
    while (tabs < 40 && (st.focused !== null || st.inPanel)) {
      await tab.key("Tab");
      tabs++;
      st = await tab.evaluate(SKILL_STATE);
    }
    check(
      "Tab walks through the panel and out of it, with no trap",
      tabs < 40 && st.panel === null && !st.inPanel,
      { tabs, st },
    );

    await tab.go("#skills");
    await tab.key("j");
    await tab.key("Escape");
    const hidden = await tab.evaluate(SKILL_STATE);
    check(
      "Esc hides the panel and keeps the skill selected and focused",
      hidden.panel === null && hidden.focused === "0" && hidden.current === "0",
      hidden,
    );
    await tab.key("Escape");
    const cleared = await tab.evaluate(SKILL_STATE);
    check(
      "a second Esc clears the selection and focus goes to the heading with it",
      cleared.current === null && cleared.focused === null && cleared.heading,
      cleared,
    );
  },
);

await run(
  "skills with shortcuts off: arrows and Enter work, j/k don't (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("#skills");
    await tab.evaluate(`localStorage.setItem("danny-keys", "off")`);
    await tab.go("#skills");
    await tab.key("j");
    check("j does nothing", (await tab.evaluate(SKILL_STATE)).current === null);
    await tab.key("ArrowRight");
    const sel = await tab.evaluate(SKILL_STATE);
    check("→ still selects the first skill", sel.focused === "0" && sel.current === "0", sel);
    await tab.key("Enter");
    const at = () =>
      tab.evaluate(
        `[...document.querySelectorAll("[data-skill-panel] button")].indexOf(document.activeElement)`,
      );
    check("Enter goes into its panel", (await at()) === 0);
    await tab.key("ArrowDown");
    check("↓ moves to the next project", (await at()) === 1);
    await tab.key("j");
    check("j doesn't", (await at()) === 1);
    await tab.key("Escape");
    check("Esc comes back to the skill", (await tab.evaluate(SKILL_STATE)).focused === "0");
  },
);

await run(
  "skills panel tap jumps to a project (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("#skills");
    const y0 = await tab.evaluate(`scrollY`);
    await tab.tap(SKILL("Python"));
    await sleep(300);
    const open = await tab.evaluate(`(() => {
    const p = ${PANEL}; if (!p) return null;
    const r = p.getBoundingClientRect(), cs = getComputedStyle(document.documentElement);
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth,
      nav: parseFloat(cs.getPropertyValue("--nav-h")), bar: parseFloat(cs.getPropertyValue("--bar-h")), y: scrollY, buttons: p.querySelectorAll("button").length };
  })()`);
    check(
      "tapping a skill opens its panel without moving the page",
      open && open.buttons > 0 && open.y === y0,
      { open, y0 },
    );
    check(
      "the panel sits between the bars and inside the width",
      open &&
        open.top >= open.nav &&
        open.bottom <= 844 - open.bar &&
        open.left >= 0 &&
        open.right <= open.vw,
      open,
    );
    await tab.tap(`document.querySelector("#skills [class*=label]")`);
    await sleep(200);
    check("a tap elsewhere puts it away", !(await tab.evaluate(`!!${PANEL}`)));
    await tab.tap(SKILL("Python"));
    await sleep(300);
    const title = await tab.evaluate(
      `(${projName})(document.querySelector("#skills [data-skill-panel] button"))`,
    );
    await tab.tap(`document.querySelector("#skills [data-skill-panel] button")`);
    await sleep(1500);
    const after = await tab.evaluate(LANDED(title));
    check(
      "tapping a project selects its row, opening nothing",
      after.named && !after.detail && !/\/projects\//.test(after.path),
      after,
    );
    check("the row is on screen between the bars", after.inBand, after);
  },
);

// The resume page: a viewer that draws public/Danny_s_Resume.pdf with pdf.js (a worker, a
// canvas, a selectable text layer, the file's links laid over it) and the controls of a
// basic reader. `d` and `p` aren't sent here (a download and a print dialog); the key
// decisions are pinned by test/resumeKeys.test.mjs.
// An expression that gives the dark-pixel count of each page's canvas, as an array.
const INKS = `[...document.querySelectorAll("[data-page]")].map((p) => { const c = p.querySelector("canvas"); if (!c) return 0;
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 3] > 0) n++; return n; })`;
// The served PDF's page count, read from the file itself (not from the viewer under test): a page
// object is `/Type /Page` (not `/Pages`), in plain text or inside an inflated object stream.
const PDF_PAGES = (() => {
  const raw = readFileSync(join(OUT, "Danny_s_Resume.pdf")).toString("latin1");
  let text = raw;
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      text += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      // not a Flate stream: nothing to read
    }
  }
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
})();
const RESUME = {
  // Dark pixels on the first page's canvas: it is drawn, not blank.
  ink: `(() => (${INKS})[0] ?? 0)()`,
  inks: INKS,
  zoom: `document.querySelector("output").textContent.trim()`,
  pageW: `Math.round(document.querySelector("[data-page]").getBoundingClientRect().width)`,
  text: `document.querySelector("[data-page]").innerText`,
};
await run("the resume link leads to the viewer, in a new tab (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  const a = await tab.evaluate(`(() => { const a = document.querySelector('footer a[data-key="r"]');
    return { href: new URL(a.href).pathname, target: a.target, rel: a.rel }; })()`);
  check(
    "resume ↗ is the viewer page, opened in a new tab that keeps its opener",
    a.href === "/Portfolio/resume/" && a.target === "_blank" && a.rel.includes("opener"),
    a,
  );
});

await run("resume page draws the pdf (1291×808)", DESKTOP, async (tab) => {
  await tab.go("resume/", 4000);
  // Every page of the file is drawn, and has ink (the file has one page today, but the check
  // doesn't depend on that).
  const inks = await tab.evaluate(RESUME.inks);
  check(
    "every page of the PDF is drawn, with ink on it",
    PDF_PAGES >= 1 && inks.length === PDF_PAGES && inks.every((n) => n > 5000),
    { PDF_PAGES, inks },
  );
  const text = await tab.evaluate(RESUME.text);
  check(
    "its text is selectable (a text layer)",
    text.includes("Danny Hu") && text.includes("IESO"),
    {
      text: text.slice(0, 80),
    },
  );
  check(
    "the text carries no email address or phone number",
    !/[\w.+-]+@[\w-]+\.[a-z]{2,}|\b\d{3}-\d{4}\b|\(\d{3}\)/i.test(text),
  );
  check("it opens at its printed size", (await tab.evaluate(RESUME.zoom)) === "100%", {
    zoom: await tab.evaluate(RESUME.zoom),
  });
  // The file's GitHub link sits over the header and is what a click would hit.
  const link = await tab.evaluate(`(() => {
    const a = document.querySelector('[data-page] a[href="https://github.com/Danh295"]');
    if (!a) return null;
    const r = a.getBoundingClientRect(), p = document.querySelector("[data-page]").getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { hit: hit === a, fromTop: Math.round(r.top - p.top), pageH: Math.round(p.height),
      blank: a.target === "_blank" && a.rel.includes("noreferrer") };
  })()`);
  check(
    "the GitHub link is in the header, on top, and opens in a new tab",
    link && link.hit && link.fromTop < link.pageH * 0.12 && link.blank,
    link,
  );
  const dl = await tab.evaluate(`(() => { const a = document.querySelector("a[download]");
    return { href: a.getAttribute("href"), name: a.getAttribute("download") }; })()`);
  check(
    "download offers the file under a clean name",
    dl.href.endsWith("/Danny_s_Resume.pdf") && dl.name === "Danny_Hu_Resume.pdf",
    dl,
  );
  const home = await tab.evaluate(
    `document.querySelector('a[href$="/Portfolio/"], a[href="/"]')?.textContent`,
  );
  check("cd ~ leads home", home && home.includes("cd ~"), { home });
});

await run("resume page zooms in steps (1291×808)", DESKTOP, async (tab) => {
  await tab.go("resume/", 4000);
  const w0 = await tab.evaluate(RESUME.pageW);
  await tab.key("+");
  await sleep(500);
  check("+ goes to 125%", (await tab.evaluate(RESUME.zoom)) === "125%", {
    zoom: await tab.evaluate(RESUME.zoom),
  });
  const w1 = await tab.evaluate(RESUME.pageW);
  check("and the page grew by a quarter", Math.abs(w1 - Math.round((w0 - 2) * 1.25) - 2) <= 2, {
    w0,
    w1,
  });
  check("still drawn after the redraw", (await tab.evaluate(RESUME.ink)) > 5000);
  await tab.key("-");
  await tab.key("-");
  check("- twice goes to 75%", (await tab.evaluate(RESUME.zoom)) === "75%", {
    zoom: await tab.evaluate(RESUME.zoom),
  });
  await tab.key("0");
  await sleep(300);
  const fit = await tab.evaluate(`(() => { const s = document.querySelector("main");
    return { page: ${RESUME.pageW}, room: s.clientWidth - 32, zoom: ${RESUME.zoom} }; })()`);
  check("0 fits the page to the width", Math.abs(fit.page - fit.room) <= 2, fit);
  // Shortcuts off: the same keys do nothing.
  await tab.evaluate(`localStorage.setItem("danny-keys", "off")`);
  await tab.go("resume/", 4000);
  await tab.key("+");
  await sleep(300);
  check("with shortcuts off + does nothing", (await tab.evaluate(RESUME.zoom)) === "100%");
  const btn = await tab.click(
    `[...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "zoom in")`,
  );
  await sleep(500);
  check("the zoom in button still works", btn && (await tab.evaluate(RESUME.zoom)) === "125%", {
    zoom: await tab.evaluate(RESUME.zoom),
  });
  await tab.evaluate(`localStorage.removeItem("danny-keys")`);
});

for (const size of [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  await run(
    `resume page fits a phone at ${size.width}px (${size.width}×${size.height}, touch)`,
    { ...size, mobile: true },
    async (tab) => {
      await tab.go("resume/", 4000);
      const st = await tab.evaluate(`(() => ({
        page: document.documentElement.scrollWidth - innerWidth,
        stage: document.querySelector("main").scrollWidth - document.querySelector("main").clientWidth,
        bar: document.querySelector("header").scrollWidth - document.querySelector("header").clientWidth,
        pageW: ${RESUME.pageW}, zoom: ${RESUME.zoom},
        labels: [...document.querySelectorAll("[data-hint],[data-keyhint]")].filter((e) => e.getClientRects().length).length,
      }))()`);
      check(
        "the page opens fitted to the width, nothing sideways",
        st.page <= 0 && st.stage <= 0,
        st,
      );
      check("the toolbar fits", st.bar <= 0, st);
      check("no key labels on a touch screen", st.labels === 0, st);
      check("it is drawn, with ink on it", (await tab.evaluate(RESUME.ink)) > 3000, {
        ink: await tab.evaluate(RESUME.ink),
      });
    },
  );
}

// Zoomed past the screen's width, the page has to pan from its own left edge. In a centred
// flex column the overflow is split over both sides and the left half can't be scrolled to.
await run(
  "resume page pans to its left edge when zoomed in (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    for (let i = 0; i < 6; i++) {
      await tab.tap(
        `[...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "zoom in")`,
      );
      await sleep(150);
    }
    await sleep(800);
    const st =
      await tab.evaluate(`(() => { const m = document.querySelector("main"); m.scrollLeft = 0;
      return { zoom: ${RESUME.zoom}, left: Math.round(document.querySelector("[data-page]").getBoundingClientRect().left),
        over: m.scrollWidth - m.clientWidth }; })()`);
    check("the page is wider than the screen", st.over > 0, st);
    check("and its left edge is on screen when scrolled to the start", st.left >= 0, st);
  },
);

// The toolbar: leave on the left, the file's name in the middle, the tools on the right.
const TOOLBAR = `(() => {
  const r = (el) => el.getBoundingClientRect();
  const bar = document.querySelector("header");
  const q = (a) => bar.querySelector('[data-action="' + a + '"]');
  const text = (el) => el.innerText.trim().replace(/\\s+/g, " ");
  const name = bar.querySelector("h1"), leave = q("leave"), tools = q("zoomOut").closest("div");
  return {
    leave: text(leave), leaveRight: Math.round(r(leave).right),
    nameLeft: Math.round(r(name).left), nameRight: Math.round(r(name).right),
    nameOff: Math.round(Math.abs((r(name).left + r(name).right) / 2 - innerWidth / 2)),
    nameTop: Math.round(r(name).top), toolsLeft: Math.round(r(tools).left), toolsTop: Math.round(r(tools).top),
    zoomOut: text(q("zoomOut")), zoomIn: text(q("zoomIn")),
    borders: ["download", "print", "zoomIn", "fit"].map((a) => getComputedStyle(q(a)).borderTopWidth),
    pageText: /page \\d+ ?\\/ ?\\d+/.test(bar.innerText),
  };
})()`;
await run(
  "resume page: leave on the left, the name in the middle, the tools on the right (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("resume/", 4000);
    const t = await tab.evaluate(TOOLBAR);
    check(
      "cd ~ is on the left, with its [esc] hint",
      t.leave === "[esc] cd ~" && t.leaveRight < t.nameLeft,
      t,
    );
    check(
      "the file name is in the middle of the screen",
      t.nameOff <= 2 && t.nameRight < t.toolsLeft,
      t,
    );
    check("the zoom buttons are just [-] and [+]", t.zoomOut === "[-]" && t.zoomIn === "[+]", t);
    check(
      "download and print are bordered buttons, the zoom controls plain text",
      t.borders[0] === "1px" &&
        t.borders[1] === "1px" &&
        t.borders[2] === "0px" &&
        t.borders[3] === "0px",
      t,
    );
    check("and there is no page 1/1", !t.pageText, t);
  },
);
await run(
  "resume page: on a phone the name is centred above the tools, with no [esc] hint (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const t = await tab.evaluate(TOOLBAR);
    check(
      "the name is centred on the first row, the tools on the next",
      t.nameOff <= 2 && t.toolsTop > t.nameTop,
      t,
    );
    check(
      "cd ~ is there without a key hint, and the buttons are bordered",
      t.leave === "cd ~" && t.borders[0] === "1px" && t.borders[1] === "1px",
      t,
    );
  },
);

// Esc leaves. A tab the app opened (it has an opener) closes itself, which lands back on the app's
// tab; where the browser won't close it, or the visitor came straight here, it goes home in place.
await run(
  "resume page: Esc and cd ~ go home, or close a tab the app opened (1291×808)",
  DESKTOP,
  async (tab) => {
    const stub = (opener) =>
      tab.evaluate(`(() => { window.__closed = 0; window.close = () => { window.__closed++; };
      ${opener ? 'Object.defineProperty(window, "opener", { value: {}, configurable: true });' : ""} })()`);
    const home = (p) => p === "/Portfolio/" || p === "/Portfolio";
    await tab.go("resume/", 4000);
    await stub(false);
    await tab.key("Escape");
    await sleep(1200);
    const direct = await tab.evaluate(`({ path: location.pathname, closed: window.__closed })`);
    check(
      "straight here, Esc goes home without closing anything",
      home(direct.path) && direct.closed === 0,
      direct,
    );

    await tab.go("resume/", 4000);
    await stub(true);
    await tab.key("Escape");
    const soon = await tab.evaluate(`({ path: location.pathname, closed: window.__closed })`);
    check(
      "opened by the app, Esc closes the tab first",
      soon.closed === 1 && soon.path.endsWith("/resume/"),
      soon,
    );
    await sleep(900);
    check("and where that is refused it goes home", home(await tab.evaluate("location.pathname")));

    await tab.go("resume/", 4000);
    await stub(true);
    await tab.click(`document.querySelector('[data-action="leave"]')`);
    const clicked = await tab.evaluate(`({ closed: window.__closed, path: location.pathname })`);
    check(
      "clicking cd ~ does the same",
      clicked.closed === 1 && clicked.path.endsWith("/resume/"),
      clicked,
    );
  },
);

// The app's own tab for the resume keeps its opener, which is what lets that tab close itself;
// other sites' tabs never do.
await run(
  "the resume opens with its opener kept, other sites without (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("#home");
    await tab.evaluate(
      `window.__open = []; window.open = (...a) => { __open.push(a); return null; };`,
    );
    await tab.key("r");
    await tab.key("g");
    const opened = await tab.evaluate("window.__open");
    check(
      "r opens the resume page in a new tab with no noopener",
      opened[0] &&
        opened[0][0].endsWith("/Portfolio/resume/") &&
        opened[0][1] === "_blank" &&
        opened[0][2] == null,
      { opened },
    );
    check("g (GitHub) still opens with noopener", opened[1] && opened[1][2] === "noopener", {
      opened,
    });
  },
);

// A phone turned sideways (or a resized window, or a scrollbar appearing) changes the room the
// page has: while the zoom is the opening fit it follows the room, and once the visitor has
// zoomed by hand it stays where they put it.
await run(
  "resume page re-fits when the screen changes size, until zoomed by hand (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    const resize = (width, height) =>
      tab.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: true,
      });
    const ROOM = `(() => { const s = document.querySelector("main");
      return { page: ${RESUME.pageW}, room: s.clientWidth - 32, zoom: ${RESUME.zoom} }; })()`;
    await tab.go("resume/", 4000);
    const portrait = await tab.evaluate(ROOM);
    await resize(700, 390);
    await sleep(1200);
    const landscape = await tab.evaluate(ROOM);
    check(
      "turned to landscape, the page is re-fitted to the new width",
      Math.abs(landscape.page - landscape.room) <= 2 && landscape.page > portrait.page,
      { portrait, landscape },
    );
    await resize(390, 844);
    await sleep(1200);
    const back = await tab.evaluate(ROOM);
    check("and back again", Math.abs(back.page - back.room) <= 2, { back });
    await tab.tap(
      `[...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "zoom in")`,
    );
    await sleep(700);
    const byHand = await tab.evaluate(ROOM);
    await resize(700, 390);
    await sleep(1200);
    const after = await tab.evaluate(ROOM);
    check("after zooming by hand, a resize leaves the zoom alone", after.zoom === byHand.zoom, {
      byHand,
      after,
    });
  },
);

// Exact touches for the gesture checks (Input.dispatchTouchEvent takes the fingers' positions,
// so each check chooses where they start; synthesizePinchGesture can't).
const touchPoints = (xs, y) =>
  xs.map((x, i) => ({ x, y, id: i + 1, radiusX: 4, radiusY: 4, force: 1 }));
async function pinchOn(tab, { x = 195, y, from = 30, to = 60, steps = 12, stagger = 0 }) {
  if (stagger) {
    // The second finger lands a moment after the first, as a real pinch does.
    await tab.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: touchPoints([x - from], y),
    });
    await sleep(stagger);
  }
  await tab.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touchPoints([x - from, x + from], y),
  });
  for (let i = 1; i <= steps; i++) {
    const half = from + ((to - from) * i) / steps;
    await tab.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: touchPoints([x - half, x + half], y),
    });
    await sleep(20);
  }
  await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(600);
}
async function tapAt(tab, x, y) {
  await tab.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touchPoints([x], y),
  });
  await sleep(40);
  await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const PHONE_STATE = `(() => { const p = document.querySelector("[data-page]").getBoundingClientRect();
  return { vv: +visualViewport.scale.toFixed(3), label: ${RESUME.zoom}, pageW: Math.round(p.width),
    headerW: Math.round(document.querySelector("header").getBoundingClientRect().width),
    fx: +((195 - p.left) / p.width).toFixed(3), fy: +((200 - p.top) / p.height).toFixed(3) }; })()`;
const pct = (label) => parseInt(label, 10);

// Two fingers on the PDF zoom the PDF, not the whole browser page: the label follows, the
// toolbar stays the size it was, and the spot between the fingers stays between them.
await run(
  "resume page: a pinch on the page zooms the PDF, not the site (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const before = await tab.evaluate(PHONE_STATE);
    await pinchOn(tab, { y: 200, from: 30, to: 60 }); // twice as far apart
    const after = await tab.evaluate(PHONE_STATE);
    check(
      "the browser's own page zoom stayed at 1 (the toolbar didn't grow)",
      after.vv === 1 && after.headerW === before.headerW,
      { before, after },
    );
    check("the label follows the pinch", pct(after.label) > pct(before.label) * 1.8, {
      before,
      after,
    });
    check("and the page grew with it", after.pageW > before.pageW * 1.8, { before, after });
    check(
      "the spot between the fingers is still between them",
      Math.abs(after.fx - before.fx) < 0.03 && Math.abs(after.fy - before.fy) < 0.03,
      { before, after },
    );
  },
);

// Fingers never land at the same instant: a pinch whose second finger comes 60ms after the first
// (before anything has moved) must work too. (A pinch can't start in the middle of a one-finger
// scroll: the browser has taken that finger and cancelled its pointer. Left on purpose.)
await run(
  "resume page: a pinch whose second finger lands a moment later still zooms the PDF (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const before = await tab.evaluate(PHONE_STATE);
    await pinchOn(tab, { y: 300, from: 30, to: 60, stagger: 60 });
    const after = await tab.evaluate(PHONE_STATE);
    check(
      "the PDF zoomed and the browser's own zoom didn't",
      pct(after.label) > pct(before.label) * 1.8 && after.vv === 1,
      { before, after },
    );
  },
);

// The toolbar is outside the stage: a pinch with both fingers inside it is still the browser's.
await run(
  "resume page: a pinch inside the toolbar still zooms the whole page (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const before = await tab.evaluate(PHONE_STATE);
    await pinchOn(tab, { y: 24, from: 30, to: 90 }); // the browser needs a wider span to start
    const after = await tab.evaluate(PHONE_STATE);
    check("the browser zoomed the page (a way to magnify the toolbar remains)", after.vv > 1, {
      before,
      after,
    });
    check("and the PDF's own zoom didn't move", after.label === before.label, { before, after });
  },
);

await run(
  "resume page: a double-tap flips between fit and 100% (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const fit = await tab.evaluate(RESUME.zoom);
    await tapAt(tab, 195, 300);
    await sleep(80);
    await tapAt(tab, 195, 300);
    await sleep(700);
    check("from fit, a double-tap goes to 100%", (await tab.evaluate(RESUME.zoom)) === "100%", {
      fit,
      now: await tab.evaluate(RESUME.zoom),
    });
    await tapAt(tab, 195, 300);
    await sleep(80);
    await tapAt(tab, 195, 300);
    await sleep(700);
    check("and the next one back to fit", (await tab.evaluate(RESUME.zoom)) === fit, {
      fit,
      now: await tab.evaluate(RESUME.zoom),
    });
  },
);

// A laptop trackpad pinch arrives as Ctrl+wheel: over the page it zooms the PDF and the browser
// doesn't also zoom (default prevented); the wheel without Ctrl still just scrolls.
await run(
  "resume page: Ctrl+wheel over the page zooms the PDF (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("resume/", 4000);
    await tab.evaluate(
      `window.__wheel = []; document.addEventListener("wheel", (e) => __wheel.push(e.defaultPrevented));`,
    );
    const wheel = (deltaY, modifiers) =>
      tab.send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 640,
        y: 400,
        deltaX: 0,
        deltaY,
        modifiers,
      });
    await wheel(-50, 2); // Ctrl
    await sleep(500);
    check("Ctrl+wheel up zooms in (e^0.25 = 128%)", (await tab.evaluate(RESUME.zoom)) === "128%", {
      zoom: await tab.evaluate(RESUME.zoom),
    });
    check("and the browser's own zoom is prevented", (await tab.evaluate("__wheel[0]")) === true);
    await wheel(-50, 0);
    await sleep(300);
    check(
      "without Ctrl the wheel is left alone",
      (await tab.evaluate(RESUME.zoom)) === "128%" && (await tab.evaluate("__wheel[1]")) === false,
    );
  },
);

// A wheel or pinch event that doesn't change the zoom must not end the opening fit: after it, a
// narrower window still re-fits the page (deltaY 0 asks for no zoom at all).
await run(
  "resume page: an event that changes nothing keeps the fit following (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("resume/", 4000);
    const before = await tab.evaluate(RESUME.zoom);
    await tab.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 640,
      y: 400,
      deltaX: 0,
      deltaY: 0,
      modifiers: 2,
    });
    await sleep(300);
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width: 600,
      height: 808,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(1200);
    const after = await tab.evaluate(RESUME.zoom);
    check("the page still re-fits when the window narrows", before === "100%" && pct(after) < 80, {
      before,
      after,
    });
  },
);

// Wheel events can arrive several to a frame: each must build on the one before, not on the zoom
// the screen last showed. Three notches fired in one task: 1.284 × 1.284 × 1.284 = 2.117.
await run("resume page: wheel events within one frame add up (1291×808)", DESKTOP, async (tab) => {
  await tab.go("resume/", 4000);
  await tab.evaluate(`(() => { const stage = document.querySelector("main");
    for (let i = 0; i < 3; i++)
      stage.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, clientX: 640, clientY: 400, bubbles: true, cancelable: true })); })()`);
  await sleep(600);
  check("three notches in one task give 212%", (await tab.evaluate(RESUME.zoom)) === "212%", {
    zoom: await tab.evaluate(RESUME.zoom),
  });
});

// The phone toolbar's controls are text-sized but reach 44px rows (an invisible ::before).
await run(
  "resume page: toolbar taps reach 44px on a phone (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const misses =
      await tab.evaluate(`[...document.querySelectorAll("header button, header a")].flatMap((el) => {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2;
      return [r.top - 6, r.bottom + 6]
        .filter((y) => document.elementFromPoint(cx, y)?.closest("button, a") !== el)
        .map((y) => el.textContent.trim() + " @" + Math.round(y));
    })`);
    const sizes = await tab.evaluate(
      `[...document.querySelectorAll("header button, header a")].map((el) => Math.round(el.getBoundingClientRect().height))`,
    );
    check("a tap 6px above or below each control still hits it", misses.length === 0, { misses });
    check(
      "while the controls themselves stay text-sized",
      sizes.every((h) => h <= 36),
      { sizes },
    );
  },
);

// A key or a touch flashes the control it activates (src/lib/pressFx.js), a mouse click doesn't.
await run(
  "resume page: a key and a touch flash their button (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    const flashed = (action) =>
      tab.evaluate(
        `document.querySelector('[data-action="${action}"]')?.hasAttribute("data-pressed")`,
      );
    await tab.keyDown("+");
    await sleep(40);
    check("the + key flashes the zoom-in button", await flashed("zoomIn"));
    await tab.keyUp("+");
    await sleep(400);
    await tab.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: touchPoints(
        [
          await tab.evaluate(
            `Math.round(document.querySelector('[data-action="fit"]').getBoundingClientRect().left + 10)`,
          ),
        ],
        await tab.evaluate(
          `Math.round(document.querySelector('[data-action="fit"]').getBoundingClientRect().top + 8)`,
        ),
      ),
    });
    await sleep(40);
    check("a touch flashes the fit button", await flashed("fit"));
    await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  },
);

// Print sends the file itself: through a hidden frame where the browser prints PDFs reliably, by
// opening it where it doesn't (touch, Safari). A print dialog can't be driven, so check the route.
await run(
  "resume page: print uses the PDF file, in a frame on a desktop (1291×808)",
  DESKTOP,
  async (tab) => {
    await tab.go("resume/", 4000);
    await tab.evaluate(`Object.defineProperty(navigator, "pdfViewerEnabled", { get: () => true }); window.__opened = [];
    window.open = (u) => __opened.push(u);`);
    await tab.click(`document.querySelector('[data-action="print"]')`);
    await sleep(600);
    const st = await tab.evaluate(
      `({ frames: [...document.querySelectorAll("iframe")].map((f) => new URL(f.src).pathname), opened: window.__opened })`,
    );
    check(
      "a hidden frame loads the PDF file",
      st.frames.length === 1 && st.frames[0].endsWith("/Danny_s_Resume.pdf"),
      st,
    );
  },
);
await run(
  "resume page: print opens the PDF file on a phone (390×844, touch)",
  { width: 390, height: 844, mobile: true },
  async (tab) => {
    await tab.go("resume/", 4000);
    await tab.evaluate(`window.__opened = []; window.open = (u) => __opened.push(u);`);
    await tab.tap(`document.querySelector('[data-action="print"]')`);
    await sleep(400);
    const st = await tab.evaluate(
      `({ frames: document.querySelectorAll("iframe").length, opened: window.__opened })`,
    );
    check(
      "the file opens for the browser's own viewer, with no frame",
      st.frames === 0 && st.opened.length === 1 && st.opened[0].endsWith("/Danny_s_Resume.pdf"),
      st,
    );
  },
);

// Leaving while the page is still being drawn must not log an error (a render the destroyed
// document rejects is not a failure).
await run("resume page can be left mid-render (1291×808)", DESKTOP, async (tab) => {
  await tab.go("resume/", 250);
  await tab.click(
    `[...document.querySelectorAll("a")].find((a) => a.textContent.includes("cd ~"))`,
  );
  await sleep(2500);
  const here = await tab.evaluate("location.pathname");
  check("cd ~ went home", here === "/Portfolio/" || here === "/Portfolio", { here });
});

await run("desktop shows key labels (1291×808)", DESKTOP, async (tab) => {
  await tab.go("#home");
  check("key labels are on screen", (await tab.evaluate(LABELS_SHOWN)) > 10, {
    shown: await tab.evaluate(LABELS_SHOWN),
  });
  check(
    "the egg's start box says click or enter",
    (await tab.evaluate(START_TEXT)) === "click or [↲] to start",
    { text: await tab.evaluate(START_TEXT) },
  );
  await tab.click(`document.querySelector("[data-egg]")`);
  await sleep(500);
  const rule = await tab.evaluate(
    `[...document.querySelectorAll('[role="dialog"][aria-label="how to play"] div')].map((d) => d.innerText).find((t) => t.includes("pull them out"))`,
  );
  check(
    "the rules card names the keys",
    /exactly \d.*: click, \[↲\] or \[space\]$/.test(rule ?? ""),
    {
      rule,
    },
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
