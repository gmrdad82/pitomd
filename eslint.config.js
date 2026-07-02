// ESLint flat config — lints the vanilla JS islands + build config.
// (.astro frontmatter typing is covered by `astro check`; this catches the
// browser JS: unused vars, undefined refs, == vs ===, etc.)
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", ".astro/", "node_modules/", "tools/shots/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "*.mjs", "*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      eqeqeq: ["warn", "smart"],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
