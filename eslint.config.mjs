import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Constitution guards (I, II, VII, VIII, IX).
 * - Physical direction utilities are forbidden outside generated shadcn primitives
 *   (`src/components/ui`, reviewed manually per constitution II).
 * - Raw hex / oklch colors are forbidden everywhere except `src/app/globals.css`.
 * - Storefront and dashboard code must not import each other.
 */
const PHYSICAL_DIR_RE =
  "/(^|\\s|:)-?(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|border-l|border-r|scroll-ml|scroll-mr|scroll-pl|scroll-pr|inset-l|inset-r)-/";
const RAW_COLOR_RE = "/(#[0-9a-fA-F]{3,8}\\b|oklch\\(|rgb\\(|hsl\\()/";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${RAW_COLOR_RE}]`,
          message:
            "ألوان خام ممنوعة في المكوّنات (الدستور VII) — استخدم رموز globals.css مثل bg-background / text-muted-foreground.",
        },
        {
          selector: `TemplateElement[value.raw=${RAW_COLOR_RE}]`,
          message: "ألوان خام ممنوعة في المكوّنات (الدستور VII) — استخدم رموز globals.css.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${RAW_COLOR_RE}]`,
          message: "ألوان خام ممنوعة في المكوّنات (الدستور VII) — استخدم رموز globals.css.",
        },
        {
          selector: `TemplateElement[value.raw=${RAW_COLOR_RE}]`,
          message: "ألوان خام ممنوعة في المكوّنات (الدستور VII) — استخدم رموز globals.css.",
        },
        {
          selector: `Literal[value=${PHYSICAL_DIR_RE}]`,
          message:
            "خصائص اتجاهية فيزيائية ممنوعة (الدستور II) — استخدم ms-/me-/ps-/pe-/start-/end-/text-start/text-end.",
        },
        {
          selector: `TemplateElement[value.raw=${PHYSICAL_DIR_RE}]`,
          message: "خصائص اتجاهية فيزيائية ممنوعة (الدستور II) — استخدم البدائل المنطقية.",
        },
      ],
    },
  },
  {
    files: ["src/app/(storefront)/**", "src/features/storefront*/**", "src/features/cart/**", "src/features/checkout/**", "src/features/pdp/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/dashboard*", "@/features/dashboard*/**", "@/app/(dashboard)/**"],
              message: "مكونات المتجر لا تستورد من لوحة التاجر (الدستور VIII) — المشترك في @/components و @/lib فقط.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/(dashboard)/**", "src/features/dashboard*/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/storefront*",
                "@/features/storefront*/**",
                "@/features/cart/**",
                "@/features/checkout/**",
                "@/features/pdp/**",
                "@/app/(storefront)/**",
              ],
              message: "لوحة التاجر لا تستورد من مكونات المتجر (الدستور VIII) — المشترك في @/components و @/lib فقط.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
