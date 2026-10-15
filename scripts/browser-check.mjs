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
    `(async () => { for (let t = 0; t < 12000; t += 250) { const intro = document.documentElement.classList.contains("boot-intro") || document.querySelector('[class*="Intro-module"]'); if (!intro && /try: tree projects/.test(${TERM_TEXT})) return; await new Promise((r) => setTimeout(r, 250)); } })()`,
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
    check("the skills legend shows", legends.includes("bar = share of"), { legends });
    check("no key legend shows", !legends.includes("[↲]") && !legends.includes("move"), {
      legends,
    });
  },
);

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
