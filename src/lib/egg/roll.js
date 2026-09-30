// Rolling-egg physics for the 404 page. Pure (no DOM): time in, pose out.
//
// A uniform solid egg (a solid of revolution about its long axis) tumbles end over end
// on flat ground, in the plane of the screen. It rolls without slipping and without
// losing energy, so it never stops. Energy per unit mass at orientation θ:
//
//   E = ½ (r² + d(θ)²) ω(θ)² + g h(θ)
//
// where h is the centre of mass's height above the ground, d its distance to the contact
// point (rolling is a rotation about that point, hence the parallel-axis term), and r the
// radius of gyration about the centre of mass. Solving for ω(θ) and integrating dt = dθ/ω
// once over a turn gives a table of time against angle. Runtime is a lookup on the clock,
// so the motion depends only on elapsed time (no integration drift, any refresh rate).
//
// The egg isn't round, so the shell doesn't spend equal time on the ground everywhere:
// dwell() measures it from this same table instead of assuming which end is slow.

const N = 1440; // outline samples, and angle steps per turn
const TAU = 2 * Math.PI;

// Half-width of the egg at position u along its long axis (u in [-1, 1]; the blunt end
// is at u = -1). Same shape the old close-up egg used.
const A = 0.72,
  K = 0.17;
export const eggWidth = (u) => A * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - K * u);
/** w(u)·w'(u), which stays finite at the tips where w' alone doesn't. */
export const eggWidthSlope = (u) => A * A * (1 - K * u) * (2 * K * u * u - u - K);

// Gravity and the slowest angular speed (at the highest point), in egg half-lengths and
// seconds. Together they set the pace: about three seconds per turn, with the fastest
// part of the turn about 2.4× the slowest (tuned by eye, like the rest of the art).
const G = 8;
const OMEGA_MIN = 1.3;

let cache = null;

function build() {
  // Mass properties of the solid: slices of radius w(u), so mass ∝ w² du and a slice
  // turns about a transverse axis with w²/4 (plus the parallel-axis term).
  const M = 4000,
    du = 2 / M;
  let m = 0,
    mu = 0;
  for (let i = 0; i < M; i++) {
    const u = -1 + (i + 0.5) * du,
      w2 = eggWidth(u) ** 2;
    m += w2 * du;
    mu += w2 * u * du;
  }
  const uc = mu / m; // centre of mass along the axis (towards the blunt end)
  let I = 0;
  for (let i = 0; i < M; i++) {
    const u = -1 + (i + 0.5) * du,
      w2 = eggWidth(u) ** 2;
    I += w2 * (w2 / 4 + (u - uc) ** 2) * du;
  }
  const r2 = I / m;

  // Outline relative to the centre of mass: x along the long axis, y across.
  const px = new Float64Array(N),
    py = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const t = (TAU * k) / N,
      u = Math.cos(t);
    px[k] = u - uc;
    py[k] = A * Math.sin(t) * (1 - K * u);
  }

  // Per angle: the lowest outline point is the contact, since the egg is convex. The body
  // turns clockwise (rolling right): world = (x·cos θ + y·sin θ, −x·sin θ + y·cos θ).
  const h = new Float64Array(N + 1),
    cx = new Float64Array(N + 1);
  for (let j = 0; j <= N; j++) {
    const th = (TAU * j) / N,
      c = Math.cos(th),
      s = Math.sin(th);
    let low = Infinity,
      lx = 0;
    for (let k = 0; k < N; k++) {
      const wy = -px[k] * s + py[k] * c;
      if (wy < low) {
        low = wy;
        lx = px[k] * c + py[k] * s;
      }
    }
    h[j] = -low;
    cx[j] = lx; // contact point's horizontal offset from the centre of mass
  }

  const U = (j) => G * h[j],
    IP = (j) => r2 + cx[j] * cx[j] + h[j] * h[j];
  let hi = 0,
    jTop = 0;
  for (let j = 0; j < N; j++)
    if (U(j) > hi) {
      hi = U(j);
      jTop = j;
    }
  // Just enough energy to go over the top at OMEGA_MIN.
  const E = hi + 0.5 * IP(jTop) * OMEGA_MIN * OMEGA_MIN;
  const omega = new Float64Array(N + 1);
  for (let j = 0; j <= N; j++) omega[j] = Math.sqrt((2 * (E - U(j))) / IP(j));

  // Time and distance against angle. Pure rolling: the centre of mass moves along the
  // ground by h dθ (its speed is ω times its height above the contact point).
  const time = new Float64Array(N + 1),
    dist = new Float64Array(N + 1),
    dth = TAU / N;
  for (let j = 0; j < N; j++) {
    time[j + 1] = time[j] + (dth * (1 / omega[j] + 1 / omega[j + 1])) / 2;
    dist[j + 1] = dist[j] + (dth * (h[j] + h[j + 1])) / 2;
  }
  return { uc, r2, px, py, h, cx, omega, time, dist, E, period: time[N], travel: dist[N] };
}

const tables = () => cache || (cache = build());

/** Seconds per full turn. */
export const rollPeriod = () => tables().period;

/**
 * The egg at time `t` (seconds, any value): its orientation `theta` (radians, clockwise,
 * in [0, 2π)), the height `h` of its centre of mass above the ground, the distance `x`
 * the centre of mass has rolled (to scroll the ground by), and `omega`.
 */
export function rollPose(t) {
  const T = tables();
  const turns = Math.floor(t / T.period),
    tau = t - turns * T.period;
  // Binary search for the angle step containing tau.
  let lo = 0,
    hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (T.time[mid] <= tau) lo = mid;
    else hi = mid;
  }
  const f = (tau - T.time[lo]) / (T.time[lo + 1] - T.time[lo]),
    lerp = (a) => a[lo] + (a[lo + 1] - a[lo]) * f;
  return {
    theta: (TAU * (lo + f)) / N,
    h: lerp(T.h),
    x: turns * T.travel + lerp(T.dist),
    omega: lerp(T.omega),
  };
}

/**
 * A time at which the egg lies at rest on its side (the lowest centre of mass, the
 * stable way for an egg to sit): the pose for a still frame.
 */
export function restTime() {
  const T = tables();
  let best = 0;
  for (let j = 1; j < N; j++) if (T.h[j] < T.h[best]) best = j;
  return T.time[best];
}

/** Body-frame facts the renderer needs: where the centre of mass sits on the long axis. */
export const eggCentre = () => tables().uc;

/**
 * How the turn's time splits over the shell, for checks and tuning: the outline is cut
 * into `bins` equal arcs (starting at the blunt tip, going round) and this returns the
 * share of the period each arc spends as the contact point, and the arc lengths.
 */
export function dwell(bins = 8) {
  const T = tables();
  const share = new Float64Array(bins),
    arc = new Float64Array(bins);
  // Perimeter position of each outline sample (the outline starts at the pointed tip).
  const pos = new Float64Array(N + 1);
  for (let k = 0; k < N; k++) {
    const k2 = (k + 1) % N;
    pos[k + 1] = pos[k] + Math.hypot(T.px[k2] - T.px[k], T.py[k2] - T.py[k]);
  }
  const total = pos[N];
  const binOf = (k) => Math.min(bins - 1, Math.floor((pos[k] / total) * bins));
  for (let k = 0; k < N; k++) arc[binOf(k)] += pos[k + 1] - pos[k];
  // Contact index at each angle step; weight by the step's duration.
  for (let j = 0; j < N; j++) {
    const th = (TAU * (j + 0.5)) / N,
      c = Math.cos(th),
      s = Math.sin(th);
    let low = Infinity,
      kk = 0;
    for (let k = 0; k < N; k++) {
      const wy = -T.px[k] * s + T.py[k] * c;
      if (wy < low) {
        low = wy;
        kk = k;
      }
    }
    share[binOf(kk)] += (T.time[j + 1] - T.time[j]) / T.period;
  }
  return { share: Array.from(share), arc: Array.from(arc) };
}
