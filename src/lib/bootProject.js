// Whether an address names a real project, for the boot script in app/layout.js. That script runs
// before the app, so it can't call parsePath (src/lib/urls.js); this function is written out as
// the script's source (`String(isProjectAddress)`), so it must stay self-contained: no imports, no
// outside names. Its answer must equal `"slug" in parsePath(pathname, hash)` (test/bootProject).

/** True when the path or the hash names one of `slugs` (the project pages and the older hashes). */
export function isProjectAddress(slugs, pathname, hash) {
  var m = pathname.match(/\/projects\/([^/]+)\/?$/);
  if (m && slugs.indexOf(m[1]) >= 0) return true;
  var parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "projects" && parts[1] && slugs.indexOf(parts[1]) >= 0) return true;
  return !parts[1] && slugs.indexOf(parts[0]) >= 0;
}
