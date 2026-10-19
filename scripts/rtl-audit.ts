/**
 * T188 — RTL audit (constitution II). Two sweeps over `src/` (generated shadcn primitives in
 * `src/components/ui` are reviewed by hand and skipped, like the ESLint guard):
 *   1. physical direction utilities (`ml-`, `pr-`, `left-`, `text-right`, `rounded-l-` …) in any
 *      `.ts`/`.tsx` string — ESLint covers `.tsx` literals; this also covers `.ts` class maps;
 *   2. directional icons (`Arrow*`/`Chevron*`/`Panel*` Left|Right, `SendHorizontal`) rendered without a
 *      mirror class (`rtl:rotate-180`, `ltr:rotate-180`, `rtl:-scale-x-100`).
 * Icons are authored in their LTR meaning and mirrored for RTL, so the code stays correct if a
 * page ever renders LTR. Exempt (not inline-direction): `CornerDownLeft` (the Enter-key glyph)
 * and `ArrowUpRight` (a trend mark).
 *
 *   npx tsx scripts/rtl-audit.ts        → exit 1 on any finding
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const PHYSICAL = /(^|[\s"'`:])-?(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|border-l|border-r|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[\w[]/;
const ICON = /<((?:Arrow|Chevron|Chevrons|Panel)(?:Left|Right)\w*|SendHorizontal\w*)\b([^>]*)/g;
const EXEMPT = new Set(["CornerDownLeft", "ArrowUpRight"]);
const MIRROR = /\b(rtl:rotate-180|ltr:rotate-180|rtl:-scale-x-100|ltr:-scale-x-100)\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (relative(ROOT, p) === join("components", "ui")) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const findings: string[] = [];
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    // Only class-like strings: a className/cn()/cva literal or a string holding Tailwind tokens.
    for (const m of line.matchAll(/(["'`])((?:(?!\1).)*)\1/g)) {
      const value = m[2] ?? "";
      if (!/\b(flex|grid|px-|py-|p-|m[xy]?-|gap-|text-|rounded|border|inset|absolute|size-|w-|h-)/.test(value)) continue;
      if (PHYSICAL.test(` ${value}`)) findings.push(`${rel}:${i + 1} physical direction utility: ${value.trim().slice(0, 80)}`);
    }
  });
  if (!rel.endsWith(".tsx")) continue;
  for (const m of text.matchAll(ICON)) {
    const name = m[1]!;
    if (EXEMPT.has(name)) continue;
    // The attributes may wrap onto the next lines: read up to the tag end.
    const end = text.indexOf(">", m.index!);
    const tag = text.slice(m.index!, end);
    if (!MIRROR.test(tag)) {
      const line = text.slice(0, m.index!).split("\n").length;
      findings.push(`${rel}:${line} <${name}> without a mirror class (rtl:rotate-180)`);
    }
  }
}

if (findings.length) {
  console.log(findings.join("\n"));
  console.log(`\n✗ ${findings.length} RTL finding(s)`);
  process.exit(1);
}
console.log("✓ RTL audit: 0 physical direction utilities, every directional icon mirrored");
