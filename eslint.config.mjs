import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // TrustVault backend and utility scripts intentionally use CommonJS.
  // Do not apply the TypeScript ESM-only require rule to .cjs files.
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  globalIgnores([
    // Next.js / build outputs
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Local TrustVault backup snapshots
    ".trustvault-backups/**",

    // Local implementation / patch package snapshots
    "trustvault-*-v1/**",

    // Local ad hoc backup files
    "**/*.bak",
    "**/*.bak.*",
  ]),
]);

export default eslintConfig;
