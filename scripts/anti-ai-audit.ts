/**
 * T189 — Principle I audit, code half (the screenshot half is in docs/visual-checks/ANTI-AI-AUDIT.md).
 *
 * Constitution I-ب: the merchant dashboard, the storefront chrome, the console, POS, courier and
 * Sharwa Pay are RESTRAINED — zinc, 1px borders, no brand colour, no gradients, no coloured
 * glows/shadows, no glassmorphism, no emoji in the UI. The marketing surface (I-أ) is exempt
 * from the first five and keeps only the copy rules, so `src/features/landing/**` and
 * `src/app/(marketing)/**` are skipped. Storefront THEMES (merchant-chosen colours via CSS
 * variables in `src/features/storefront/theme`) are the merchant's brand, not ours: allowed.
 *
 *   npx tsx scripts/anti-ai-audit.ts   → exit 1 on any finding
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SKIP = [
  join("src", "features", "landing"),
  join("src", "app", "(marketing)"),
  join("src", "components", "ui"), // generated primitives, reviewed by hand
  join("src", "mocks"), // fixtures: copy, not UI chrome
];

/**
 * Shared modules the marketing surface owns: skipped ONLY while every importer is marketing
 * code (checked below — an import from a restrained surface turns them back into findings).
 */
const MARKETING_ONLY = [join("src", "components", "motion"), join("src", "components", "shared", "logo.tsx")];
const MARKETING = [join("src", "features", "landing"), join("src", "app", "(marketing)"), ...MARKETING_ONLY];

const RULES: Array<{ id: string; re: RegExp; why: string }> = [
  { id: "gradient", re: /\b(bg-(linear|radial|conic|gradient)-|bg-gradient-to-|from-(emerald|cyan|teal|green|blue|indigo|violet|purple|pink|rose|amber|orange|sky)-)/, why: "gradient on a restrained surface" },
  { id: "brand", re: /\b(bg|text|border|ring|fill|stroke|decoration|outline)-(emerald|cyan|teal)-\d{2,3}/, why: "brand colour on a restrained surface" },
  { id: "glow", re: /\bshadow-(emerald|cyan|teal|green|blue|indigo|violet|purple|pink|rose|amber|orange|sky|red|yellow)-\d{2,3}/, why: "coloured glow/shadow" },
  { id: "glass", re: /\bbackdrop-blur(-\w+)?\b/, why: "glassmorphism" },
  { id: "heavy-shadow", re: /\bshadow-(lg|xl|2xl)\b/, why: "separation by heavy shadow instead of a 1px border" },
  { id: "emoji", re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, why: "emoji in the UI" },
  { id: "filler", re: /(أطلق العنان|ثورة في|بلا حدود|الحل الأمثل|سحر|مذهل)/, why: "generic filler copy" },
];

/** Overlays that legitimately float (menus, dialogs, toasts) may keep a soft neutral shadow. */
const HEAVY_SHADOW_OK = /(popover|dropdown|dialog|sheet|drawer|toast|sonner|command|tooltip|palette|menu)/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p);
    if (inside(rel, SKIP) || inside(rel, MARKETING_ONLY)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const findings: string[] = [];
const counts: Record<string, number> = {};
const inside = (rel: string, roots: string[]) => roots.some((s) => rel === s || rel.startsWith(s + sep));

function allFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) allFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// Marketing-only modules: prove no restrained surface imports them.
const marketingOnlyImports = MARKETING_ONLY.map((m) => "@/" + m.replace(/^src[\\/]/, "").replace(/\\/g, "/").replace(/\.tsx$/, ""));
for (const file of allFiles(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  if (inside(rel, MARKETING)) continue;
  const text = readFileSync(file, "utf8");
  for (const spec of marketingOnlyImports) if (text.includes(`"${spec}`)) findings.push(`${rel} [import] imports the marketing-only module ${spec}`);
}
for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const r of RULES) {
        if (!r.re.test(line)) continue;
        if (r.id === "heavy-shadow" && (HEAVY_SHADOW_OK.test(rel) || HEAVY_SHADOW_OK.test(line))) continue;
        counts[r.id] = (counts[r.id] ?? 0) + 1;
        findings.push(`${rel}:${i + 1} [${r.id}] ${r.why}: ${line.trim().slice(0, 110)}`);
      }
    });
}

if (findings.length) {
  console.log(findings.join("\n"));
  console.log(`\n✗ ${findings.length} finding(s) ${JSON.stringify(counts)}`);
  process.exit(1);
}
console.log("✓ Principle I (code): 0 gradients, brand colours, glows, glass, heavy shadows, emoji or filler outside the marketing surface");
