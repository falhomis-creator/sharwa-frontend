/**
 * T192 — writes `docs/DELIVERY-REPORT.md`: for every module M01–M49, what was built (route
 * group + the screens' visual-check folder), what checked it (the functional check scripts
 * that drive it + the screenshot count), the restore-point tag (none: the owner keeps a linear
 * history without tags since Phase 5) and the `[NEEDS BACKEND]` rows it consumes (from the
 * module's §7, the same parse as `needs-backend-inventory.ts`).
 *
 *   npx tsx scripts/delivery-report.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MODULES = join(ROOT, "specs", "001-sharwa-frontend-platform", "modules");
const CHECKS = join(ROOT, "docs", "visual-checks");
const SCRIPTS = join(ROOT, "scripts");
const OUT = join(ROOT, "docs", "DELIVERY-REPORT.md");

const PHASE: Record<string, string> = {};
const add = (phase: string, ids: string) => ids.split(" ").forEach((id) => (PHASE[id] = phase));
add("3 · US1", "M01 M02 M03 M04 M05 M06 M34 M47 M48 M49");
add("4 · US2", "M09 M10 M11 M12 M41 M44");
add("5 · US3", "M07 M08 M13 M14 M15 M18 M19 M21 M22 M24 M25 M35 M42");
add("6 · US4", "M20 M45 M46");
add("7 · US5", "M16 M17 M23 M26 M27 M28 M29 M30 M31 M32 M33 M36 M37 M38 M39 M40 M43");

/** Folders whose slug differs from the module number (renames recorded in tasks.md deviations). */
const FOLDER_ALIAS: Record<string, string[]> = { M01: ["01-landing", "01-foundation"], M43: ["43-stores"], M37: ["37-advanced-products"], M47: ["47-tenant-guard"], M03: ["03-dashboard-shell"] };

const scriptTexts = readdirSync(SCRIPTS)
  .filter((f) => f.endsWith("-check.ts"))
  .map((f) => ({ name: f, text: readFileSync(join(SCRIPTS, f), "utf8") }));
const folders = existsSync(CHECKS) ? readdirSync(CHECKS) : [];

function needsRows(text: string): number {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^## 7\./.test(l));
  if (start < 0) return 0;
  let n = 0;
  for (let i = start + 1; i < lines.length && !/^## /.test(lines[i]!); i++) {
    const l = lines[i]!;
    if (!l.startsWith("|") || /^\|\s*-/.test(l) || /^\|\s*Need\s*\|/.test(l)) continue;
    const status = l.split(/(?<!\\)\|/).slice(1, -1)[2]?.trim() ?? "";
    if (!/^Ready/i.test(status) && status.includes("[NEEDS BACKEND]")) n++;
  }
  return n;
}

const rows: string[] = [];
let shots = 0;
let needsTotal = 0;
for (const file of readdirSync(MODULES).filter((f) => /^M\d+-.*\.md$/.test(f)).sort()) {
  const text = readFileSync(join(MODULES, file), "utf8");
  const [, id = "", title = ""] = /^#\s+(M\d+)\s+—\s+(.+)$/m.exec(text) ?? [];
  const group = /\*\*Route group\*\*:\s*([^·\n]+)/.exec(text)?.[1]?.trim() ?? "—";
  const num = id.slice(1);
  const mine = FOLDER_ALIAS[id] ?? folders.filter((f) => f.startsWith(`${num}-`));
  const count = mine.reduce((n, f) => n + readdirSync(join(CHECKS, f)).filter((x) => x.endsWith(".png")).length, 0);
  shots += count;
  // A check drives the module when it writes into its folder or names the module in its header.
  const idRe = new RegExp(`\\b${id}\\b`);
  const drivers = scriptTexts.filter((s) => mine.some((f) => s.text.includes(f)) || idRe.test(s.text.split("*/")[0] ?? "")).map((s) => `\`${s.name.replace(/\.ts$/, "")}\``);
  const needs = needsRows(text);
  needsTotal += needs;
  rows.push(
    `| [${id}](../specs/001-sharwa-frontend-platform/modules/${file}) ${title.replace(/\|/g, "\\|")} | ${PHASE[id] ?? "—"} | ${group.replace(/\|/g, "\\|")} | ${mine.map((f) => `\`${f}/\``).join(" ") || "—"} (${count}) | ${drivers.join(" ") || "lint · tsc · visual-check"} | — | ${needs} |`,
  );
}

const body = `# تقرير التسليم — واجهة منصة شروة (المراحل 1–8)

> مولَّد بـ \`scripts/delivery-report.ts\` (2026-10-19). كل الوحدات الـ 49 مبنية على **mocks** بنفس عقود المواصفات (\`x-sharwa-mock: 1\`)، والباك إند للقراءة فقط.

## الحالة

- **البوابات (المرحلة 8):** \`npm run lint\` · \`npx tsc --noEmit\` · \`scripts/rtl-audit.ts\` · \`scripts/anti-ai-audit.ts\` · \`scripts/tenant-isolation-check.ts\` (10 متاجر) · \`scripts/needs-backend-inventory.ts --check\` · \`npm run build\` من بيئة نظيفة — النتائج في \`execution_log.md\` «Phase 8».
- **الوسوم:** لا وسوم \`rp/*\` منذ المرحلة 5 — سياسة المالك تاريخ خطي بلا وسوم؛ نقطة الاستعادة هي الـ commit. لذلك عمود «الوسم» = —.
- **اللقطات:** ${shots} لقطة تحت \`docs/visual-checks/\` (desktop 1440 · tablet 768/834 · mobile 390 · داكن). تدقيق المبدأ I الكامل في \`docs/visual-checks/ANTI-AI-AUDIT.md\`.
- **\`[NEEDS BACKEND]\`:** ${needsTotal} صفاً من §7 تستهلكها الواجهة اليوم عبر الـ mocks؛ الفهرس الكامل + إضافات قرارات المالك في \`specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md\`.

## لكل وحدة

| الوحدة | المرحلة | مجموعة المسار | الشاشات (اللقطات) | ما فحصها | الوسم | صفوف \`[NEEDS BACKEND]\` |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## ما بقي خارج الواجهة

1. شحن صفوف \`[NEEDS BACKEND]\` في Django — كل محوِّل BFF يصير passthrough بملف واحد (\`src/app/api/bff/README.md\`).
2. قرارات المالك المفتوحة في \`execution_log.md\` (آلية رمز مدير POS والحد، قائمة مندوبين لتسليم المناوبة، حقل اختيار مكوّنات الحزمة …).
3. Lighthouse على بيئة الإنتاج الحقيقية (الأرقام هنا من \`next start\` محلياً على mocks) — \`docs/lighthouse/\`.
`;
writeFileSync(OUT, body);
console.log(`✓ wrote ${OUT} — 49 modules, ${shots} screenshots, ${needsTotal} [NEEDS BACKEND] rows`);
