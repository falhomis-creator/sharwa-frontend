/**
 * T192 — regenerates `specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md`
 * from §7 «عقد البيانات» of every `modules/M*.md` (the module file stays the source of truth),
 * then appends the contracts the frontend added on the owner's decisions after the specs were
 * written (Phases 5–7), so the backend team has ONE list.
 *
 *   npx tsx scripts/needs-backend-inventory.ts [--check]   (--check: exit 1 if the file is stale)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = join(process.cwd(), "specs", "001-sharwa-frontend-platform");
const MODULES = join(SPEC, "modules");
const OUT = join(SPEC, "contracts", "needs-backend-inventory.md");
const DATE = "2026-10-19";

type Kind = "ready" | "needs" | "na";
interface Row {
  need: string;
  today: string;
  status: string;
  kind: Kind;
}
interface Mod {
  id: string;
  title: string;
  file: string;
  rows: Row[];
}

/** Split a Markdown table row on unescaped pipes (`\|` stays inside the cell). */
function cells(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === "\\" && line[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (ch === "|") {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts.slice(1, -1).map((c) => c.trim());
}

function kindOf(status: string): Kind {
  if (/^Ready/i.test(status)) return "ready";
  if (status.includes("[NEEDS BACKEND]")) return "needs";
  return "na";
}

function parse(file: string): Mod {
  const text = readFileSync(join(MODULES, file), "utf8");
  const [, id = "", title = ""] = /^#\s+(M\d+)\s+—\s+(.+)$/m.exec(text) ?? [];
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^## 7\./.test(l));
  const rows: Row[] = [];
  if (start >= 0) {
    for (let i = start + 1; i < lines.length && !/^## /.test(lines[i]!); i++) {
      const l = lines[i]!;
      if (!l.startsWith("|") || /^\|\s*-/.test(l) || /^\|\s*Need\s*\|/.test(l)) continue;
      const [need = "", today = "", status = ""] = cells(l);
      rows.push({ need, today, status, kind: kindOf(status) });
    }
  }
  return { id, title, file, rows };
}

/** Contracts introduced or changed by owner decisions after the module specs (Phases 5–7). */
const ADDITIONS: Array<{ module: string; need: string; contract: string; decision: string }> = [
  { module: "M16 · M46", need: "مفتاح ميزة نقطة البيع", contract: "`FeatureFlag(code=\"pos\", requires_plan=True)` يظهر في `features[]` لـ `GET /api/v1/auth/me/` وفي كتالوج M46؛ `/api/v1/pos/*` يجيب 403 `{detail, code:\"feature_disabled\"}` حين يكون معطّلاً", decision: "2026-10-19 · المرحلة 7 · 1" },
  { module: "M16", need: "رمز المدير وحد OTP الاسترجاع", contract: "يبقيان mock (`2468`، `200.00`) حتى يحدّد الباك إند الآلية (PIN/OTP) والحد", decision: "2026-10-19 · المرحلة 7 · 1" },
  { module: "M03 · M23", need: "بوابة شريط «أوامر الشراء»", contract: "لا عقد جديد — الواجهة تقبل قائمة صلاحيات (أيّها): `suppliers.manage` أو `suppliers.approve`؛ الخادم يقرأ بأيٍّ منهما (FR-23.01)", decision: "2026-10-19 · المرحلة 7 · 2" },
  { module: "M39 · M15", need: "إشراف المندوبين بلا شروة شيب", contract: "`GET /api/v1/shipping/supervisor/`، `GET /api/v1/shipping/agent-shifts/`، `POST /api/v1/shipping/agents/<id>/emergency-reassign/`، `POST /api/v1/shipping/shipments/<id>/assign/` `{agent_id}` تُفتح بـ `sharwa_ship` **أو** `shipping_providers`؛ بلا شروة شيب تعود `unassigned_new_orders` فارغة من شحنات شروة شيب", decision: "2026-10-19 · المرحلة 7 · 3" },
  { module: "M37 · M10", need: "هوية المزايد", contract: "`POST /api/v1/catalog/products/<id>/bids/` `{bidder_name, bidder_phone, amount}` بلا OTP → 200 المزاد / 400 `{bidder_name|bidder_phone|amount:[msg]}` / 409 `{detail, auction}`", decision: "2026-10-19 · المرحلة 7 · 4" },
  { module: "M29", need: "حقول ربط ملف المورد", contract: "`FeedMapping` بالحقول الـ 20 كما في `GET /api/v1/dropshipping/meta/` → `feed_fields`؛ الإلزامية `sku, name, cost, stock` (معتمدة)", decision: "2026-10-19 · المرحلة 7 · 5" },
  { module: "M05/M14/M15/M19/M22", need: "شاشات المالك فقط", contract: "لا مفاتيح صلاحية جديدة؛ تبقى الشاشات بلا مفتاح للمالك وحده و403 للموظفين حتى يضيف Django مفاتيح مثل `settings.manage`", decision: "2026-10-19 · المرحلة 5 · 1" },
  { module: "M18", need: "دور «مدير المتجر»", contract: "مجموعة الصلاحيات الافتراضية كما في `MOCK_MANAGER_PERMISSIONS` (`src/mocks/dashboard/me.ts`)", decision: "2026-10-19 · المرحلة 5 · 2" },
];

function render(mods: Mod[]): string {
  const sum = (m: Mod, k: Kind) => m.rows.filter((r) => r.kind === k).length;
  const total = (k: Kind | "all") => mods.reduce((n, m) => n + (k === "all" ? m.rows.length : sum(m, k)), 0);
  const out: string[] = [];
  out.push("# Backend Gap Inventory — عقود البيانات المجمَّعة من الوحدات الـ 49", "");
  out.push(
    `> مولَّد آلياً بـ \`scripts/needs-backend-inventory.ts\` من §7 «عقد البيانات» في كل \`modules/M*.md\` (${DATE}). المصدر الحاكم هو ملف الوحدة؛ هذا الملف فهرس تجميعي لفريق الباك إند. لا تحرّره يدوياً — عدّل الوحدة وأعد التوليد.`,
  );
  out.push(
    "> **Ready** = موجود اليوم على `/api/v1` ويُستهلك مباشرة عبر الـ BFF. **`[NEEDS BACKEND]`** = يُبنى على Mock محلي بنفس العقد تحت `src/mocks/` ويُعلَّم في الواجهة (`x-sharwa-mock: 1`).",
    "",
  );
  out.push("## Summary", "", "| Module | Rows | Ready | `[NEEDS BACKEND]` | n/a / local |", "|---|---|---|---|---|");
  for (const m of mods) out.push(`| [${m.id}](../modules/${m.file}) | ${m.rows.length} | ${sum(m, "ready")} | ${sum(m, "needs")} | ${sum(m, "na")} |`);
  out.push(`| **Total** | **${total("all")}** | **${total("ready")}** | **${total("needs")}** | **${total("na")}** |`, "");
  out.push("## Frontend additions after the module specs (owner decisions)", "");
  out.push("عقود أو بوابات أضافتها الواجهة بقرار المالك بعد كتابة المواصفات؛ كلها `[NEEDS BACKEND]` ما لم يُذكر غير ذلك.", "");
  out.push("| Module | Need | Contract | Decision |", "|---|---|---|---|");
  for (const a of ADDITIONS) out.push(`| ${a.module} | ${a.need} | ${a.contract} | ${a.decision} |`);
  out.push("", "## Per-module rows", "");
  for (const m of mods) {
    out.push(`### ${m.id} — ${m.title}`, "", "| Need | Backend today | Status |", "|---|---|---|");
    for (const r of m.rows) out.push(`| ${r.need} | ${r.today} | ${r.status} |`);
    out.push("");
  }
  return out.join("\n");
}

const mods = readdirSync(MODULES)
  .filter((f) => /^M\d+-.*\.md$/.test(f))
  .sort()
  .map(parse);
const next = render(mods);
if (process.argv.includes("--check")) {
  const cur = readFileSync(OUT, "utf8");
  if (cur !== next) {
    console.log("✗ needs-backend-inventory.md is stale — run: npx tsx scripts/needs-backend-inventory.ts");
    process.exit(1);
  }
  console.log("✓ needs-backend-inventory.md is current");
} else {
  writeFileSync(OUT, next);
  const n = mods.reduce((a, m) => a + m.rows.length, 0);
  console.log(`✓ wrote ${OUT} — ${mods.length} modules, ${n} rows, ${ADDITIONS.length} additions`);
}
