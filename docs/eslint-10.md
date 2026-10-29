# ESLint 10 workarounds

Read before touching `eslint.config.mjs`, bumping `eslint`, `eslint-config-next` or the lint plugins, or when lint crashes after an upgrade. Moved from CLAUDE.md unchanged.

`eslint.config.mjs` carries two workarounds, because `eslint-config-next` 16.3.8 and its plugins (`eslint-plugin-react` 7.37.5, `import` 2.32.0, `jsx-a11y` 6.10.2) don't declare ESLint 10 support yet:

- JS/JSX files use ESLint's own parser (`espree`, a direct devDependency), because Next's bundled Babel parser crashes on ESLint 10.
- `settings.react.version` is pinned, because `eslint-plugin-react` autodetects it through `context.getFilename()`, which ESLint 10 removed.

Remove both once those packages release ESLint 10 support (check `npm view eslint-config-next peerDependencies` and the plugins' peer ranges). A plugin that starts calling another removed API fails loudly (a crash on lint), not silently.
