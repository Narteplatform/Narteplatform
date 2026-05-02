// ESLint 9 flat config minimo per il progetto.
// Nota: eslint-config-next 16 ha un bug noto di riferimento circolare
// con il FlatCompat. La validazione TypeScript è già coperta da
// `npm run typecheck` (tsc --noEmit), quindi qui ESLint controlla
// solo i file .js/.mjs (script, config) per regole base.
import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      "scripts/**",
    ],
  },
  js.configs.recommended,
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
