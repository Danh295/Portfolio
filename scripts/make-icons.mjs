// Regenerates the favicon set from a small ASCII egg: src/app/{icon.svg,icon.png,apple-icon.png,
// favicon.ico}. Run by hand (`node scripts/make-icons.mjs`) when the egg should change.
// The egg sits on a solid ink tile: the old light-on-transparent glyphs vanished on the white
// page Google shows its result icons on.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const N = 24; // grid is N×N cells, each 8×8 in a 192×192 box
const CELL = 8;
const BG = "#121211";
const FG = "#ECEAE5";
// Lit side densest: on a dark tile, more ink reads as brighter.
const RAMP = ".,:-~=+*#%@";

// An egg standing slightly tilted, lit from the upper left, orthographic, z-buffered.
const tilt = -0.32;
const [ct, st] = [Math.cos(tilt), Math.sin(tilt)];
const L = [-0.45, 0.55, 0.7];
const ln = Math.hypot(...L);
const light = L.map((c) => c / ln);
const egg = (v, u) => {
  const r = Math.sqrt(1 - v * v) * (1 - 0.14 * v);
  return [r * Math.cos(u), v * 1.12, r * Math.sin(u)];
};
const rot = ([x, y, z]) => [x * ct - y * st, x * st + y * ct, z];
const sub = (a, b) => a.map((c, i) => c - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const scale = (N * 0.5 * 0.86) / 1.12;
const grid = Array.from({ length: N }, () => Array(N).fill(" "));
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
    const lam = Math.min(1, key + 0.35 * bounce * (1 - key));
    if (p[2] <= 0) continue; // far side hidden
    const x = Math.floor(N / 2 + p[0] * scale);
    const y = Math.floor(N / 2 - p[1] * scale);
    if (x < 0 || x >= N || y < 0 || y >= N || p[2] <= zb[y][x]) continue;
    zb[y][x] = p[2];
    const k = Math.min(RAMP.length - 1, Math.floor((0.1 + 0.95 * lam) * RAMP.length));
    grid[y][x] = RAMP[k];
  }
}

const esc = (c) => (c === "<" ? "&lt;" : c === "&" ? "&amp;" : c);
const rows = grid
  .map(
    (row, i) =>
      `<text x="0" y="${i * CELL + 7}" textLength="${N * CELL}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${row.map(esc).join("")}</text>`,
  )
  .join("");
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N * CELL} ${N * CELL}">` +
  `<rect width="100%" height="100%" fill="${BG}"/>` +
  `<g fill="${FG}" font-family="Menlo,Consolas,ui-monospace,monospace" font-weight="700" font-size="10.5">${rows}</g></svg>`;

const png = (size) =>
  sharp(Buffer.from(svg), { density: ((72 * size) / (N * CELL)) * 1 })
    .resize(size, size)
    .png()
    .toBuffer();

writeFileSync("src/app/icon.svg", svg);
writeFileSync("src/app/icon.png", await png(192));
writeFileSync("src/app/apple-icon.png", await png(180));

// favicon.ico: 16, 32 and 48px PNG entries.
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
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
writeFileSync("src/app/favicon.ico", Buffer.concat([head, ...imgs]));
for (const row of grid) console.log(row.join(""));
