// ESLint 9 flat config minimo per il progetto.
// Nota: eslint-config-next 16 ha un bug noto di riferimento circolare
// con il FlatCompat, quindi non lo usiamo. I tipi li controlla `npm run
// typecheck`; qui:
//   - .js/.mjs (script, config): regole base;
//   - .ts/.tsx: poche regole ad alto valore — hook di React usati bene,
//     niente `any` (regola di progetto), `console` solo come avviso (va
//     usato lib/logger).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
// Caricati solo perché il codice ha commenti `eslint-disable` che citano
// le loro regole (es. @next/next/no-img-element): senza il plugin ESLint
// segnala «regola non trovata». Le loro regole non sono attivate.
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
      "jsx-a11y": jsxA11y,
    },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
      },
    },
  },
];
