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
  ]),

  // ── Layered-architecture boundaries (enforce the seams) ──
  // Core stays transport-agnostic: only the Repository interface + contracts.
  // No pg, no Next, no data-layer implementation/injector.
  {
    files: ["lib/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        // Exact-match the data specifiers so @/lib/data/repository (the interface)
        // stays allowed while the injector + implementations are blocked.
        paths: [
          { name: "pg", message: "Core must stay transport-agnostic — no pg." },
          { name: "@/lib/data", message: "Core must not import the data injector. Depend on @/lib/data/repository (interface)." },
          { name: "@/lib/data/pg", message: "Core must not import the pg implementation. Depend on @/lib/data/repository (interface)." },
          { name: "@/lib/data/pool", message: "Core must not import the pg pool." },
          { name: "@/lib/data/http-client", message: "Core must not import the HTTP data client." },
          { name: "@/lib/data/index", message: "Core must not import the data injector. Depend on @/lib/data/repository (interface)." },
        ],
        patterns: [{ group: ["next", "next/*"], message: "Core must not import Next — keep it framework-agnostic." }],
      }],
    },
  },
  // Contracts are pure shared types — no I/O, no framework, no upward deps.
  {
    files: ["lib/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["pg", "next", "next/*", "@/lib/data", "@/lib/data/*", "@/lib/core", "@/lib/core/*"],
          message: "Contracts must be pure shared types — no pg/next, no data/core deps.",
        }],
      }],
    },
  },
  // UI (components/pages/contexts/hooks) talks to Seam A over HTTP only — never
  // the database or the server-only data layer directly. (Route handlers under
  // app/api are the composition root and are exempt.)
  {
    files: ["components/**/*.{ts,tsx}", "contexts/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "app/**/page.tsx", "app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["pg", "@/lib/data", "@/lib/data/*", "@/lib/db"],
          message: "UI is server-authoritative over Seam A (/api/v1 via lib/api). Do not import the data layer or pg in the browser.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
