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
    "next-env.d.ts",
    // Test files and scripts
    "src/lib/*.test.ts",
    "src/lib/ai/*.test.ts",
    "scripts/**",
  ]),
  {
    rules: {
      // Downgrade to warn — these never cause build failures and the codebase
      // uses `any` intentionally in many server action / API response shapes.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      // Unescaped entities in JSX are style issues, not bugs.
      "react/no-unescaped-entities": "warn",
      // Allow empty catch blocks (common in error-tolerant server code).
      "@typescript-eslint/no-empty-object-type": "warn",
      // Allow require() in config files / edge cases.
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);

export default eslintConfig;
