import test from "node:test";
import assert from "node:assert/strict";
import { isProjectAddress } from "@/lib/bootProject";
import { parsePath } from "@/lib/urls";
import { projects } from "@/data/projects";

const slugs = projects.map((p) => p.slug);
const real = slugs[0];

// The boot script's "is this a project?" must agree with the app's parsePath, so a typo or
// removed slug with the terminal saved doesn't hide the gui for a terminal the app never opens.
test("isProjectAddress agrees with parsePath for real, mistyped and section addresses", () => {
  const cases = [
    ["/Portfolio/", ""],
    ["/Portfolio/", "#projects"],
    ["/Portfolio/", "#experience"],
    ["/Portfolio/", "#/skills"],
    ["/Portfolio/", `#projects/${real}`],
    ["/Portfolio/", `#/projects/${real}`],
    ["/Portfolio/", `#${real}`],
    ["/Portfolio/", "#projects/not-a-project"],
    ["/Portfolio/", "#not-a-project"],
    ["/Portfolio/", "#projects/"],
    [`/Portfolio/projects/${real}/`, ""],
    [`/Portfolio/projects/${real}`, ""],
    ["/Portfolio/projects/removed-slug/", ""],
    ["/Portfolio/projects/", ""],
  ];
  for (const [path, hash] of cases) {
    assert.equal(
      isProjectAddress(slugs, path, hash),
      "slug" in parsePath(path, hash),
      `${path}${hash}`,
    );
  }
  assert.equal(isProjectAddress(slugs, `/Portfolio/projects/${real}/`, ""), true);
  assert.equal(isProjectAddress(slugs, "/Portfolio/projects/removed-slug/", ""), false);
});

test("isProjectAddress is self-contained, so the boot script can embed its source", () => {
  const fn = new Function(`return (${String(isProjectAddress)})`)();
  assert.equal(fn(slugs, `/Portfolio/projects/${real}/`, ""), true);
  assert.equal(fn(slugs, "/Portfolio/projects/x/", "#y"), false);
});
