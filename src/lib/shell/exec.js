// Command parser for the fake zsh. Pure: input + context in, output lines + effects out.
//
// Two shells share it:
//   mode "term"  — full-screen terminal mode (has vim, the inline egg, `exit` → gui)
//   mode "embed" — the mini shell opened with ` in gui mode (`exit` closes it)
//
// Output lines are { t, ... } where t is one of:
//   cmd txt dim hint err h kv help link ls dir file exp bar egg
// Effects (fx) tell the UI what to do: { cwd, sec, filter, open, theme, keys, mode, close,
//   vim, pend, href, egg, sec0, clear }.

import { createFs, pstr, resolve } from "./fs.js";
import { SPEC, ALIAS, USAGE, HELP, CMDS } from "./spec.js";
import { lc } from "../format.js";

const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

const noProto = (href) => href.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** data = { projects, categories, experience, skills, site, about, intro, whoamiFacts } */
export function createShell(data) {
  const { projects, categories, experience, skills, site, intro, whoamiFacts } = data;
  const fs = createFs(data);
  const { project, projPath, getNode, findFile, sortKeys, fileLines } = fs;

  function detailLines(p) {
    const o = [
      { t: "h", text: p.title },
      { t: "kv", k: "type", v: p.category },
      { t: "kv", k: "org", v: p.org },
    ];
    if (p.role) o.push({ t: "kv", k: "role", v: p.role });
    o.push({ t: "kv", k: "timeline", v: p.timeline });
    if (p.location) o.push({ t: "kv", k: "location", v: p.location });
    o.push({ t: "kv", k: "context", v: p.context }, { t: "txt", text: p.purpose });
    p.bullets.forEach((b) => o.push({ t: "dim", text: "  – " + b }));
    o.push({ t: "kv", k: "stack", v: p.tags.join(", ") });
    p.links.forEach((l) => o.push({ t: "link", k: l.label, href: l.href, text: noProto(l.href) }));
    return o;
  }

  // `cat` one node. Also sets fx.sec so the GUI follows along.
  function catNode(node, parts, mode, out, fx) {
    const name = parts[parts.length - 1],
      SEC = { about: 0, proj: 1, exp: 2, skills: 3 };
    if (SEC[node.k] != null) fx.sec = SEC[node.k];
    switch (node.k) {
      case "about":
        fileLines(node).forEach((t) => out.push({ t: "txt", text: t || " " }));
        break;
      case "exp": {
        const e = experience[node.i];
        out.push({ t: "exp", ...e });
        e.details.forEach((d) => out.push({ t: "dim", text: "  – " + d }));
        if (fx.exp == null) fx.exp = node.i; // the embedded shell selects this role in the gui
        break;
      }
      case "skills": {
        const g = skills[node.g];
        out.push({ t: "dim", text: g.label + "/" });
        g.items.forEach((it) => out.push({ t: "bar", ...it }));
        break;
      }
      case "contact":
        out.push(
          { t: "link", k: "EMAIL", href: "mailto:" + site.email, text: site.email },
          {
            t: "link",
            k: "URL;TYPE=github",
            href: site.github.profile,
            text: noProto(site.github.profile),
          },
          { t: "link", k: "URL;TYPE=linkedin", href: site.linkedin, text: noProto(site.linkedin) },
        );
        break;
      case "pdf":
        out.push(
          { t: "err", text: "cat: " + name + ": binary file" },
          { t: "hint", text: "xdg-open " + name },
        );
        break;
      case "bin":
        out.push(
          { t: "err", text: "cat: " + name + ": binary file (it's executable)" },
          { t: "hint", text: "./egg" },
        );
        break;
      case "eggrc":
        out.push({ t: "txt", text: fileLines(node).join("\n") });
        break;
      case "proj": {
        const p = project(node.slug);
        if (mode === "embed") {
          fx.open = p.slug;
          out.push({ t: "dim", text: "opened " + pstr(parts) + " on the page ↙" });
        } else out.push(...detailLines(p));
        break;
      }
    }
  }

  // Short description of a file, for ls tooltips and tree's right-hand column.
  const fileTip = (ch) =>
    ch.k === "proj" ? project(ch.slug).purpose : ch.k === "exp" ? experience[ch.i].summary : null;
  const fileMeta = (ch) => {
    if (ch.k === "proj") {
      const pr = project(ch.slug);
      return pr.org + " · " + pr.year;
    }
    if (ch.k === "exp") {
      const e = experience[ch.i];
      return e.title + " · " + e.date;
    }
    if (ch.k === "skills") return skills[ch.g].items.map((it) => it.name).join(", ");
    return "";
  };

  const mailPrompt = (out, fx) => {
    fx.pend = { href: "mailto:" + site.email };
    out.push({ t: "kv", k: "to", v: site.email }, { t: "dim", text: "open your mail app? [y/N]" });
  };

  /**
   * Run one command (no && chaining — see runLine).
   * ctx = { cwd: string[], spark: {bars, tip} | null, hist: string[] }
   */
  function exec(input, mode, ctx) {
    const raw = input.trim(),
      out = [{ t: "cmd", text: raw, cwd: pstr(ctx.cwd) }],
      fx = {};
    if (!raw) return { out, fx };
    const tokens = raw.split(/\s+/),
      c0 = lc(tokens[0]),
      c = own(ALIAS, c0) || c0,
      args = tokens.slice(1),
      flags = args.filter((a) => a.startsWith("-")).join(""),
      pos = args.filter((a) => !a.startsWith("-"));
    const err = (t) => out.push({ t: "err", text: t });
    const usage = () => own(USAGE, c) && out.push({ t: "dim", text: "usage: " + USAGE[c] });
    const sp = own(SPEC, c);
    if (!sp) {
      err("zsh: command not found: " + tokens[0]);
      out.push({ t: "hint", text: "help" });
      return { out, fx };
    }
    if (sp[2] !== "*") {
      const bad = flags
        .replace(/-/g, "")
        .split("")
        .find((ch) => !sp[2].includes(ch));
      if (bad) {
        err(c + ": invalid option -- '" + bad + "'");
        usage();
        return { out, fx };
      }
      if (pos.length < sp[0] || pos.length > sp[1]) {
        err(
          c +
            ": " +
            (pos.length > sp[1]
              ? sp[1] === 0
                ? "takes no arguments"
                : "too many arguments"
              : "missing operand"),
        );
        usage();
        return { out, fx };
      }
    }
    switch (c) {
      case "help":
        out.push(
          { t: "dim", text: "commands:" },
          {
            t: "help",
            left: HELP.content,
            // In the embedded shell `exit` just closes it; offer terminal mode instead.
            right:
              mode === "term"
                ? HELP.util
                : [
                    ...HELP.util.filter(([k]) => k !== "exit"),
                    ["./app --mode terminal", "the whole site as a shell"],
                  ],
          },
        );
        out.push({
          t: "dim",
          text: "vim keys: esc → normal · j/k scroll · gg/G · i insert · :q quit",
        });
        break;
      case "ls": {
        const parts = pos[0] ? resolve(ctx.cwd, pos[0]) : ctx.cwd,
          node = getNode(parts);
        if (!node) {
          err("ls: cannot access '" + pos[0] + "': no such file or directory");
          break;
        }
        if (node.t === "file") {
          out.push({ t: "txt", text: pos[0] });
          break;
        }
        const all = flags.includes("a"),
          long = flags.includes("l");
        const items = sortKeys(node, all).map((name) => {
          const ch = node.c[name],
            p = [...parts, name],
            dir = ch.t === "dir",
            suffix = dir ? "/" : ch.k === "bin" ? "*" : "";
          const size = dir
            ? "4096"
            : ch.k === "pdf"
              ? "184k"
              : String(fileLines(ch).join("\n").length);
          const perms = dir ? "drwxr-xr-x" : ch.k === "bin" ? "-rwxr-xr-x" : "-rw-r--r--";
          return {
            label: long
              ? perms + "  danny  " + size.padStart(5) + "  sep 23  " + name + suffix
              : name + suffix,
            cmd: dir ? "cd " + pstr(p) + " && ls" : ch.k === "bin" ? "./egg" : "cat " + pstr(p),
            tip: dir ? "cd " + name : fileTip(ch) || "cat " + name,
          };
        });
        if (long) items.forEach((it) => out.push({ t: "ls", items: [it] }));
        else out.push({ t: "ls", items });
        break;
      }
      case "cd": {
        const target = pos[0] || "~",
          parts = resolve(ctx.cwd, target),
          node = getNode(parts);
        if (!node) {
          err("cd: no such file or directory: " + target);
          break;
        }
        if (node.t !== "dir") {
          err("cd: not a directory: " + target);
          break;
        }
        fx.cwd = parts;
        if (parts[0] === "projects") {
          fx.filter = parts[1] && categories.includes(parts[1]) ? parts[1] : "all";
          fx.sec = 1;
        } else if (parts[0] === "experience") fx.sec = 2;
        else if (parts[0] === "skills") fx.sec = 3;
        else if (!parts.length) fx.sec = 0;
        break;
      }
      case "pwd":
        out.push({
          t: "txt",
          text: "/home/danny" + (ctx.cwd.length ? "/" + ctx.cwd.join("/") : ""),
        });
        break;
      case "tree": {
        const parts = pos[0] ? resolve(ctx.cwd, pos[0]) : ctx.cwd,
          node = getNode(parts);
        if (!node || node.t !== "dir") {
          err((pos[0] || ".") + " [error opening dir]");
          break;
        }
        let nd = 0,
          nf = 0;
        out.push({ t: "dir", prefix: "", name: pstr(parts), cmd: "cd " + pstr(parts) + " && ls" });
        const walk = (n, p, pre) =>
          sortKeys(n, false).forEach((name, i, arr) => {
            const ch = n.c[name],
              last = i === arr.length - 1,
              np = [...p, name],
              branch = pre + (last ? "└── " : "├── ");
            if (ch.t === "dir") {
              nd++;
              out.push({
                t: "dir",
                prefix: branch,
                name: name + "/",
                cmd: "cd " + pstr(np) + " && ls",
              });
              walk(ch, np, pre + (last ? "    " : "│   "));
            } else {
              nf++;
              out.push({
                t: "file",
                prefix: branch,
                name,
                cmd: ch.k === "bin" ? "./egg" : "cat " + pstr(np),
                tip: fileTip(ch) || "cat " + name,
                meta: fileMeta(ch),
              });
            }
          });
        walk(node, parts, "");
        out.push({ t: "dim", text: "\n" + nd + " directories, " + nf + " files" });
        break;
      }
      case "cat":
        // `dir/*` (or `*`) expands to the files in that directory, like a shell glob.
        pos
          .flatMap((p) => {
            if (p !== "*" && !p.endsWith("/*")) return [p];
            const base = p === "*" ? "." : p.slice(0, -2) || "/",
              dirParts = resolve(ctx.cwd, base),
              dir = getNode(dirParts);
            if (!dir || dir.t !== "dir") return [p];
            // Files in the folder and its subfolders (projects/* reaches each category).
            const files = [];
            const walk = (node, at) =>
              sortKeys(node, false).forEach((n) =>
                node.c[n].t === "file" ? files.push(pstr([...at, n])) : walk(node.c[n], [...at, n]),
              );
            walk(dir, dirParts);
            return files.length ? files : [p];
          })
          .forEach((p) => {
            const f = findFile(ctx.cwd, p);
            if (!f) return err(c + ": " + p + ": no such file or directory");
            if (f.node.t === "dir") {
              err(c + ": " + p + ": is a directory");
              out.push({ t: "hint", text: "cat " + p.replace(/\/$/, "") + "/*" });
              return;
            }
            catNode(f.node, f.parts, mode, out, fx);
          });
        break;
      case "vim":
      case "vi":
      case "less": {
        const f = findFile(ctx.cwd, pos[0]);
        if (!f) {
          err(c + ": " + pos[0] + ": no such file or directory");
          break;
        }
        if (f.node.t === "dir") {
          err(c + ": " + pos[0] + ": is a directory");
          break;
        }
        if (mode === "term") fx.vim = { name: f.parts.join("/"), lines: fileLines(f.node) };
        else if (f.node.k === "proj") catNode(f.node, f.parts, mode, out, fx);
        else {
          catNode(f.node, f.parts, mode, out, fx);
          out.push(
            { t: "dim", text: "(full vim lives in terminal mode)" },
            { t: "hint", text: "./app --mode terminal" },
          );
        }
        break;
      }
      case "grep": {
        const term = lc(pos.join(" ")).replace(/^["']|["']$/g, "");
        if (!term) {
          err("usage: grep <term>");
          break;
        }
        const hits = projects.filter((p) =>
          lc([p.title, p.purpose, p.context, ...p.tags, ...p.bullets].join(" ")).includes(term),
        );
        hits.forEach((p) =>
          out.push({
            t: "file",
            prefix: "",
            name: projPath(p),
            cmd: "cat ~/" + projPath(p),
            tip: p.purpose,
            meta: p.tags.filter((t) => lc(t).includes(term)).join(", ") || "match in description",
          }),
        );
        if (!hits.length) out.push({ t: "dim", text: "(no matches)" });
        break;
      }
      case "xdg-open": {
        const f = findFile(ctx.cwd, pos[0]);
        if (!f) {
          err(c + ": " + pos[0] + ": no such file");
          break;
        }
        if (f.node.t === "dir") {
          err(c + ": " + pos[0] + ": is a directory");
          out.push({ t: "hint", text: "cd " + pos[0].replace(/\/$/, "") });
          break;
        }
        if (f.node.k === "bin") {
          err(c + ": " + pos[0] + ": no application opens an executable, run it instead");
          out.push({ t: "hint", text: "./" + pos[0].replace(/^\.\//, "") });
          break;
        }
        if (f.node.k === "pdf") {
          fx.href = site.resume;
          out.push({ t: "link", k: "opening", href: site.resume, text: "resume.pdf ↗" });
        } else if (f.node.k === "proj") {
          const p = project(f.node.slug);
          if (mode === "embed") fx.open = p.slug;
          if (p.links.length)
            p.links.forEach((l) =>
              out.push({ t: "link", k: l.label, href: l.href, text: noProto(l.href) + " ↗" }),
            );
          else out.push({ t: "dim", text: "internal project — no public links" });
        } else if (f.node.k === "contact") mailPrompt(out, fx);
        else catNode(f.node, f.parts, mode, out, fx);
        break;
      }
      case "mail":
        mailPrompt(out, fx);
        break;
      // whoami: the short version (the landing blurb); about: the long one (about.txt).
      case "whoami":
        out.push(
          { t: "h", text: site.name },
          { t: "txt", text: intro },
          { t: "txt", text: " " },
          ...whoamiFacts.map(({ k, v }) => ({ t: "kv", k, v })),
          { t: "dim", text: "more: about (or cat about.txt)" },
        );
        break;
      case "about":
        catNode({ k: "about" }, ["about.txt"], mode, out, fx);
        break;
      case "git":
        if (pos[0] === "log") {
          if (ctx.spark)
            out.push({ t: "txt", text: ctx.spark.bars }, { t: "dim", text: ctx.spark.tip });
          else err("git: couldn't reach GitHub at the last sync, try again later");
        } else err("git: '" + args[0] + "' is not a git command. see 'git log'");
        break;
      case "history":
        out.push({
          t: "txt",
          text: ctx.hist.map((h, i) => String(i + 1).padStart(4) + "  " + h).join("\n"),
        });
        break;
      case "export": {
        const m = lc(args.join(" ")).match(/(?:theme|bg|background)=(dark|light)/);
        if (m) {
          fx.theme = m[1];
          out.push({ t: "dim", text: "THEME=" + m[1] });
        } else err(c + ": usage: export THEME=dark|light");
        break;
      }
      case "set": {
        const [what, val] = args.map(lc);
        if (what !== "keys" || (val !== undefined && val !== "on" && val !== "off"))
          err(c + ": usage: set keys [on|off]");
        else if (val === undefined)
          out.push({ t: "dim", text: "keys=" + (ctx.keys === false ? "off" : "on") });
        else {
          fx.keys = val;
          out.push({ t: "dim", text: "keys=" + val });
        }
        break;
      }
      case "date":
        // "fri sep 25 2026 17:52:00 GMT-0400": the site's lowercase, acronyms kept.
        out.push({
          t: "txt",
          text: lc(new Date().toString())
            .replace(/ \(.*\)$/, "")
            .replace("gmt", "GMT"),
        });
        break;
      case "uname":
        out.push({
          t: "txt",
          text: flags.includes("a")
            ? "dannyos 26.09 portfolio soft-boiled x86_64 gnu/linux"
            : "dannyos",
        });
        break;
      case "echo":
        out.push({
          t: "txt",
          text: args
            .join(" ")
            .replace(/\$USER/g, "danny")
            .replace(/\$HOME/g, "/home/danny"),
        });
        break;
      case "./egg":
        if (mode === "term") {
          out.push({ t: "egg" });
          fx.egg = true;
        } else {
          out.push({ t: "dim", text: "the pot's on the homepage ↖" });
          fx.close = true;
          fx.sec0 = true;
        }
        break;
      case "./app": {
        const a = args.join(" ");
        if (a.includes("terminal")) {
          fx.mode = "term";
          out.push({ t: "dim", text: "switching to terminal mode…" });
        } else if (a.includes("gui")) fx.mode = "gui";
        else err("usage: ./app --mode terminal|gui");
        break;
      }
      case "exit":
        if (mode === "term") fx.mode = "gui";
        else fx.close = true;
        break;
      case "clear":
        fx.clear = true;
        break;
      case "sudo":
        err("danny is not in the sudoers file, this incident will be reported");
        break;
    }
    return { out, fx };
  }

  /**
   * Run a full input line, chaining `a && b`. Like a shell, a failing command (one that
   * printed an error) stops the chain. Effects merge left to right.
   */
  function runLine(raw, mode, ctx) {
    const out = [],
      fx = {};
    let cwd = ctx.cwd;
    for (const [i, part] of raw.split("&&").entries()) {
      const r = exec(part, mode, { ...ctx, cwd });
      if (i === 0) {
        r.out[0].text = raw.trim();
        out.push(...r.out);
      } else out.push(...r.out.slice(1));
      Object.assign(fx, r.fx);
      if (r.fx.cwd) cwd = r.fx.cwd;
      // `clear` wipes what came before it; later commands' output still shows.
      if (r.fx.clear) out.length = 0;
      if (r.out.some((l) => l.t === "err")) break;
    }
    // `./egg && ./egg`: one game, one frame (the last one).
    const lastEgg = out.findLastIndex((l) => l.t === "egg");
    for (let k = 0; k < lastEgg; k++)
      if (out[k].t === "egg") out[k] = { t: "dim", text: "(egg session moved below)" };
    return { out, fx, cwd };
  }

  /**
   * Tab completion. Returns { input } to replace the prompt text and/or
   * { matches } to print as a listing; null when there's nothing to do.
   */
  function complete(input, cwd) {
    const toks = input.trimStart().split(/\s+/),
      cmd = lc(toks[0]);
    if (toks.length === 1) {
      const m = CMDS.filter((c) => c.startsWith(cmd));
      if (m.length === 1) return { input: m[0] + " " };
      return m.length > 1 ? { matches: m } : null;
    }
    if (cmd === "export") {
      // Complete the value being typed after THEME=; with none yet, list both.
      const v = lc((input.split("=")[1] || "").trim()),
        opts = ["dark", "light"].filter((o) => o.startsWith(v));
      if (!v || opts.length > 1) return { input: "export THEME=", matches: ["dark", "light"] };
      return opts.length ? { input: "export THEME=" + opts[0] } : null;
    }
    const last = toks[toks.length - 1];
    // `cd ..`, `cd ~`, `ls ../..`: a bare directory reference just gets its slash.
    if (/^(~|\.\.)(\/\.\.)*$/.test(last))
      return { input: [...toks.slice(0, -1), last + "/"].join(" ") };
    const slash = last.lastIndexOf("/"),
      dirPart = slash >= 0 ? last.slice(0, slash + 1) : "",
      base = slash >= 0 ? last.slice(slash + 1) : last;
    const node = getNode(resolve(cwd, dirPart || "."));
    if (!node || node.t !== "dir") return null;
    // cd only goes into folders, so it only offers folders.
    const m = sortKeys(node, base.startsWith(".")).filter(
      (n) => n.startsWith(base) && (cmd !== "cd" || node.c[n].t === "dir"),
    );
    if (!m.length) return null;
    if (m.length === 1) {
      const done = dirPart + m[0] + (node.c[m[0]].t === "dir" ? "/" : "");
      return { input: [...toks.slice(0, -1), done].join(" ") };
    }
    let pre = m[0];
    m.forEach((x) => {
      while (!x.startsWith(pre)) pre = pre.slice(0, -1);
    });
    return { input: [...toks.slice(0, -1), dirPart + pre].join(" "), matches: m };
  }

  return { exec, runLine, complete, fs };
}
