// The projects, as data, for the scripts that run under plain node. src/data/projects.js
// imports through the "@/" alias, so this installs the same loader `npm test` uses first.
import { register } from "node:module";

export async function loadProjects() {
  register("../test/hooks.mjs", import.meta.url);
  return (await import("../src/data/projects.js")).projects;
}
