// A small vim for terminal mode's file viewer. Pure: `vimKey(state, key)` returns the
// next state plus side effects for the UI (quit, theme, clipboard). No DOM.
//
// Modes: normal · visual (v) · visual line (V) · command-line (:) · search (/ ?)
// Normal:   h j k l 0 ^ $ w b e gg G  ctrl-d/u   counts (3j, 5G)
//           x X D dd yy Y p P u ctrl-r   operators d/y + motion (dw, y$, dj, dG…)
//           v V : / ? n N ZZ ZQ
// Visual:   motions extend the selection · y d x p · o swaps ends · : for '<,'>
// Command:  :q :q! :w :x :wq :e! :<n> :$ :noh :set nu|nonu|bg=dark|light :help
//           :'<,'>y / :'<,'>d
// Edits (d, x, p) only change this in-memory buffer; there is no insert mode.

const cls = (ch) => (ch == null || /\s/.test(ch) ? 0 : /\w/.test(ch) ? 1 : 2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const firstNonBlank = (line) => Math.max(0, line.search(/\S/));

/** Open `lines` as buffer `name`. `reg` carries the unnamed register between files. */
export function openBuffer(name, lines, reg = null) {
  return {
    name,
    lines: lines.length ? lines : [""],
    orig: lines,
    r: 0,
    c: 0,
    want: 0, // column j/k try to return to
    mode: "normal", // normal | visual | vline | cmd | search
    anchor: null,
    cmd: "",
    vrange: null,
    msg: "",
    reg,
    count: "",
    op: null, // pending operator: "d" | "y"
    pending: "", // pending prefix key: "g" | "Z"
    undo: [],
    redo: [],
    number: true,
    search: null, // { term, dir }
    hl: false,
  };
}

/* ---------- motions ---------- */

function nextWord(lines, r, c) {
  let line = lines[r];
  const k = cls(line[c]);
  if (k) while (c < line.length && cls(line[c]) === k) c++;
  for (;;) {
    while (c < line.length && cls(line[c]) === 0) c++;
    if (c < line.length) return [r, c];
    if (r >= lines.length - 1) return [r, line.length];
    r++;
    c = 0;
    line = lines[r];
    if (!line.length) return [r, 0];
  }
}

function prevWord(lines, r, c) {
  let line = lines[r];
  c--;
  for (;;) {
    while (c >= 0 && cls(line[c]) === 0) c--;
    if (c >= 0) break;
    if (r === 0) return [0, 0];
    r--;
    line = lines[r];
    c = line.length - 1;
    if (!line.length) return [r, 0];
  }
  const k = cls(line[c]);
  while (c > 0 && cls(line[c - 1]) === k) c--;
  return [r, c];
}

function wordEnd(lines, r, c) {
  let line = lines[r];
  c++;
  for (;;) {
    while (c < line.length && cls(line[c]) === 0) c++;
    if (c < line.length) break;
    if (r >= lines.length - 1) return [r, Math.max(0, line.length - 1)];
    r++;
    line = lines[r];
    c = 0;
  }
  const k = cls(line[c]);
  while (c < line.length - 1 && cls(line[c + 1]) === k) c++;
  return [r, c];
}

/**
 * Where `key` moves the cursor, or null if it isn't a motion.
 * linewise: operators act on whole lines. inclusive: charwise range includes the target.
 */
function motion(S, key, n, ctrl) {
  const { lines, r, c } = S,
    last = lines.length - 1,
    len = lines[r].length;
  const at = (rr, cc, o = {}) => ({ r: rr, c: cc, ...o });
  if (ctrl) {
    if (key === "d")
      return at(clamp(r + 10 * n, 0, last), S.want, { linewise: true, keepWant: true });
    if (key === "u")
      return at(clamp(r - 10 * n, 0, last), S.want, { linewise: true, keepWant: true });
    return null;
  }
  switch (key) {
    case "h":
    case "ArrowLeft":
      return at(r, Math.max(0, c - n));
    case "l":
    case "ArrowRight":
    case " ":
      return at(r, Math.min(Math.max(0, len - 1), c + n), { opEnd: Math.min(len, c + n) });
    case "j":
    case "ArrowDown":
      return at(Math.min(last, r + n), S.want, { linewise: true, keepWant: true });
    case "k":
    case "ArrowUp":
      return at(Math.max(0, r - n), S.want, { linewise: true, keepWant: true });
    case "0":
    case "Home":
      return at(r, 0);
    case "^":
      return at(r, firstNonBlank(lines[r]));
    case "$":
    case "End":
      return at(r, Math.max(0, len - 1), { inclusive: true, eol: true });
    case "w": {
      let p = [r, c];
      for (let i = 0; i < n; i++) p = nextWord(lines, p[0], p[1]);
      return at(p[0], p[1]);
    }
    case "b": {
      let p = [r, c];
      for (let i = 0; i < n; i++) p = prevWord(lines, p[0], p[1]);
      return at(p[0], p[1]);
    }
    case "e": {
      let p = [r, c];
      for (let i = 0; i < n; i++) p = wordEnd(lines, p[0], p[1]);
      return at(p[0], p[1], { inclusive: true });
    }
    case "G": {
      const row = S.count ? clamp(n - 1, 0, last) : last;
      return at(row, firstNonBlank(lines[row]), { linewise: true });
    }
  }
  return null;
}

/* ---------- text ops ---------- */

const ordered = (a, b) => (a.r < b.r || (a.r === b.r && a.c <= b.c) ? [a, b] : [b, a]);

/** Selection in visual mode as { r1, c1, r2, c2, linewise } (charwise ends inclusive). */
export function selection(S) {
  const [s, e] = ordered(S.anchor, { r: S.r, c: S.c });
  return { r1: s.r, c1: s.c, r2: e.r, c2: e.c, linewise: S.mode === "vline" };
}

function textOf(lines, R) {
  if (R.linewise) return lines.slice(R.r1, R.r2 + 1).join("\n");
  if (R.r1 === R.r2) return lines[R.r1].slice(R.c1, R.c2 + 1);
  return [
    lines[R.r1].slice(R.c1),
    ...lines.slice(R.r1 + 1, R.r2),
    lines[R.r2].slice(0, R.c2 + 1),
  ].join("\n");
}

function removeRange(lines, R) {
  if (R.linewise) {
    const next = [...lines.slice(0, R.r1), ...lines.slice(R.r2 + 1)];
    const out = next.length ? next : [""];
    const r = Math.min(R.r1, out.length - 1);
    return { lines: out, r, c: firstNonBlank(out[r]) };
  }
  const merged = lines[R.r1].slice(0, R.c1) + lines[R.r2].slice(R.c2 + 1);
  // Keep the cursor on a character (deleting through the end of a line backs it up).
  return {
    lines: [...lines.slice(0, R.r1), merged, ...lines.slice(R.r2 + 1)],
    r: R.r1,
    c: clamp(R.c1, 0, Math.max(0, merged.length - 1)),
  };
}

const lineCount = (R) => R.r2 - R.r1 + 1;

// Record the pre-change buffer for `u`.
const changed = (S, next) => ({
  ...next,
  undo: [...S.undo, { lines: S.lines, r: S.r, c: S.c }],
  redo: [],
});

function yank(S, R) {
  const text = textOf(S.lines, R),
    n = lineCount(R);
  return {
    state: {
      ...S,
      reg: { text, linewise: R.linewise },
      r: R.r1,
      c: R.linewise ? S.c : R.c1,
      msg: n > 2 ? n + " lines yanked" : "",
    },
    clipboard: text,
  };
}

function cut(S, R) {
  const text = textOf(S.lines, R),
    n = lineCount(R),
    rm = removeRange(S.lines, R);
  return {
    state: changed(S, {
      ...S,
      ...rm,
      reg: { text, linewise: R.linewise },
      msg: R.linewise && n > 2 ? n + " fewer lines" : "",
    }),
  };
}

function put(S, before, n) {
  const reg = S.reg;
  if (!reg) return { state: { ...S, msg: 'E353: Nothing in register "' } };
  if (reg.linewise) {
    const ins = Array.from({ length: n }, () => reg.text.split("\n")).flat(),
      at = before ? S.r : S.r + 1;
    const lines = [...S.lines.slice(0, at), ...ins, ...S.lines.slice(at)];
    return {
      state: changed(S, {
        ...S,
        lines,
        r: at,
        c: firstNonBlank(lines[at]),
        msg: ins.length > 2 ? ins.length + " more lines" : "",
      }),
    };
  }
  const text = reg.text.repeat(n),
    line = S.lines[S.r],
    at = before || !line.length ? S.c : Math.min(line.length, S.c + 1);
  const parts = (line.slice(0, at) + text + line.slice(at)).split("\n");
  const multi = text.includes("\n");
  return {
    state: changed(S, {
      ...S,
      lines: [...S.lines.slice(0, S.r), ...parts, ...S.lines.slice(S.r + 1)],
      c: multi ? at : clamp(at + text.length - 1, 0, Math.max(0, parts[0].length - 1)),
      msg: "",
    }),
  };
}

/* ---------- search ---------- */

function find(S, term, dir, from) {
  const lines = S.lines,
    ci = term === term.toLowerCase();
  const norm = (s) => (ci ? s.toLowerCase() : s);
  const t = norm(term),
    N = lines.length;
  for (let i = 0; i <= N; i++) {
    const r = (((from.r + dir * i) % N) + N) % N,
      line = norm(lines[r]);
    let c;
    if (dir > 0) c = line.indexOf(t, i === 0 ? from.c + 1 : 0);
    else {
      const upto = i === 0 ? from.c - 1 : line.length;
      c = upto < 0 ? -1 : line.lastIndexOf(t, upto);
    }
    if (c >= 0 && (i < N || (dir > 0 ? c <= from.c : c >= from.c))) {
      const wrapped =
        dir > 0
          ? r < from.r || (r === from.r && c <= from.c)
          : r > from.r || (r === from.r && c >= from.c);
      return { r, c, wrapped };
    }
  }
  return null;
}

function searchTo(S, term, dir) {
  const hit = find(S, term, dir, { r: S.r, c: S.c });
  if (!hit)
    return { ...S, msg: "E486: Pattern not found: " + term, search: { term, dir }, hl: true };
  return {
    ...S,
    r: hit.r,
    c: hit.c,
    want: hit.c,
    search: { term, dir },
    hl: true,
    msg: hit.wrapped
      ? dir > 0
        ? "search hit BOTTOM, continuing at TOP"
        : "search hit TOP, continuing at BOTTOM"
      : (dir > 0 ? "/" : "?") + term,
  };
}

/** Every match of the active search, as { r, c, len }, for highlighting. */
export function matches(S) {
  if (!S.hl || !S.search || !S.search.term) return [];
  const term = S.search.term,
    ci = term === term.toLowerCase(),
    out = [];
  S.lines.forEach((line, r) => {
    const l = ci ? line.toLowerCase() : line,
      t = ci ? term.toLowerCase() : term;
    for (let c = l.indexOf(t); c >= 0; c = l.indexOf(t, c + Math.max(1, t.length)))
      out.push({ r, c, len: t.length });
  });
  return out;
}

/* ---------- command line ---------- */

const HELP = "v/V select · y yank · d/x cut · p/P put · u undo · / search · :q quit · :set bg=dark";

function runCmd(S, raw) {
  const base = { ...S, mode: "normal", cmd: "", vrange: null, anchor: null };
  let cmd = raw.trim();
  const range = cmd.startsWith("'<,'>") ? S.vrange : null;
  if (range) cmd = cmd.slice(5).trim();
  if (range && /^y(ank)?$/.test(cmd)) return yank(base, range);
  if (range && /^d(elete)?$/.test(cmd)) return cut(base, range);
  const mod = S.undo.length > 0;
  if (/^(q|quit|qa|qall)$/.test(cmd))
    return mod
      ? { state: { ...base, msg: "E37: No write since last change (add ! to override)" } }
      : { state: base, quit: true };
  if (/^(q!|quit!|qa!|qall!)$/.test(cmd)) return { state: base, quit: true };
  if (cmd === "x" || cmd === "xit")
    return mod
      ? { state: { ...base, msg: "E45: 'readonly' option is set (add ! to override)" } }
      : { state: base, quit: true };
  if (/^(w|wq|write)$/.test(cmd))
    return { state: { ...base, msg: "E45: 'readonly' option is set (add ! to override)" } };
  if (/^(w!|wq!|x!)$/.test(cmd))
    return { state: { ...base, msg: "E212: Can't open file for writing: \"" + S.name + '"' } };
  if (cmd === "e!")
    return {
      state: { ...base, lines: S.orig.length ? S.orig : [""], r: 0, c: 0, undo: [], redo: [] },
    };
  if (/^\d+$/.test(cmd)) {
    const r = clamp(+cmd - 1, 0, S.lines.length - 1);
    return { state: { ...base, r, c: firstNonBlank(S.lines[r]) } };
  }
  if (cmd === "$") {
    const r = S.lines.length - 1;
    return { state: { ...base, r, c: firstNonBlank(S.lines[r]) } };
  }
  if (/^noh(lsearch)?$/.test(cmd)) return { state: { ...base, hl: false } };
  if (/^set\s+(nu|number)$/.test(cmd)) return { state: { ...base, number: true } };
  if (/^set\s+(nonu|nonumber)$/.test(cmd)) return { state: { ...base, number: false } };
  const bg = cmd.match(/^set\s+(?:bg|background)=(dark|light)$/);
  if (bg) return { state: base, theme: bg[1] };
  if (cmd === "help" || cmd === "h") return { state: { ...base, msg: HELP } };
  if (!cmd) return { state: base };
  return { state: { ...base, msg: "E492: Not an editor command: " + cmd } };
}

/* ---------- keys ---------- */

const INSERT_KEYS = new Set(["i", "a", "o", "I", "A", "O", "s", "S", "c", "C", "R"]);

/**
 * Handle one keydown. `key` is KeyboardEvent.key; `ctrl` is ctrlKey.
 * Returns { state, handled, quit?, theme?, clipboard? }.
 */
export function vimKey(S, key, ctrl = false) {
  const res = (o) => ({ handled: true, ...o });

  // command line and search
  if (S.mode === "cmd" || S.mode === "search") {
    // Leaving : that was opened from visual mode returns to that selection; otherwise
    // to normal. vrange is always cleared so it can't resurrect a stale selection.
    const back =
      S.vrange && S.anchor
        ? { ...S, mode: S.vrange.linewise ? "vline" : "visual", vrange: null }
        : { ...S, mode: "normal", anchor: null, vrange: null };
    if (key === "Escape" || (ctrl && key === "c"))
      return res({ state: { ...back, cmd: "", msg: "" } });
    if (key === "Enter") {
      if (S.mode === "cmd") return res(runCmd(S, S.cmd));
      const term = S.cmd || (S.search && S.search.term);
      const next = { ...S, mode: "normal", cmd: "", anchor: null, vrange: null };
      return res({ state: term ? searchTo(next, term, S.sdir) : next });
    }
    if (key === "Backspace")
      return res({ state: S.cmd ? { ...S, cmd: S.cmd.slice(0, -1) } : { ...back, cmd: "" } });
    if (key.length === 1 && !ctrl) return res({ state: { ...S, cmd: S.cmd + key } });
    return res({ state: S });
  }

  const visual = S.mode === "visual" || S.mode === "vline";
  const n = Math.max(1, parseInt(S.count || "1", 10));
  const clear = { count: "", op: null, pending: "" };

  // counts
  if (!ctrl && /^[0-9]$/.test(key) && (key !== "0" || S.count))
    return res({ state: { ...S, count: S.count + key, msg: "" } });

  if (key === "Escape" || (ctrl && key === "c")) {
    return res({
      state: {
        ...S,
        ...clear,
        mode: "normal",
        anchor: null,
        vrange: null,
        msg: visual || S.op ? "" : S.msg,
      },
    });
  }

  // two-key prefixes: gg, ZZ, ZQ
  if (S.pending === "g") {
    if (key === "g") {
      const row = S.count ? clamp(n - 1, 0, S.lines.length - 1) : 0;
      return applyMotion(S, { r: row, c: firstNonBlank(S.lines[row]), linewise: true }, clear);
    }
    return res({ state: { ...S, ...clear } });
  }
  if (S.pending === "Z") {
    if (key === "Q") return res({ state: S, quit: true });
    if (key === "Z") return res(runCmd({ ...S, ...clear }, "x"));
    return res({ state: { ...S, ...clear } });
  }
  if (!ctrl && (key === "g" || (key === "Z" && !S.op && !visual)))
    return res({ state: { ...S, pending: key } });

  // motions (also the target of a pending d/y)
  const m = motion(S, key, n, ctrl);
  if (m) return applyMotion(S, m, clear);

  if (ctrl) {
    if (key === "r") {
      if (!S.redo.length)
        return res({ state: { ...S, ...clear, msg: "Already at newest change" } });
      const next = S.redo[S.redo.length - 1];
      return res({
        state: {
          ...S,
          ...clear,
          ...next,
          redo: S.redo.slice(0, -1),
          undo: [...S.undo, { lines: S.lines, r: S.r, c: S.c }],
          msg: "",
        },
      });
    }
    return { handled: false, state: S };
  }

  if (visual) {
    const R = selection(S),
      exit = { ...S, ...clear, mode: "normal", anchor: null };
    switch (key) {
      case "y":
        return res(yank(exit, R));
      case "d":
      case "x":
        return res(cut(exit, R));
      case "p":
      case "P": {
        // Replace the selection with the register; the replaced text becomes the register.
        if (!S.reg) return res({ state: { ...exit, msg: 'E353: Nothing in register "' } });
        // After cutting lines that ran to the end of the buffer, the cursor sits on the
        // line above the gap, so put after it; otherwise put before the cursor.
        const cutS = cut(exit, R).state,
          after = R.linewise && R.r2 === S.lines.length - 1 && R.r1 > 0;
        const placed = put({ ...cutS, reg: S.reg }, !after, 1).state;
        return res({ state: { ...placed, reg: cutS.reg, undo: cutS.undo, msg: "" } });
      }
      case "o":
        return res({ state: { ...S, anchor: { r: S.r, c: S.c }, r: S.anchor.r, c: S.anchor.c } });
      case "v":
      case "V": {
        const target = key === "v" ? "visual" : "vline";
        return res({
          state:
            S.mode === target ? { ...exit, msg: "" } : { ...S, ...clear, mode: target, msg: "" },
        });
      }
      case ":":
        return res({ state: { ...S, ...clear, mode: "cmd", cmd: "'<,'>", vrange: R } });
      case "J":
      case "u":
      case "U":
      case "~":
        return res({ state: { ...exit, msg: "" } });
    }
    return res({ state: S });
  }

  // operators
  if (key === "d" || key === "y") {
    if (S.op === key) {
      const r2 = Math.min(S.lines.length - 1, S.r + n - 1);
      const R = { r1: S.r, c1: 0, r2, c2: 0, linewise: true };
      return res(key === "y" ? yank({ ...S, ...clear }, R) : cut({ ...S, ...clear }, R));
    }
    return res({ state: { ...S, op: key, pending: "", msg: "" } });
  }
  if (S.op) return res({ state: { ...S, ...clear } });

  const line = S.lines[S.r];
  switch (key) {
    case "x":
    case "Delete":
      if (!line.length) return res({ state: { ...S, ...clear } });
      return res(
        cut(
          { ...S, ...clear },
          {
            r1: S.r,
            c1: S.c,
            r2: S.r,
            c2: Math.min(line.length - 1, S.c + n - 1),
            linewise: false,
          },
        ),
      );
    case "X":
      if (!S.c) return res({ state: { ...S, ...clear } });
      return res(
        cut(
          { ...S, ...clear },
          {
            r1: S.r,
            c1: Math.max(0, S.c - n),
            r2: S.r,
            c2: S.c - 1,
            linewise: false,
          },
        ),
      );
    case "D":
      if (!line.length) return res({ state: { ...S, ...clear } });
      return res(
        cut(
          { ...S, ...clear },
          { r1: S.r, c1: S.c, r2: S.r, c2: line.length - 1, linewise: false },
        ),
      );
    case "Y": {
      const r2 = Math.min(S.lines.length - 1, S.r + n - 1);
      return res(yank({ ...S, ...clear }, { r1: S.r, c1: 0, r2, c2: 0, linewise: true }));
    }
    case "p":
    case "P":
      return res(put({ ...S, ...clear }, key === "P", n));
    case "u": {
      if (!S.undo.length)
        return res({ state: { ...S, ...clear, msg: "Already at oldest change" } });
      const prev = S.undo[S.undo.length - 1];
      return res({
        state: {
          ...S,
          ...clear,
          ...prev,
          undo: S.undo.slice(0, -1),
          redo: [...S.redo, { lines: S.lines, r: S.r, c: S.c }],
          msg: "",
        },
      });
    }
    case "v":
    case "V":
      return res({
        state: {
          ...S,
          ...clear,
          mode: key === "v" ? "visual" : "vline",
          anchor: { r: S.r, c: S.c },
          msg: "",
        },
      });
    case ":":
      return res({ state: { ...S, ...clear, mode: "cmd", cmd: "", msg: "", vrange: null } });
    case "/":
    case "?":
      return res({
        state: {
          ...S,
          ...clear,
          mode: "search",
          sdir: key === "/" ? 1 : -1,
          cmd: "",
          msg: "",
          vrange: null,
        },
      });
    case "n":
    case "N": {
      if (!S.search)
        return res({ state: { ...S, ...clear, msg: "E35: No previous regular expression" } });
      const dir = key === "n" ? S.search.dir : -S.search.dir;
      let next = { ...S, ...clear };
      for (let i = 0; i < n; i++) next = searchTo(next, S.search.term, dir);
      return res({ state: { ...next, search: S.search } });
    }
    case "q":
      return res({ state: { ...S, ...clear, msg: "type :q and press enter to quit" } });
  }
  if (INSERT_KEYS.has(key))
    return res({
      state: {
        ...S,
        ...clear,
        msg: "E21: Cannot make changes, insert mode is off in this portfolio (try v · y · p)",
      },
    });
  return { handled: key.length === 1, state: key.length === 1 ? { ...S, ...clear } : S };
}

// Move the cursor, extend a visual selection, or complete a pending d/y.
function applyMotion(S, m, clear) {
  const lines = S.lines;
  const col = (r, c) => {
    const len = lines[r].length;
    return clamp(c, 0, Math.max(0, len - 1));
  };
  if (S.op) {
    const from = { r: S.r, c: S.c },
      to = { r: m.r, c: m.c };
    let R;
    if (m.linewise) {
      R = { r1: Math.min(from.r, to.r), c1: 0, r2: Math.max(from.r, to.r), c2: 0, linewise: true };
    } else {
      const [s, e] = ordered(from, to);
      let endR = e.r,
        endC = e.c - (m.inclusive ? 0 : 1);
      // An exclusive motion that lands at or before the first non-blank of a later line
      // (e.g. dw on the last word, even when the next line is indented) stops at the
      // end of the previous line instead of joining lines.
      if (!m.inclusive && e.r > s.r && e.c <= firstNonBlank(lines[e.r])) {
        endR = e.r - 1;
        endC = lines[endR].length - 1;
      }
      if (m.opEnd != null && e === to) endC = m.opEnd - 1;
      if (m.eol) endC = lines[endR].length - 1;
      if (endC < s.c && s.r === endR) return { handled: true, state: { ...S, ...clear } };
      R = { r1: s.r, c1: s.c, r2: endR, c2: endC, linewise: false };
    }
    const base = { ...S, ...clear };
    return { handled: true, ...(S.op === "y" ? yank(base, R) : cut(base, R)) };
  }
  const c = col(m.r, m.c);
  return {
    handled: true,
    state: {
      ...S,
      ...clear,
      r: m.r,
      c,
      want: m.keepWant ? S.want : m.eol ? Infinity : c,
      msg: S.mode === "visual" || S.mode === "vline" ? "" : S.msg,
    },
  };
}
