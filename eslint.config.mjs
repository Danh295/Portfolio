import nextVitals from "eslint-config-next/core-web-vitals";
import * as espree from "espree";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "design_handoff_portfolio_v4/**"],
  },
  ...nextVitals,
  {
    // eslint-config-next's bundled parser (a copy of @babel/eslint-parser) predates ESLint 10
    // and crashes on it ("scopeManager.addGlobals is not a function"). The site is plain
    // JS/JSX, so ESLint's own parser handles it.
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      parser: espree,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
  },
  {
    // eslint-plugin-react 7.37.5 autodetects the React version through context.getFilename(),
    // which ESLint 10 removed; naming the version skips the detection.
    settings: { react: { version: "19" } },
    rules: {
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // eslint-config-next leaves this off; its globals already cover the browser and node,
      // so this only catches names a rename left behind.
      "no-undef": "error",
    },
  },
];

export default config;
