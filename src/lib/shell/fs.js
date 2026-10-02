// Virtual filesystem for the fake shell. Paths are arrays of segments relative to
// ~ (e.g. ["projects", "hackathon"]). No `@/` imports: content comes in through `data`.

import { joinParagraphs } from "../format.js";

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const expFile = (e) => slugify(e.company) + ".log";

/** ["projects", "hackathon"] → "~/projects/hackathon" */
export const pstr = (parts) => (parts.length ? "~/" + parts.join("/") : "~");

/** Resolve `p` against `cwd`. Handles ~, /, /home/danny (what `pwd` prints), ., .. */
export function resolve(cwd, p) {
  if (p === "/home/danny" || p.startsWith("/home/danny/")) p = "~" + p.slice(11);
  const parts = p.startsWith("~") || p.startsWith("/") ? [] : [...cwd];
  p.replace(/^~/, "")
    .split("/")
    .forEach((seg) => {
      if (!seg || seg === ".") return;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    });
  return parts;
}

/**
 * data = { projects, categories, experience, skills, site, about }
 *   skills: output of buildSkills() (src/lib/skills.js)
 */
export function createFs(data) {
  const { projects, categories, experience, skills, site, about } = data;

  const root = {
    t: "dir",
    c: {
      ".eggrc": { t: "file", k: "eggrc" },
      "about.txt": { t: "file", k: "about" },
      "contact.vcf": { t: "file", k: "contact" },
      egg: { t: "file", k: "bin" },
      experience: { t: "dir", c: {} },
      projects: { t: "dir", c: {} },
      "resume.pdf": { t: "file", k: "pdf" },
      skills: { t: "dir", c: {} },
    },
  };
  // ~/experience/<company>.log, newest first; ~/skills/<group>.txt. `ord` keeps that
  // order in ls/tree (other files sort by name).
  experience.forEach((e, i) => {
    root.c.experience.c[expFile(e)] = { t: "file", k: "exp", i, ord: i };
  });
  skills.forEach((g, i) => {
    root.c.skills.c[g.label + ".txt"] = { t: "file", k: "skills", g: i, ord: i };
  });
  categories.forEach((c) => {
    const d = { t: "dir", c: {} };
    projects
      .filter((p) => p.category === c)
      .forEach((p) => {
        d.c[p.slug + ".md"] = { t: "file", k: "proj", slug: p.slug };
      });
    root.c.projects.c[c] = d;
  });

  const project = (slug) => projects.find((x) => x.slug === slug);
  const expPath = (i) => "experience/" + expFile(experience[i]);
  const projPath = (p) => "projects/" + p.category + "/" + p.slug + ".md";

  function getNode(parts) {
    let n = root;
    for (const s of parts) {
      // Own keys only: "constructor" / "__proto__" must not resolve to Object members.
      if (!n || n.t !== "dir" || !Object.hasOwn(n.c, s)) return null;
      n = n.c[s];
    }
    return n || null;
  }

  // `q` itself if it's in `list`, else the only item starting with it (null when none or
  // several do).
  const pick = (list, q) => {
    if (list.includes(q)) return q;
    const m = list.filter((x) => x.startsWith(q));
    return m.length === 1 ? m[0] : null;
  };
  const slugs = projects.map((x) => x.slug),
    roles = experience.map((e) => slugify(e.company)),
    groups = skills.map((g) => g.label);

  // Exact path first; otherwise a bare name from anywhere: a home file without its
  // extension (`cat about`), a project slug or a unique prefix of one (`cat ppeo`), a
  // role (`cat ieso`) or a skill group (`cat tools`). A path with a folder in it
  // (`cat nope/a`) only matches exactly, and an ambiguous prefix (`cat p`) matches nothing.
  function findFile(cwd, p) {
    const parts = resolve(cwd, p),
      node = getNode(parts);
    if (node) return { node, parts };
    if (p.includes("/")) return null;
    const q = p.replace(/\.(md|log|txt)$/, "");
    if (!q) return null;
    const home = Object.keys(root.c).find(
      (k) => root.c[k].t === "file" && k.replace(/^\./, "").replace(/\.[a-z]+$/, "") === q,
    );
    if (home) return { node: root.c[home], parts: [home] };
    const slug = pick(slugs, q);
    if (slug) {
      const pr = project(slug);
      return { node: { t: "file", k: "proj", slug }, parts: projPath(pr).split("/") };
    }
    const role = pick(roles, q);
    if (role) {
      const i = roles.indexOf(role);
      return { node: { t: "file", k: "exp", i }, parts: expPath(i).split("/") };
    }
    const group = pick(groups, q);
    if (group) {
      const g = groups.indexOf(group);
      return { node: { t: "file", k: "skills", g }, parts: ["skills", group + ".txt"] };
    }
    return null;
  }

  // Directories first, then alphabetical. Dotfiles only with `all`.
  const sortKeys = (node, all) =>
    Object.keys(node.c)
      .filter((k) => all || !k.startsWith("."))
      .sort(
        (a, b) =>
          (node.c[b].t === "dir") - (node.c[a].t === "dir") ||
          (node.c[a].ord ?? 0) - (node.c[b].ord ?? 0) ||
          a.localeCompare(b),
      );

  // Plain-text contents, as vim/less shows them.
  function fileLines(node) {
    switch (node.k) {
      case "about":
        return joinParagraphs(about).replace(/\n+$/, "").split("\n");
      case "exp": {
        const e = experience[node.i];
        return [
          "# " + e.title + " @ " + e.company,
          "  " + e.date + " · " + e.loc,
          "  " + e.summary,
          ...e.details.map((d) => "  - " + d),
        ];
      }
      case "skills": {
        const g = skills[node.g];
        return [
          "# " + g.label + ", by how many projects use them",
          "",
          ...g.items.map((s) => s.name.padEnd(12) + " " + s.bar + (s.count ? " " + s.count : "")),
        ];
      }
      case "contact":
        return [
          "BEGIN:VCARD",
          "VERSION:4.0",
          "FN:" + site.name,
          "EMAIL:" + site.email,
          "URL;TYPE=github:" + site.github.profile,
          "URL;TYPE=linkedin:" + site.linkedin,
          "END:VCARD",
        ];
      case "pdf":
        return [
          "%PDF-1.7",
          "%âãÏÓ",
          "1 0 obj << /Type /Catalog /Pages 2 0 R >>",
          "stream ^@^@^@^@…",
          "",
          '"this is a binary — :q, then: xdg-open resume.pdf"',
        ];
      case "bin":
        return [
          "^?ELF^B^A^A^@^@^@^@^@^@^@^@^@^C^@>^@",
          "^@^@^@^@^@^@^@^@^@^@^@^@@^@8^@",
          "",
          '"this is an executable — :q, then: ./egg"',
        ];
      case "eggrc":
        return ["# ~/.eggrc", "boil_time=6.5m", "ice_bath=true", "yolk=jammy", "salt=flaky"];
      case "proj": {
        const p = project(node.slug);
        return [
          "# " + p.title,
          "",
          "type:     " + p.category,
          "org:      " + p.org,
          ...(p.role ? ["role:     " + p.role] : []),
          "timeline: " + p.timeline,
          ...(p.location ? ["location: " + p.location] : []),
          "context:  " + p.context,
          "",
          "## purpose",
          p.purpose,
          "",
          "## what i did",
          ...p.bullets.map((b) => "- " + b),
          "",
          "## stack",
          p.tags.join(", "),
          "",
          "## links",
          ...(p.links.length
            ? p.links.map((l) => l.label + ": " + l.href)
            : ["(internal project)"]),
        ];
      }
    }
    return [];
  }

  return { root, project, projPath, expPath, getNode, findFile, sortKeys, fileLines };
}
