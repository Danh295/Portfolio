import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "@/lib/shell/fs";
import { shell } from "@/lib/shell";
import { histStep } from "@/lib/shell/history";

const run = (line, cwd = []) => shell.runLine(line, "embed", { cwd });
const errs = (r) => r.out.filter((l) => l.t === "err").map((l) => l.text);

test("resolve: ~, /, /home/danny, . and ..", () => {
  assert.deepEqual(resolve(["projects"], ".."), []);
  assert.deepEqual(resolve(["projects"], "../.."), []);
  assert.deepEqual(resolve(["projects"], "~"), []);
  assert.deepEqual(resolve(["projects"], "/"), []);
  assert.deepEqual(resolve([], "projects/hackathon/"), ["projects", "hackathon"]);
  assert.deepEqual(resolve(["skills"], "./../projects"), ["projects"]);
  assert.deepEqual(resolve(["skills"], "/home/danny"), []);
  assert.deepEqual(resolve([], "/home/danny/projects"), ["projects"]);
});

test("cd /home/danny works (it's what pwd prints)", () => {
  const r = run("cd /home/danny/projects");
  assert.deepEqual(errs(r), []);
  assert.deepEqual(r.cwd, ["projects"]);
  assert.match(run("pwd", ["projects"]).out.at(-1).text, /^\/home\/danny\/projects$/);
});

test("findFile: exact paths, bare names, unique prefixes only", () => {
  const { findFile } = shell.fs;
  assert.equal(findFile([], "about").parts.join("/"), "about.txt");
  assert.equal(findFile([], "contact").parts.join("/"), "contact.vcf");
  assert.equal(findFile([], "ieso").node.k, "exp");
  assert.equal(findFile([], "tools").node.k, "skills");
  assert.equal(findFile([], "recall").node.slug, "recall");
  assert.equal(findFile([], "ppeo").node.slug, "ppeo-scan");
  assert.equal(findFile([], "p"), null, "ambiguous prefix");
  assert.equal(findFile([], "nope/recall"), null, "a folder in the path must exist");
  assert.equal(findFile(["projects"], "hackathon/recall.md").node.slug, "recall");
});

test("cat about / cat nope/a", () => {
  assert.deepEqual(errs(run("cat about")), []);
  assert.equal(errs(run("cat nope/a")).length, 1);
});

test("&& stops at the first failing command; clear wipes earlier output", () => {
  const r = run("cat nope && ls");
  assert.equal(errs(r).length, 1);
  assert.ok(!r.out.some((l) => l.t === "ls"));
  const c = run("ls && clear && pwd");
  assert.equal(c.fx.clear, true);
  assert.ok(!c.out.some((l) => l.t === "ls"));
});

test("tab completion", () => {
  const c = (s, cwd = []) => shell.complete(s, cwd);
  assert.deepEqual(c("pw"), { input: "pwd " });
  assert.deepEqual(c(" pw"), { input: "pwd " }, "leading space");
  assert.deepEqual(c("cd .."), { input: "cd ../" });
  assert.deepEqual(c("cd ~"), { input: "cd ~/" });
  assert.deepEqual(c("cd proj"), { input: "cd projects/" });
  assert.equal(c("cd ab"), null, "cd offers folders only");
  assert.deepEqual(c("cat ab"), { input: "cat about.txt" });
  assert.deepEqual(c("EXPORT THEME=l"), { input: "export THEME=light" });
  const m = c("ls projects/");
  assert.ok(m.matches.includes("hackathon"));
  assert.deepEqual(c("cat ."), { input: "cat .eggrc" }, "dotfiles when asked for");
});

test("unknown commands and odd input don't throw", () => {
  for (const line of [
    "",
    "   ",
    "&&",
    "cd",
    "cat",
    "ls ~/../../..",
    "vim",
    "rm -rf /",
    "__proto__",
    "constructor",
  ])
    assert.doesNotThrow(() => run(line), line);
});

// ↑/↓ prompt history (hi: how far back from the newest entry; -1 is the fresh prompt).
const HIST = ["ls", "cd projects", "pwd"];

test("histStep: ↑ from the fresh prompt recalls the newest entry", () => {
  assert.deepEqual(histStep(HIST, -1, 1), { hi: 0, input: "pwd" });
});

test("histStep: ↑ at the oldest entry stays there (and recalls it again)", () => {
  assert.deepEqual(histStep(HIST, 2, 1), { hi: 2, input: "ls" });
});

test("histStep: ↑ with no history does nothing", () => {
  assert.equal(histStep([], -1, 1), null);
});

test("histStep: ↓ steps to the next newer entry", () => {
  assert.deepEqual(histStep(HIST, 1, -1), { hi: 0, input: "pwd" });
});

test("histStep: ↓ from the newest entry is back at an empty fresh prompt", () => {
  assert.deepEqual(histStep(HIST, 0, -1), { hi: -1, input: "" });
});

test("histStep: ↓ at the fresh prompt keeps what's typed", () => {
  assert.equal(histStep(HIST, -1, -1), null);
  assert.equal(histStep([], -1, -1), null);
});
