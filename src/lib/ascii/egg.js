// ASCII egg + pot renderer. Pure functions: angles and scene state in, strings out.
// Ported as-is from the v4 design prototype — the constants are tuned by eye, so
// change them only while looking at the result.

export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const cl = (t) => Math.max(0, Math.min(1, t));

const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const DRIPS = [
  { th: 1.3, w: 0.07, s: 1 },
  { th: 1.85, w: 0.05, s: 0.75 },
  { th: 2.5, w: 0.04, s: 0.5 },
];

export const EGG_CONF = "*+x%o~^&#";
export const EGG_COLS = ["#E03E0B", "#F08C00", "#2F9E44", "#1C7ED6", "#AE3EC9"];

const R_P = 1.5,
  Y_BOT = -1.0,
  Y_TOP = 0.35,
  Y_W = 0.05;
const POT_EGGS = [
  [0.55, 0.5, 0.3],
  [-0.62, 0.42, 1.9],
  [0.5, -0.62, -0.8],
  [-0.45, -0.58, 2.6],
];
const ICE = [
  [0.05, 0.05],
  [0.95, -0.2],
  [-0.95, 0.1],
  [0.1, 1.0],
  [-0.1, -1.0],
];

/**
 * The full minigame scene: pot on a burner with four eggs, the ice bowl, and the
 * served egg. Z-buffered raster, one call per frame.
 *
 * S = { t, boil, flame, swap, serve, drip, lower, hover, yolk, conf, res }
 * (res: grid resolution relative to the original 10px font; 1 = original sampling)
 * Returns { base, layers } — `base` is the monochrome frame, `layers` maps a CSS
 * colour to a same-sized frame holding only the glyphs drawn in that colour
 * (flame, confetti), to be stacked on top in separate <pre>s.
 */
export function potArt(A, B, W, H, S) {
  // Sampling density: surfaces are sampled dk× finer on a dk× finer character grid so
  // they stay solid (no holes) at smaller font sizes.
  const dk = S.res || 1;
  const out = new Array(W * H).fill(" "),
    zb = new Float32Array(W * H),
    cm = new Array(W * H).fill(0),
    t = S.t;
  const sw = cl(S.swap),
    sv = cl(S.serve),
    drip = S.drip || 0;
  const lift = ease(cl(sw / 0.22)) * (1 - ease(cl((sw - 0.78) / 0.22)));
  const potX = -5.5 * ease(cl((sw - 0.22) / 0.28)),
    bowlX = sw > 0 ? 5.5 * (1 - ease(cl((sw - 0.5) / 0.28))) : 99;
  const sA_ = ease(cl(sv / 0.18)),
    sB_ = ease(cl((sv - 0.12) / 0.24)),
    sC = ease(cl((sv - 0.3) / 0.3)),
    crack = cl((sv - 0.6) / 0.16),
    capK = cl((sv - 0.8) / 0.2);
  const awayX = 5.5 * sB_;
  A = A - 0.32 * sC;
  const cA = Math.cos(A),
    sA = Math.sin(A),
    cB = Math.cos(B),
    sB = Math.sin(B);
  const K2 = 7,
    K1 = Math.min(H * 3.8 * 0.883, W * 1.9) * 0.64 * (1 + 1.5 * sC),
    yo = 0.4 - 0.4 * sC - 0.3 * (S.hover || 0),
    ln = Math.hypot(-0.35, 0.5, 0.8),
    Lx = -0.35 / ln,
    Ly = 0.5 / ln,
    Lz = 0.8 / ln;
  const SH = "@%#*+=~-:,..",
    POT = "@%#*+=-:.",
    INW = "#*+=-:.",
    WA = "=~~--..",
    ICEC = "#%@",
    YO = "*oO0@@",
    WH = "..,-",
    BWL = "%#*+=-:..";
  const FY = "#F08C00",
    FO = "#E03E0B",
    YOK = S.yolk === "hard" ? "-=+**#" : S.yolk === "firm" ? "+*ooO0" : YO;
  let ox = 0;
  const plot = (x, y, z, nx, ny, nz, ramp, col) => {
    x += ox * cB;
    z += ox * sB;
    y += yo;
    const x1 = x * cB + z * sB,
      z1 = -x * sB + z * cB,
      y2 = y * cA - z1 * sA,
      z2 = y * sA + z1 * cA;
    const ooz = 1 / (K2 - z2),
      xp = (W / 2 + K1 * ooz * x1) | 0,
      yp = (H / 2 - K1 * ooz * y2 * 0.6) | 0;
    if (xp < 0 || xp >= W || yp < 0 || yp >= H) return;
    const i = xp + yp * W;
    if (ooz <= zb[i]) return;
    zb[i] = ooz;
    if (ramp.length === 1) {
      out[i] = ramp;
      if (col) cm[i] = col;
      else if (cm[i]) cm[i] = 0;
      return;
    }
    const nx1 = nx * cB + nz * sB,
      nz1 = -nx * sB + nz * cB,
      ny2 = ny * cA - nz1 * sA,
      nz2 = ny * sA + nz1 * cA;
    const L = cl(0.3 + 0.75 * (nx1 * Lx + ny2 * Ly + nz2 * Lz));
    out[i] = ramp[Math.min(ramp.length - 1, (L * (ramp.length - 0.01)) | 0)];
    if (cm[i]) cm[i] = 0;
  };
  const RW = R_P - 0.06;
  // pot on the burner (slides out during the swap)
  if (potX > -5.4) {
    ox = potX;
    for (let y = Y_BOT; y <= Y_TOP; y += 0.022 / dk)
      for (let th = 0; th < 6.283; th += 0.016 / dk) {
        const c = Math.cos(th),
          s = Math.sin(th);
        plot(R_P * c, y, R_P * s, c, 0, s, POT);
        if (y > Y_W) plot((R_P - 0.05) * c, y, (R_P - 0.05) * s, -c, 0, -s, INW);
      }
    for (let th = 0; th < 6.283; th += 0.012 / dk)
      for (let r = R_P - 0.05; r <= R_P + 0.04; r += 0.03 / dk)
        plot(r * Math.cos(th), Y_TOP, r * Math.sin(th), 0, 1, 0, "=");
    [1, -1].forEach((sg) => {
      for (let u = R_P; u < R_P + 0.4; u += 0.02 / dk)
        for (let a = 0; a < 6.283; a += 0.5)
          plot(
            sg * u,
            0.18 + 0.05 * Math.cos(a),
            0.05 * Math.sin(a),
            0,
            Math.cos(a),
            Math.sin(a),
            POT,
          );
    });
    const yb = Y_BOT - 0.55;
    for (let th = 0; th < 6.283; th += 0.02 / dk)
      for (let r = 0.5; r <= 0.78; r += 0.04 / dk)
        plot(r * Math.cos(th), yb, r * Math.sin(th), 0, 1, 0, r > 0.74 ? "=" : "-");
    [0, 1, 2, 3].forEach((k) => {
      const th = k * 1.5708 + 0.785;
      for (let r = 0.8; r <= 1.7; r += 0.03 / dk)
        plot(r * Math.cos(th), yb + 0.02, r * Math.sin(th), 0, 1, 0, "=");
    });
    const bo = S.boil,
      hw = (x, z) =>
        bo *
          0.035 *
          (Math.sin(4.1 * x + t * 6.3) * Math.cos(3.7 * z - t * 5.1) +
            0.6 * Math.sin(5.3 * (x + z) + t * 7.7)) +
        0.01 * Math.sin(6 * x + t * 1.3) * Math.cos(7 * z - t * 1.1);
    for (let x = -RW; x <= RW; x += 0.02 / dk)
      for (let z = -RW; z <= RW; z += 0.02 / dk) {
        if (x * x + z * z > RW * RW) continue;
        const y0 = hw(x, z),
          gx = (hw(x + 0.01, z) - y0) / 0.01,
          gz = (hw(x, z + 0.01) - y0) / 0.01,
          n = Math.hypot(gx, 1, gz);
        plot(x, Y_W + y0, z, -gx / n, 1 / n, -gz / n, WA);
      }
    // bubbles: rise as fizz, swell, pop into a ring
    const sunk = S.lower > 0.5 && (S.hover || 0) < 0.5 && S.swap < 0.5;
    if (bo > 0.03)
      for (let i = 0, n = sunk ? 58 : 44; i < n; i++) {
        if (hash(i, 99) > bo) continue;
        // boil > 1 is a rolling boil: bubbles cycle faster (unchanged for boil ≤ 1)
        const Tp = (0.55 + (i % 5) * 0.14) / Math.max(1, bo),
          ph0 = t / Tp + i * 0.37,
          k = Math.floor(ph0),
          ph = ph0 - k;
        // Once the eggs sit in the water, re-roll bubbles that would hide under them,
        // so the rolling boil stays as busy as it was before they went in.
        let bx = 0,
          bz = 0;
        for (let tr = 0; tr < (sunk ? 6 : 1); tr++) {
          const rr = Math.sqrt(hash(i + 31 * tr, k)) * (RW - 0.15),
            an = hash(i + 9 + 31 * tr, k) * 6.283;
          bx = rr * Math.cos(an);
          bz = rr * Math.sin(an);
          if (!sunk || POT_EGGS.every(([ex, ez]) => (bx - ex) ** 2 + (bz - ez) ** 2 > 0.3)) break;
        }
        const big = bo > 0.6 && i % 3 === 0;
        if (ph < 0.88)
          plot(bx, Y_W + 0.05, bz, 0, 1, 0, ph < 0.5 ? "." : ph < 0.72 ? "o" : big ? "O" : "o");
        else {
          const rp = 0.06 + 0.9 * (ph - 0.88) * (big ? 1.4 : 1);
          for (let q = 0; q < 6; q++)
            plot(
              bx + rp * Math.cos(q * 1.047),
              Y_W + 0.05,
              bz + rp * Math.sin(q * 1.047),
              0,
              1,
              0,
              ph < 0.94 ? "*" : "'",
            );
        }
      }
    // burner flame: tongues from the burner ring, licking up the sides
    const fl = S.flame;
    if (fl > 0.03)
      for (let i = 0; i < 48; i++) {
        const th = (i / 48) * 6.283 + 0.05 * Math.sin(t * 3 + i),
          c = Math.cos(th),
          s = Math.sin(th);
        const hg =
          fl * (0.72 + 0.2 * Math.sin(t * 13 + i * 2.3) + 0.15 * hash(i, Math.floor(t * 10)));
        for (let q = 0; q <= 1.0001; q += 0.045) {
          if (q > hg) break;
          const r = 0.85 + 1.0 * q,
            y = yb + 0.4 * q + 0.6 * q * q,
            wob = 0.05 * q * Math.sin(t * 9 + i * 1.7);
          const ch =
            q < 0.25
              ? "*"
              : q > hg - 0.1
                ? i % 2
                  ? "'"
                  : "^"
                : (i + Math.floor(t * 10)) % 2
                  ? "("
                  : ")";
          plot(r * c - wob * s, y, r * s + wob * c, 0, 0, 1, ch, q < 0.3 ? FY : FO);
        }
      }
    // steam
    if (bo > 0.05)
      for (let i = 0; i < 30; i++) {
        const ph = (t * 0.28 + i / 30) % 1;
        if (hash(i, Math.floor(t * 0.28 + i / 30)) > bo) continue;
        const bx = Math.sin(i * 2.7) * 1.05 + Math.sin(t * 0.9 + i) * 0.3 * ph,
          bz = Math.cos(i * 1.9) * 0.6;
        plot(
          bx,
          Y_TOP + 0.15 + ph * 1.4,
          bz,
          0,
          0,
          1,
          ph > 0.8 ? "." : ph > 0.55 ? "'" : ["~", "(", ")", "~"][i % 4],
        );
      }
  }
  // ice bowl (slides in, then away when serving)
  const bX = bowlX + awayX;
  if (bX < 5.4) {
    ox = bX;
    const Rb = 1.55,
      yc = Y_TOP;
    for (let ph = 0.05; ph <= 1.5708; ph += 0.02 / dk)
      for (let th = 0; th < 6.283; th += 0.016 / dk) {
        const sp = Math.sin(ph),
          cp = Math.cos(ph),
          c = Math.cos(th),
          s = Math.sin(th);
        plot(Rb * sp * c, yc - Rb * cp, Rb * sp * s, sp * c, -cp, sp * s, BWL);
        if (yc - Rb * cp > Y_W)
          plot(
            (Rb - 0.05) * sp * c,
            yc - (Rb - 0.05) * cp,
            (Rb - 0.05) * sp * s,
            -sp * c,
            cp,
            -sp * s,
            INW,
          );
      }
    for (let th = 0; th < 6.283; th += 0.012 / dk)
      plot(Rb * Math.cos(th), yc, Rb * Math.sin(th), 0, 1, 0, "=");
    const Rw = Math.sqrt(Rb * Rb - (yc - Y_W) * (yc - Y_W)) - 0.06;
    for (let x = -Rw; x <= Rw; x += 0.02 / dk)
      for (let z = -Rw; z <= Rw; z += 0.02 / dk) {
        if (x * x + z * z > Rw * Rw) continue;
        plot(
          x,
          Y_W + 0.008 * Math.sin(6 * x + t * 1.3) * Math.cos(7 * z - t * 1.1),
          z,
          0,
          1,
          0,
          "-",
        );
      }
    ICE.forEach(([ix, iz], i) => {
      const sz = 0.15,
        cy = Y_W + 0.04 + 0.015 * Math.sin(t * 2 + i),
        rot = i * 0.7,
        cr = Math.cos(rot),
        sr = Math.sin(rot);
      for (let u = -sz; u <= sz; u += 0.02 / dk)
        for (let v = -sz; v <= sz; v += 0.02 / dk)
          [
            [u, sz, v, 0, 1, 0],
            [u, v, sz, 0, 0, 1],
            [u, v, -sz, 0, 0, -1],
            [sz, u, v, 1, 0, 0],
            [-sz, u, v, -1, 0, 0],
          ].forEach(([px, py, pz, nx, ny, nz]) =>
            plot(
              ix * 0.9 + px * cr - pz * sr,
              cy + py,
              iz * 0.9 + px * sr + pz * cr,
              nx * cr - nz * sr,
              ny,
              nx * sr + nz * cr,
              ICEC,
            ),
          );
    });
  }
  // eggs
  const ea = 0.44,
    eb = 0.32,
    er = (v) => eb * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - 0.12 * v),
    VC = 0.48,
    XC = VC * ea;
  const capL = ease(cl(capK / 0.35)),
    capM = ease(cl((capK - 0.25) / 0.75)),
    phi = -Math.PI * 0.9 * capM,
    cph = Math.cos(phi),
    sph = Math.sin(phi);
  const drawE = (cx, cy, cz, yaw, tilt, rock, dens, served) => {
    ox = 0;
    const ct = Math.cos(tilt),
      st = Math.sin(tilt),
      cyw = Math.cos(yaw),
      syw = Math.sin(yaw);
    const put = (x, y, z, nx, ny, nz, ramp, cap) => {
      if (cap) {
        const px = x - XC,
          qx = px * cph - y * sph,
          qy = px * sph + y * cph,
          qnx = nx * cph - ny * sph,
          qny = nx * sph + ny * cph;
        x = qx + XC + 0.35 * capL * (1 - capM) - 0.46 * capM;
        y = qy - 0.66 * capM;
        nx = qnx;
        ny = qny;
        if (capM > 0.5) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
          ramp = ramp === SH ? "%#*+=-:.." : ramp;
        }
      }
      const x2 = x * ct - y * st,
        y2 = x * st + y * ct,
        nx2 = nx * ct - ny * st,
        ny2 = nx * st + ny * ct;
      plot(
        cx + x2 * cyw - z * syw,
        cy + y2,
        cz + x2 * syw + z * cyw,
        nx2 * cyw - nz * syw,
        ny2,
        nx2 * syw + nz * cyw,
        ramp,
      );
    };
    for (let v = -0.99; v <= 0.99; v += 0.035 / dens) {
      const r = er(v),
        rp = (er(v + 0.005) - er(v - 0.005)) / 0.01 / ea;
      for (let u = 0; u < 6.283; u += 0.09 / dens) {
        const cu = Math.cos(u + rock),
          su = Math.sin(u + rock),
          n = Math.hypot(r * rp, r) || 1;
        let ramp = SH,
          cap = false;
        if (served) {
          const f = ((u * 7) / Math.PI) % 2,
            cv = VC + 0.05 * (Math.abs(f - 1) * 2 - 1) + 0.02 * Math.sin(u * 3.1 + 1);
          cap = capK > 0 && v > cv;
          if (crack > 0 && capK === 0 && Math.abs(v - cv) < 0.028 && u / 6.283 < crack * 1.05)
            ramp = f < 1 ? "/" : "\\";
          if (capK > 0.3 && drip > 0 && v < cv)
            for (const d of DRIPS) {
              const len = Math.min(1.0, drip * d.s * 1.2);
              if (v < cv - len) continue;
              let du = Math.abs(u - d.th);
              du = Math.min(du, 6.283 - du);
              const tip = v < cv - len + 0.07 ? 1.35 : 1,
                wd = d.w * (0.5 + (0.5 * (v - cv + len)) / (len || 1)) * tip;
              if (du * r < wd) {
                ramp = YOK;
                break;
              }
            }
        }
        put(v * ea, r * cu, r * su, (-r * rp) / n, (r * cu) / n, (r * su) / n, ramp, cap);
      }
    }
    if (served && capK > 0) {
      const R = er(VC - 0.03) + 0.01,
        yr = R * 0.62,
        xd = (VC - 0.03) * ea,
        dm = (S.yolk === "hard" ? 0.02 : 0.07) + 0.04 * cl(drip),
        d = 0.012 / dens;
      for (let y = -R; y <= R; y += d)
        for (let z = -R; z <= R; z += d) {
          const r2 = y * y + z * z;
          if (r2 > R * R) continue;
          const r = Math.sqrt(r2);
          if (r < yr)
            put(
              xd + dm * (1 - r2 / (yr * yr)),
              y,
              z,
              1,
              (y / yr) * 0.35,
              (z / yr) * 0.35,
              YOK,
              false,
            );
          else put(xd, y, z, 1, 0, 0, r > R - 0.03 ? "#" : WH, false);
        }
    }
  };
  const inBowl = sw > 0.5;
  POT_EGGS.forEach(([px, pz, yaw], i) => {
    const le = ease(cl(S.lower * 1.6 - i * 0.2));
    if (le <= 0) return;
    const hv = 1 - ease(cl((1 - (S.hover || 0)) * 1.6 - i * 0.2));
    const bo = inBowl ? 0 : S.boil,
      lf = ease(cl(lift * 1.25 - i * 0.08));
    let cx = px,
      cy =
        Y_W +
        0.07 +
        (1 - le) * 1.8 +
        lf * 1.2 +
        hv * (1.1 + 0.04 * Math.sin(t * 2 + i * 1.3)) +
        0.02 * bo * Math.sin(t * 7 + i * 1.7),
      cz = pz;
    if (i === 0 && sv > 0) {
      cy += 1.7 * sA_;
      const shake = crack > 0 && crack < 1 ? 0.012 * Math.sin(t * 70) : 0;
      drawE(
        px + (-0.14 - px) * sC + shake,
        cy + (-0.05 - cy) * sC,
        pz * (1 - sC),
        yaw * (1 - sC),
        1.5708 * sC,
        0,
        (1 + 1.2 * sC) * dk,
        true,
      );
      return;
    }
    if (sv > 0) {
      cx += awayX * cB;
      cz += awayX * sB;
    }
    drawE(cx, cy, cz, yaw, 0, 0.12 * bo * Math.sin(t * 5 + i), dk, false);
  });
  (S.conf || []).forEach((p) => {
    const xp = Math.round(p.x),
      yp = Math.round(p.y);
    if (xp >= 0 && xp < W && yp >= 0 && yp < H) {
      out[xp + yp * W] = p.ch;
      cm[xp + yp * W] = p.col;
    }
  });
  const layers = {};
  for (let i = 0; i < W * H; i++)
    if (cm[i]) {
      const g = layers[cm[i]] || (layers[cm[i]] = new Array(W * H).fill(" "));
      g[i] = out[i];
      out[i] = " ";
    }
  const rows = (a) => {
    let s = "";
    for (let j = 0; j < H; j++) s += a.slice(j * W, j * W + W).join("") + "\n";
    return s;
  };
  const res = { base: rows(out), layers: {} };
  for (const c in layers) res.layers[c] = rows(layers[c]);
  return res;
}

/** Burst of confetti particles from the middle of a W×H frame. */
export function spawnConfetti(W, H, n = 140, res = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      v = 0.6 + Math.random() * 1.6;
    out.push({
      x: W / 2,
      y: H * 0.42,
      vx: Math.cos(a) * v * 1.6 * res,
      vy: (Math.sin(a) * v * 0.7 - 0.9) * res,
      ch: EGG_CONF[i % EGG_CONF.length],
      col: EGG_COLS[i % EGG_COLS.length],
      life: 90 + Math.random() * 60,
    });
  }
  return out;
}

/** Advance confetti one frame; returns the particles still alive. */
export function stepConfetti(conf, H, res = 1) {
  const alive = conf.filter((p) => (p.life -= 1) > 0 && p.y < H + 2);
  alive.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.035 * res;
    p.vx *= 0.985;
  });
  return alive;
}
