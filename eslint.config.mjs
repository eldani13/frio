import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Patrones válidos de datos (load al montar, reset al cambiar deps) disparan falsos positivos con React 19.
      "react-hooks/set-state-in-effect": "off",
      // El compilador de React y memo manual a veces no coinciden; no bloquear el lint por ello.
      "react-hooks/preserve-manual-memoization": "off",
      // Demasiadas advertencias en código ya estable; mantener el build limpio sin forzar refactors masivos.
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
