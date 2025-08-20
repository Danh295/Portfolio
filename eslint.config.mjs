import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],

    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2024,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },

    plugins: {
      react: pluginReact,
    },

    extends: [
      pluginJs.configs.recommended,
      pluginReact.configs.flat.recommended,
    ],

    rules: {
      // Next.js 13+ app directory no longer needs React in scope
      "react/react-in-jsx-scope": "off",

      // skip prop-types errors if you don’t want to define PropTypes
      "react/prop-types": "off",

      // unused vars: warn instead of error, ignore ones starting with _
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // allow apostrophes directly in JSX
      "react/no-unescaped-entities": "off",
    },
  },
];
