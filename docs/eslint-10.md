# ESLint 10

Read before touching `eslint.config.mjs`, bumping `eslint`, `eslint-config-next` or the lint plugins, or when lint crashes after an upgrade.

`eslint-config-next` 16.4.5 declares `eslint >=9` as its peer range, and `eslint.config.mjs` no longer carries the two workarounds it needed while the plugins lagged ESLint 10 (removed 2026-11-18):

- JS/JSX files used ESLint's own parser (`espree`, then a direct devDependency) because Next's bundled Babel parser crashed on ESLint 10 ("scopeManager.addGlobals is not a function"). Next's parser works now.
- `settings.react.version` was pinned because `eslint-plugin-react` autodetected the version through `context.getFilename()`, which ESLint 10 removed. The autodetect works now (eslint-plugin-react 7.37.5).

Checked on removal: `npm run lint` is clean, and a scratch file with `setState` in an effect body, `Date.now()` in render and an undefined name failed with `react-hooks/purity` and `no-undef` (the React Compiler rules and `no-undef` still run).

If a lint plugin starts calling another removed ESLint API, lint fails loudly (a crash), not silently. Re-add a workaround only then, and write it here with the error it fixes.
