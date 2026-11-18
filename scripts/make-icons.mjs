// Regenerates the favicon set (src/app/{icon.svg,icon.png,apple-icon.png,favicon.ico}) and the
// link-preview card (public/og-card.png) from a small ASCII egg. Run by hand (`node
// scripts/make-icons.mjs`) when the egg should change. The egg is drawn in ink on a transparent
// ground, once per tab colour: dark ink for light tabs (and Google's white results page), light ink
// for dark tabs. icon.svg switches by itself with prefers-color-scheme; the PNG/ICO pairs are
// linked with a media query in layout.js. apple-icon.png keeps a solid tile, since iOS fills
// transparency with black. public/og-card.png (1200×630, one file for og and twitter; site.ogImage)
// is the link-preview card: a shell window with `$ whoami`, the name and the egg (variant A of the
// prototype, 2026-10-29). public/icon-search.{png,ico} is the icon Google Search shows (linked from
// the host root page, danh295.github.io/: Google reads one icon per host, from its home page): the
// egg in paper glyphs inside a square tile of # glyphs, transparent outside the tile and between
// the strokes, so it reads as mid-grey on both Google themes (docs/research/favicon.md).
//
// Needs a Chrome-family browser to draw the PNGs: CHROME=/path/to/browser, else the macOS Chrome
// or Brave app, else google-chrome / chromium on PATH (the same search as browser-check.mjs).
// The SVGs embed scripts/make-icons-font.woff2, Plex Medium cut down to the glyphs the egg uses
// (the RAMP below plus "#" and space), about 1 KB instead of the 90 KB full face. To rebuild it
// after changing RAMP, with fontTools and brotli installed (pip install fonttools brotli):
//   pyftsubset src/app/fonts/plex/IBMPlexMono-Medium.woff2 --flavor=woff2 --no-hinting \
//     --layout-features= --drop-tables+=GSUB,GPOS,kern \
//     --unicodes=<the code points of FONT_GLYPHS> \
//     --output-file=scripts/make-icons-font.woff2
// Everything is checked first, drawn into a temp dir that is always removed, and only then
// written over the tracked files, so a failure leaves the old icons as they were.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const at = (p) => join(ROOT, p);
// What the subset font holds (see above); the egg's glyphs must all be in it.
const FONT_GLYPHS = " .,:-~=+*#%@";

const N = 24; // grid is N×N cells, each 8×8 in a 192×192 box
const CELL = 8;
const BG = "#121211"; // the apple-icon tile
const DARK_INK = "#161615"; // egg on a light tab
const LIGHT_INK = "#ECEAE5"; // egg on a dark tab
// Lit side densest: on a dark tile, more ink reads as brighter.
const RAMP = ".,:-~=+*#%@";

// An egg standing slightly tilted, lit from the upper left, orthographic, z-buffered.
const EGG_H = 1.3; // half-height: taller than wide, narrowing toward the top
const tilt = -0.22;
const [ct, st] = [Math.cos(tilt), Math.sin(tilt)];
const L = [-0.45, 0.55, 0.7];
const ln = Math.hypot(...L);
const light = L.map((c) => c / ln);
const egg = (v, u) => {
  const r = Math.sqrt(1 - v * v) * (1 - 0.3 * v);
  return [r * Math.cos(u), v * EGG_H, r * Math.sin(u)];
};
const rot = ([x, y, z]) => [x * ct - y * st, x * st + y * ct, z];
const sub = (a, b) => a.map((c, i) => c - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const scale = (N * 0.5 * 0.9) / EGG_H;
const lg = Array.from({ length: N }, () => Array(N).fill(-1)); // light per cell, -1 = empty
const zb = Array.from({ length: N }, () => Array(N).fill(-Infinity));
const dv = 0.002;
const du = 0.004;
for (let v = -0.999; v <= 0.999; v += dv) {
  for (let u = 0; u < Math.PI * 2; u += du) {
    const p = rot(egg(v, u));
    const n = cross(sub(rot(egg(v + 1e-3, u)), p), sub(rot(egg(v, u + 1e-3)), p));
    const nl = Math.hypot(...n) || 1;
    const dir = n[2] < 0 ? -1 : 1; // face the viewer
    const key = Math.max(0, (dir * (n[0] * light[0] + n[1] * light[1] + n[2] * light[2])) / nl);
    // Weak bounce light from the lower right so the shadow side keeps a gradient.
    const bounce = Math.max(0, (dir * (n[0] * 0.8 - n[1] * 0.3)) / nl);
    const lam = Math.min(1, key ** 1.6 + 0.35 * bounce * (1 - key));
    if (p[2] <= 0) continue; // far side hidden
    const x = Math.floor(N / 2 + p[0] * scale);
    const y = Math.floor(N / 2 - p[1] * scale);
    if (x < 0 || x >= N || y < 0 || y >= N || p[2] <= zb[y][x]) continue;
    zb[y][x] = p[2];
    lg[y][x] = lam;
  }
}

// Smooth the light over neighbouring filled cells (1-2-1 kernel) so single cells don't jump a
// band away from their neighbours.
const blur = lg.map((row, y) =>
  row.map((l, x) => {
    if (l < 0) return -1;
    let sum = 0;
    let w = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const v = lg[y + j]?.[x + i] ?? -1;
        if (v < 0) continue;
        const k = (2 - Math.abs(i)) * (2 - Math.abs(j));
        sum += v * k;
        w += k;
      }
    return sum / w;
  }),
);
const grid = blur.map((row) =>
  row.map((l) => {
    if (l < 0) return " ";
    const k = (0.1 + 0.9 * l) * RAMP.length;
    return RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(k)))];
  }),
);

// The widest part of the egg bulges one column out for several rows and the outline steps
// in sharply on either side of it. Where a row near that band stops one column short of a
// neighbouring row's edge, a dim glyph is added so the edge eases in and out; it is run twice
// so the right edge, where the step is sharpest, gets a second row of them.
const first = (row) => row.findIndex((c) => c !== " ");
const last = (row) => row.findLastIndex((c) => c !== " ");
for (let pass = 0; pass < 2; pass++) {
  const adds = [];
  for (let y = N / 2 - 2; y <= N / 2 + 5; y++) {
    const [l, r] = [first(grid[y]), last(grid[y])];
    const near = (f, d) => [y - 1, y + 1].some((j) => f(grid[j]) === d);
    if (pass === 0 && near(first, l - 1)) adds.push([y, l - 1, "+"]);
    if (near(last, r + 1)) adds.push([y, r + 1, "-"]);
  }
  for (const [y, x, c] of adds) grid[y][x] = c;
}

const esc = (c) => (c === "<" ? "&lt;" : c === "&" ? "&amp;" : c);
// A dim solid body behind the glyphs, shaded by the same light: at 16-32px the thin strokes
// alone average out to a smudge, and the tab icon read as a plain square.
const body = grid
  .flatMap((row, y) =>
    row.map((c, x) =>
      c === " "
        ? ""
        : `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill-opacity="${(0.22 + 0.4 * Math.max(0, blur[y][x])).toFixed(2)}"/>`,
    ),
  )
  .join("");
const rows = grid
  .map(
    (row, i) =>
      `<text x="0" y="${i * CELL + 7}" textLength="${N * CELL}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${row.map(esc).join("")}</text>`,
  )
  .join("");
// The font travels inside the SVG, and the PNGs are drawn by Chrome from that same SVG, so
// the vector icon and every raster size show one identical egg on any device.
const font = readFileSync(at("scripts/make-icons-font.woff2")).toString("base64");
// `style` sets the egg's colour (`color`); `tile` puts a solid ground under it.
const makeSvg = (style, tile) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N * CELL} ${N * CELL}">` +
  `<style>@font-face{font-family:E;font-weight:500;src:url(data:font/woff2;base64,${font}) format("woff2")}${style}</style>` +
  (tile ? `<rect width="100%" height="100%" fill="${BG}"/>` : "") +
  `<g fill="currentColor">${body}<g font-family="E,monospace" font-weight="500" font-size="11">${rows}</g></g></svg>`;
const inkStyle = (ink) => `svg{color:${ink}}`;
const svgAdaptive = makeSvg(
  `${inkStyle(DARK_INK)}@media (prefers-color-scheme:dark){${inkStyle(LIGHT_INK)}}`,
);

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
const chrome = findChrome();
if (!existsSync(chrome)) throw new Error(`CHROME not found: ${chrome}`);
const missing = [...new Set([...RAMP, "#"])].filter((c) => !FONT_GLYPHS.includes(c));
if (missing.length) throw new Error(`add ${missing.join(" ")} to the subset font and FONT_GLYPHS`);
for (const p of [
  "src/app/fonts/plex/IBMPlexMono-Regular.woff2",
  "src/app/fonts/plex/IBMPlexMono-Medium.woff2",
])
  if (!existsSync(at(p))) throw new Error(`missing ${p}`);
const dir = mkdtempSync(join(tmpdir(), "icons-"));
try {
  // A 384px master of an SVG, drawn by Chrome on a transparent page.
  const render = (svg, name) => {
    const html = join(dir, `${name}.html`);
    const shot = join(dir, `${name}.png`);
    writeFileSync(
      html,
      `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:192px;height:192px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`,
    );
    execFileSync(chrome, [
      "--headless=new",
      "--hide-scrollbars",
      "--default-background-color=00000000",
      "--force-device-scale-factor=2",
      "--window-size=192,192",
      `--screenshot=${shot}`,
      `file://${html}`,
    ]);
    return readFileSync(shot);
  };
  const png = (master, size) =>
    sharp(master).resize(size, size, { kernel: "lanczos3" }).ensureAlpha().png().toBuffer();

  // An .ico of PNG entries.
  const ico = async (master, sizes) => {
    const imgs = await Promise.all(sizes.map((n) => png(master, n)));
    const head = Buffer.alloc(6 + 16 * sizes.length);
    head.writeUInt16LE(1, 2);
    head.writeUInt16LE(sizes.length, 4);
    let off = head.length;
    imgs.forEach((img, i) => {
      const e = 6 + 16 * i;
      head[e] = head[e + 1] = sizes[i];
      head.writeUInt16LE(1, e + 4);
      head.writeUInt16LE(32, e + 6);
      head.writeUInt32LE(img.length, e + 8);
      head.writeUInt32LE(off, e + 12);
      off += img.length;
    });
    return Buffer.concat([head, ...imgs]);
  };

  // The search icon: the egg 3 cells inside a T×T tile of "#", the egg's cells left out of it.
  const PAPER = LIGHT_INK;
  const O = 3;
  const T = N + 2 * O;
  const tileRows = Array.from({ length: T }, (_, y) =>
    Array.from({ length: T }, (_, x) => {
      const [ex, ey] = [x - O, y - O];
      return ex >= 0 && ex < N && ey >= 0 && ey < N && grid[ey][ex] !== " " ? " " : "#";
    }).join(""),
  )
    .map(
      (row, i) =>
        `<text x="0" y="${i * CELL + 7}" textLength="${T * CELL}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${row}</text>`,
    )
    .join("");
  const svgSearch =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T * CELL} ${T * CELL}">` +
    `<style>@font-face{font-family:E;font-weight:500;src:url(data:font/woff2;base64,${font}) format("woff2")}</style>` +
    `<g font-family="E,monospace" font-weight="500" font-size="11"><g fill="${DARK_INK}">${tileRows}</g>` +
    `<g fill="${PAPER}" transform="translate(${O * CELL},${O * CELL})">${body}${rows}</g></g></svg>`;

  const onLight = render(makeSvg(inkStyle(DARK_INK)), "light");
  const onDark = render(makeSvg(inkStyle(LIGHT_INK)), "dark");
  const tile = render(makeSvg(inkStyle(LIGHT_INK), true), "tile");

  const search = render(svgSearch, "search");
  // Everything drawn before anything is written.
  const out = {
    "src/app/icon.svg": svgAdaptive,
    "src/app/icon.png": await png(onLight, 192),
    "src/app/favicon.ico": await ico(onLight, [16, 32, 48]),
    "public/icon-dark.png": await png(onDark, 192),
    "public/favicon-dark.ico": await ico(onDark, [16, 32, 48]),
    "src/app/apple-icon.png": await png(tile, 180),
    "public/icon-search.png": await png(search, 192),
    "public/icon-search.ico": await ico(search, [16, 32, 48]),
  };

  // The link-preview card, drawn by Chrome from an HTML page: the egg from `svgAdaptive`'s light
  // twin, the text in Plex (Regular and Medium, embedded).
  const plex = (f) =>
    readFileSync(at(`src/app/fonts/plex/IBMPlexMono-${f}.woff2`)).toString("base64");
  const CARD = { fg: LIGHT_INK, mid: "#94928d", line: "#302f2c", soft: "#1d1c1b" };
  const eggImg = `data:image/svg+xml;base64,${Buffer.from(makeSvg(inkStyle(LIGHT_INK))).toString("base64")}`;
  const cardHtml = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:P;font-weight:400;src:url(data:font/woff2;base64,${plex("Regular")})}
@font-face{font-family:P;font-weight:500;src:url(data:font/woff2;base64,${plex("Medium")})}
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:630px;background:${BG};color:${CARD.fg};font-family:P,monospace;overflow:hidden;position:relative}
.win{position:absolute;inset:48px;border:2px solid ${CARD.line};background:${CARD.soft}}
.bar{height:56px;border-bottom:2px solid ${CARD.line};display:flex;align-items:center;padding:0 28px;color:${CARD.mid};font-size:24px}
.in{padding:44px 56px 0;color:${CARD.mid}}
</style>
<div class="win"><div class="bar">danny@portfolio: ~</div>
<div class="in" style="font-size:30px">$ whoami</div>
<div style="padding:44px 56px 0;font-size:116px;font-weight:500;line-height:1">danny hu</div>
<div style="padding:30px 56px 0;font-size:34px;color:${CARD.mid}">student and full-stack developer</div>
<div style="padding:34px 56px 0;font-size:30px;color:${CARD.mid}">$ <span style="background:${CARD.fg};color:${BG}">&nbsp;</span></div>
<img src="${eggImg}" width="300" height="300" style="position:absolute;right:56px;top:128px"></div>`;
  const cardHtmlPath = join(dir, "card.html");
  const cardShot = join(dir, "card.png");
  writeFileSync(cardHtmlPath, cardHtml);
  execFileSync(chrome, [
    "--headless=new",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    `--screenshot=${cardShot}`,
    `file://${cardHtmlPath}`,
  ]);
  out["public/og-card.png"] = readFileSync(cardShot);

  // Stage next to each target, then rename: a failed write leaves no half-written icon.
  for (const [p, data] of Object.entries(out)) writeFileSync(`${at(p)}.tmp`, data);
  for (const p of Object.keys(out)) renameSync(`${at(p)}.tmp`, at(p));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
for (const row of grid) console.log(row.join(""));
