import nextVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "design_handoff_portfolio_v4/**"],
  },
  ...nextVitals,
  {
    rules: {
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // eslint-config-next leaves this off; its globals already cover the browser and node,
      // so this only catches names a rename left behind.
      "no-undef": "error",
      // Prettier doesn't wrap comments, so a long one slips through format:check. Only
      // comment lines are held to the width; code is Prettier's.
      "max-len": ["error", { code: 1000, comments: 100, ignoreUrls: true }],
    },
  },
];

export default config;
