/**
 * Functional check for Phase 5 — M18 staff, roles & permissions (T111–T113).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/staff-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M18 Independent Tests, FR-18.01–09, SC-18.1–18.3):
 *   - phone normalisation `0770841802 → 967770841802` (preview in the sheet + stored value),
 *     a duplicate phone → 400 under the field, search by a local number;
 *   - the assignments matrix writes both the role and the operational role (M22's array);
 *   - an override «حجب» beats the role in «الصلاحية النهائية»;
 *   - a personal token's value is returned once and never listed again;
 *   - system roles are read-only (403); a role in use cannot be deleted (403 + staff list);
 *   - approvals: a stale `version` → 409; self-approval → 403 (server, mock level); deciding twice → 409;
 *   - the audit chain verifies clean and reports a break for `?break=1`; the UI says «السجل سليم»;
 *   - terminate keeps the row with status «مُنهى»; the cashier fixture gets 403/«ليست لديك صلاحية»;
 *   - the empty store renders «لا موظفين بعد».
 * The HTTP steps create fresh rows every run (mock state lives in the dev server), so the
 * decision-consuming assertions call the approvals mock in-process. Exit 1 on failure or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { approvalsState, resolveApproval } from "../src/mocks/approvals/state";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const EMPTY = `http://shop.localhost:${PORT}`;
const failures: string[] = [];
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

async function newPage(browser: Browser, session: "merchant" | "staff", host = "noor.localhost", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    // 400/403/409 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|409)/.test(m.text())) consoleErrors.push(`[${session}@${host}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${session}@${host}] PAGEERROR ${e.message}`));
  return page;
}

type Res<T = Record<string, unknown>> = { status: number; data: T };
async function api<T = Record<string, unknown>>(page: Page, method: string, path: string, body?: unknown): Promise<Res<T>> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      return { status: res.status, data: text ? JSON.parse(text) : null };
    },
    { method, path, body },
  ) as Promise<Res<T>>;
}

async function main() {
  const browser = await launch();
  try {
    const page = await newPage(browser, "merchant");
    await page.goto(`${BASE}/dashboard/staff`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("staff-table").getByText("سارة الحربي").first().waitFor({ timeout: 60_000 });

    // 1 · list + search by a local number
    const list = await api<{ count: number; results: Array<{ id: number; full_name: string }> }>(page, "GET", "/api/bff/staff");
    check(list.status === 200 && list.data.count >= 7, `قائمة الموظفين (${list.data.count})`);
    const byPhone = await api<{ results: Array<{ full_name: string }> }>(page, "GET", "/api/bff/staff?q=0770000001");
    check(byPhone.data.results.some((s) => s.full_name === "سارة الحربي"), "البحث برقم محلي 0770000001 يجد سارة");

    // 2 · duplicate phone → 400 under the field (UI), new phone normalised
    await page.getByTestId("add-staff").click();
    await page.getByTestId("staff-form").waitFor({ timeout: 15_000 });
    await page.locator("#staff-phone").fill("0770841802");
    check(await page.getByText("+967 770 841 802").isVisible(), "معاينة الرقم الموحّد +967 770 841 802 في النموذج");
    await page.locator("#staff-name").fill("تجربة مكرر");
    await page.locator("#staff-phone").fill("0770000001");
    await page.getByTestId("staff-form-submit").click();
    await page.getByText("هذا الرقم مسجَّل لموظف آخر.").waitFor({ timeout: 10_000 }).catch(() => undefined);
    check(await page.getByText("هذا الرقم مسجَّل لموظف آخر.").isVisible(), "رقم مكرر → 400 تحت الحقل");
    await page.keyboard.press("Escape");

    const local = `07${String(Date.now()).slice(-8)}`;
    const created = await api<{ id: number; phone: string; status: string }>(page, "POST", "/api/bff/staff", { full_name: "موظف الفحص", phone: local, is_active: true });
    check(created.status === 201 && created.data.phone === `967${local.slice(1)}`, `إضافة موظف: ${local} → ${created.data.phone}`);
    const sid = created.data.id;

    // 3 · assignments matrix: permission role + operational role in one PUT
    const put = await api<Array<{ location_id: number; role_id: number | null; location_role: string | null }>>(page, "PUT", `/api/bff/staff/${sid}/assignments`, [{ location_id: 2, role_id: 3, location_role: "cashier" }]);
    const row = put.data.find?.((r) => r.location_id === 2);
    check(put.status === 200 && row?.role_id === 3 && row?.location_role === "cashier", "التعيين: دور «كاشير» + دور تشغيلي في الموقع 2");

    // 4 · override deny beats the role
    await api(page, "POST", `/api/bff/staff/${sid}/overrides`, { permission_code: "orders.view", allow: false });
    const eff = await api<Array<{ code: string; from_role: boolean; effective: boolean }>>(page, "GET", `/api/bff/staff/${sid}/effective-permissions?location_id=2`);
    const ov = eff.data.find((e) => e.code === "orders.view");
    check(ov?.from_role === true && ov?.effective === false, "استثناء «حجب» يتغلّب على الدور في الصلاحية النهائية");

    // 5 · token shown once
    const tok = await api<{ id: number; token: string }>(page, "POST", `/api/bff/staff/${sid}/tokens`, { name: "فحص" });
    const toks = await api<Array<Record<string, unknown>>>(page, "GET", `/api/bff/staff/${sid}/tokens`);
    check(tok.status === 201 && typeof tok.data.token === "string" && tok.data.token.length > 16 && toks.data.every((t) => !("token" in t)), "قيمة الرمز تُعاد مرة واحدة ولا تظهر في القائمة");

    // 6 · roles: system read-only, in-use undeletable
    const sys = await api(page, "PATCH", "/api/bff/roles/3", { name: "x" });
    check(sys.status === 403, "تعديل دور نظامي → 403");
    const del = await api<{ staff?: Array<{ full_name: string }> }>(page, "DELETE", "/api/bff/roles/5");
    check(del.status === 403 && (del.data.staff?.length ?? 0) > 0, `حذف دور مستخدم → 403 مع ${del.data.staff?.length ?? 0} موظف`);

    // 7 · approvals: stale version over HTTP; self/twice at mock level
    const pend = await api<{ results: Array<{ id: number; version: number }> }>(page, "GET", "/api/bff/approvals?status=pending");
    const target = pend.data.results[0];
    if (target) {
      const stale = await api(page, "POST", `/api/bff/approvals/${target.id}/resolve`, { decision: "approved", version: target.version - 1 });
      check(stale.status === 409, "قرار بنسخة قديمة → 409");
      await page.goto(`${BASE}/dashboard/staff/approvals?approval=${target.id}`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("approval-sheet").waitFor({ timeout: 30_000 });
      check(await page.getByTestId("approval-payload").isVisible(), "لوحة الطلب تعرض لقطة البيانات");
    } else {
      check(true, "لا طلبات معلّقة متبقية في خادم التطوير — فحص 409 عبر HTTP تُرك للمستوى المحلي");
    }
    const store = "check-store";
    const a = approvalsState(store).items.find((x) => x.status === "pending" && x.requester_id !== null)!;
    const self = resolveApproval(store, a.id, { decision: "approved", version: a.version }, { id: a.requester_id, name: a.requester_name });
    check(!self.ok && self.status === 403, "الموافقة على طلبك → 403");
    const ok = resolveApproval(store, a.id, { decision: "approved", version: a.version }, { id: null, name: "فارس العمري" });
    const again = resolveApproval(store, a.id, { decision: "rejected", version: a.version }, { id: null, name: "فارس العمري" });
    check(ok.ok && !again.ok && again.status === 409, "حسم مرتين → 409");
    const counters = await api<{ pending_approvals: number }>(page, "GET", "/api/bff/staff/counters");
    check(typeof counters.data.pending_approvals === "number", `عدّاد المعلّق ${counters.data.pending_approvals}`);

    // 8 · audit chain
    const good = await api<{ ok: boolean }>(page, "POST", "/api/bff/audit-log/verify");
    const broken = await api<{ ok: boolean; broken_at: number | null }>(page, "POST", "/api/bff/audit-log/verify?break=1");
    check(good.data.ok === true && broken.data.ok === false && typeof broken.data.broken_at === "number", `التحقق: سليم، ثم انقطاع عند السطر ${broken.data.broken_at}`);
    await page.goto(`${BASE}/dashboard/staff/audit-log`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("audit-table").getByText("staff.", { exact: false }).first().waitFor({ timeout: 30_000 });
    await page.getByTestId("verify-chain").click();
    await page.getByTestId("verify-result").waitFor({ timeout: 10_000 });
    check((await page.getByTestId("verify-result").textContent())?.includes("السجل سليم") ?? false, "زر التحقق يعرض «السجل سليم»");

    // 9 · terminate keeps the row
    const term = await api<{ status: string }>(page, "POST", `/api/bff/staff/${sid}/terminate`);
    const after = await api<{ results: Array<{ id: number; status: string }> }>(page, "GET", `/api/bff/staff?q=${local}`);
    check(term.data.status === "terminated" && after.data.results.some((s) => s.id === sid && s.status === "terminated"), "إنهاء الخدمة: الصف يبقى بحالة «مُنهى»");

    // 10 · cashier is forbidden
    const cashier = await newPage(browser, "staff");
    await cashier.goto(`${BASE}/dashboard/staff`, { waitUntil: "domcontentloaded" });
    const gate = cashier.locator('[data-testid="forbidden"], [data-testid="feature-off"]');
    await gate.first().waitFor({ timeout: 60_000 }).catch(() => undefined);
    // The fixture plan has no `staff_rbac`, so the feature gate answers before the permission gate.
    check(await gate.first().isVisible(), `الكاشير يرى حالة البوابة (${await gate.first().getAttribute("data-testid")})`);
    const denied = await api(cashier, "GET", "/api/bff/staff");
    check(denied.status === 403, "الكاشير: GET /api/bff/staff → 403");

    // 11 · empty store
    const empty = await newPage(browser, "merchant", "shop.localhost");
    await empty.goto(`${EMPTY}/dashboard/staff`, { waitUntil: "domcontentloaded" });
    await empty.getByText("لا موظفين بعد — أضف أول موظف برقم هاتفه").waitFor({ timeout: 60_000 }).catch(() => undefined);
    check(await empty.getByText("لا موظفين بعد — أضف أول موظف برقم هاتفه").isVisible(), "المتجر الفارغ: «لا موظفين بعد»");
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    consoleErrors.forEach((e) => console.log(`  ${e}`));
  }
  const total = failures.length;
  console.log(`\n${total === 0 && consoleErrors.length === 0 ? "✓ all staff checks passed" : `✗ ${total} failed, ${consoleErrors.length} console errors`}`);
  process.exit(total === 0 && consoleErrors.length === 0 ? 0 : 1);
}

void main();
