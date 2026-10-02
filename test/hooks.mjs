// Loader for `npm test`: lets node:test import the app's modules the way Next resolves
// them. "@/x" → src/x, extensionless relative paths get ".js", src/**/*.js loads as ESM
// (package.json has no "type"), and JSON under src imports without an attribute.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url).href;

const withExt = (href) => {
  if (/\.(m?js|json)$/.test(href)) return href;
  for (const tail of [".js", "/index.js"]) {
    if (existsSync(fileURLToPath(href + tail))) return href + tail;
  }
  return href;
};

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(withExt(SRC + specifier.slice(2)), context);
  if (specifier.startsWith(".") && context.parentURL?.startsWith(SRC))
    return next(withExt(new URL(specifier, context.parentURL).href), context);
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith(SRC) && url.endsWith(".json"))
    return {
      format: "module",
      source: "export default " + readFileSync(fileURLToPath(url), "utf8"),
      shortCircuit: true,
    };
  if (url.startsWith(SRC) && url.endsWith(".js"))
    return next(url, { ...context, format: "module" });
  return next(url, context);
}

export const srcUrl = (p) => pathToFileURL(fileURLToPath(SRC) + p).href;
