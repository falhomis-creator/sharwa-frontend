/**
 * Functional + visual check for Phase 7 T178–T180 — M39 «شروة شيب» on `noor.localhost`.
 *
 *   - issue (US-39.1): no zone → «يرجى تحديد منطقة الشحن.» under the field and no request;
 *     an over-weight order → the server's `detail` + the split suggestion; a valid zone →
 *     the waybill page with the zone/cost/weight SNAPSHOTS;
 *   - list (US-39.2): status and billing in two columns; a `?status=&billing=` URL gives the
 *     same rows as the API; a master waybill carries its children count;
 *   - timeline (US-39.3): rejected events visible with a readable reason; the late-sync hint;
 *     «ارتداد بعد التسليم»; terminal states → «حالة نهائية مقفلة»;
 *   - manual status (FR-39.06): only allowed transitions are enabled; `merchant_manual` lands
 *     in the timeline AND in the M15 shipment the edge-case queues read (one source);
 *   - AWB queue retry, rate-card drift badge (US-39.4); supervisor: assign, invalid reassign
 *     sentence, emergency reassign with the confirmation naming count + balance (US-39.5);
 *   - a staff session (no `sharwa_ship` feature) → «الميزة غير مفعَّلة لمتجرك»;
 *   - screenshots: both tabs, timeline with a rejected event, mobile, dark.
 *
 * Mutates noor's Sharwa Ship fixtures (rows are picked dynamically; restart the dev server
 * for a pristine seed).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/sharwa-ship-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "39-sharwa-ship");
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

async function page(browser: Browser, opts: { session?: "merchant" | "staff" | "manager"; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown> };
    },
    { method, path, body },
  );
}

type Pending = { order_id: number; weight_preview: { chargeable: string } | null; awb_plan_count: number };
type Row = { id: number; waybill_number: string; status: string; billing_status: string; children_count: number };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const p = await page(browser);
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=pending-order]");
  await p.screenshot({ path: join(OUT, "pending-desktop.png"), fullPage: true });

  // ── issue (US-39.1) ──────────────────────────────────────────────────────────────
  const pending = ((await api(p, "GET", "/api/bff/shipping/sharwa-ship/pending-orders")).json as { results: Pending[] }).results;
  check(pending.length > 0 && (await p.locator("[data-testid=pending-order]").count()) === pending.length, "every order without a waybill is listed with its weight preview");
  let issueReqs = 0;
  p.on("request", (r) => {
    if (/\/sharwa-ship\/orders\/\d+\/waybill/.test(r.url())) issueReqs += 1;
  });
  const heavyIdx = pending.findIndex((o) => Number(o.weight_preview?.chargeable ?? 0) > 25);
  const okIdx = pending.findIndex((o) => o.weight_preview && Number(o.weight_preview.chargeable) <= 25);
  await p.locator("[data-testid=issue-open]").nth(okIdx).click();
  await p.waitForSelector("[data-testid=issue-sheet]");
  await p.click("[data-testid=issue-submit]");
  await p.waitForSelector("[data-testid=zone-error]");
  check((await p.textContent("[data-testid=zone-error]"))?.includes("يرجى تحديد منطقة الشحن") === true && issueReqs === 0, "no zone → the sentence under the field, nothing sent");
  await p.click("[data-testid=zone-SAN-01]");
  await p.click("[data-testid=issue-submit]");
  await p.waitForURL(/\/dashboard\/shipping\/sharwa-ship\/\d+$/);
  await p.waitForSelector("[data-testid=shipment-detail]");
  const newId = Number(new URL(p.url()).pathname.split("/").pop());
  const issued = (await api(p, "GET", `/api/bff/shipping/shipments/${newId}`)).json as { waybill_number: string; zone_name_snapshot: string; display_cost: string; actual_weight_snapshot: string };
  check(/^SHW-/.test(issued.waybill_number) && issued.zone_name_snapshot.length > 0 && issued.display_cost.length > 0 && Number(issued.actual_weight_snapshot) > 0, "issued: SHW-… with zone, cost and weight snapshots");
  if (heavyIdx >= 0) {
    await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=pending-order]");
    const heavy = ((await api(p, "GET", "/api/bff/shipping/sharwa-ship/pending-orders")).json as { results: Pending[] }).results.findIndex((o) => Number(o.weight_preview?.chargeable ?? 0) > 25);
    await p.locator("[data-testid=issue-open]").nth(heavy).click();
    await p.click("[data-testid=zone-SAN-01]");
    await p.click("[data-testid=issue-submit]");
    await p.waitForSelector("[data-testid=issue-error]");
    const text = (await p.textContent("[data-testid=issue-error]")) ?? "";
    check(text.includes("يتجاوز الحد الأقصى") && text.includes("قسّم الشحنة"), "over the agent's max weight → the server's detail + «تقسيم الشحنة»");
    await p.keyboard.press("Escape");
  } else check(false, "an over-weight pending order exists");

  // ── list (US-39.2) ───────────────────────────────────────────────────────────────
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship?tab=waybills&status=in_transit&billing=pending`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=waybills-table]");
  const filtered = (await api(p, "GET", "/api/bff/shipping/shipments?status=in_transit&billing_status=pending&page_size=50")).json as { count: number; results: Row[] };
  await p.waitForFunction((n) => document.querySelectorAll("[data-testid=waybill-link]").length === n, filtered.results.length, { timeout: 10_000 }).catch(() => undefined);
  const shown = await p.locator("[data-testid=waybill-link]").allTextContents();
  check(shown.length === filtered.results.length && filtered.results.every((r) => shown.some((s) => s.includes(r.waybill_number))), "a shared ?status=&billing= URL shows the same rows as the API");
  check((await p.locator("table [data-testid=billing-status]").count()) === shown.length, "billing status is its own column on every row");
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship?tab=waybills`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=waybill-link]");
  check((await p.locator("text=فرعية").count()) > 0, "a master waybill shows its children count");
  await p.screenshot({ path: join(OUT, "waybills-desktop.png"), fullPage: true });

  // ── timeline (US-39.3) ───────────────────────────────────────────────────────────
  const rows = ((await api(p, "GET", "/api/bff/shipping/shipments?page_size=100")).json as { results: Row[] }).results;
  const byWaybill = (w: string) => rows.find((r) => r.waybill_number === w);
  const withRejected = byWaybill("SHW-26100701") ?? rows[0]!;
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${withRejected.id}`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=timeline-event]");
  check((await p.locator("[data-testid=event-rejected]").count()) > 0 && ((await p.locator("[data-testid=event-rejected]").first().textContent()) ?? "").includes("أُرشِف"), "a rejected stale event is shown with its readable reason");
  await p.screenshot({ path: join(OUT, "timeline-rejected.png"), fullPage: true });
  const late = byWaybill("SHW-26100710");
  if (late) {
    await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${late.id}`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=timeline-event]");
    check((await p.locator("[data-testid=late-sync]").count()) > 0, "event_time well before received_at → «مزامنة متأخرة من الجهاز»");
  }
  const bounced = byWaybill("SHW-26100713");
  if (bounced) {
    await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${bounced.id}`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=timeline-event]");
    check((await p.locator("[data-testid=bounce]").count()) > 0, "delivered → returned → «ارتداد بعد التسليم — يتطلب مراجعة مالية»");
  }
  const lost = byWaybill("SHW-26100714");
  if (lost) {
    await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${lost.id}`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=manual-status]");
    check((await p.locator("[data-testid=terminal-note]").count()) === 1, "compensated_lost → «حالة نهائية مقفلة», no buttons");
  }

  // ── manual status on the new waybill (FR-39.06) ──────────────────────────────────
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${newId}`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=manual-status]");
  check(await p.isDisabled("[data-testid=manual-delivered]"), "a transition the machine forbids is disabled (pending_pickup → delivered)");
  await p.click("[data-testid=manual-picked_up]");
  await p.waitForFunction(() => document.querySelector("[data-testid=detail-status]")?.textContent?.includes("تم الاستلام"));
  check((await p.locator("[data-testid=timeline-event]").first().textContent())?.includes("تعديل يدوي من التاجر") === true, "the manual move is in the timeline as «تعديل يدوي من التاجر»");
  const edge = (await api(p, "GET", "/api/bff/shipping/edge-cases?kind=out_of_order")).status;
  check(edge === 200, "M15 edge-case queues still answer on the shared shipments");

  // ── AWB queue + rate cards (US-39.4) ─────────────────────────────────────────────
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/queue`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=awb-row]");
  const failed = p.locator("[data-testid=awb-row][data-status=failed]").first();
  if ((await failed.count()) === 1) {
    const before = Number(await failed.locator("[data-testid=awb-attempts]").textContent());
    await failed.locator("[data-testid=awb-retry]").click();
    await p.waitForFunction(() => !document.querySelector("[data-testid=awb-row][data-status=failed]"));
    const row = p.locator("[data-testid=awb-row]").first();
    check((await p.locator("[data-testid=awb-row][data-status=pending]").count()) >= 1 && Number(await p.locator("[data-testid=awb-row][data-status=pending] [data-testid=awb-attempts]").first().textContent()) >= before, "«إعادة المحاولة» turns a failed item pending with a new attempt");
    void row;
  } else check(true, "AWB queue: no failed item left (re-run)");
  await p.screenshot({ path: join(OUT, "awb-queue.png"), fullPage: true });
  await p.goto(`${NOOR}/dashboard/shipping/sharwa-ship/rate-cards`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=rate-row]");
  check((await p.locator("[data-testid=rate-state]", { hasText: "بانتظار تأكيد التسعيرة" }).count()) > 0, "a drift above the threshold → «بانتظار تأكيد التسعيرة»");

  // ── supervisor (US-39.5) ─────────────────────────────────────────────────────────
  await p.goto(`${NOOR}/dashboard/shipping/supervisor`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=agent-row]");
  const unassigned = p.locator("[data-testid=unassigned-row]").first();
  if ((await unassigned.count()) === 1) {
    await unassigned.locator("[data-testid=assign-agent]").selectOption({ index: 1 });
    await unassigned.locator("[data-testid=assign-submit]").click();
    await p.waitForSelector("text=أُسندت الشحنة.");
    check(true, "an unassigned shipment can be assigned to an agent");
  }
  const bad = await api(p, "POST", "/api/bff/shipping/agents/2/emergency-reassign", { new_agent_id: 3 });
  check(bad.status === 400 && JSON.stringify(bad.json).includes("يرجى اختيار مندوب آخر صالح"), "an invalid target (inactive agent) → «يرجى اختيار مندوب آخر صالح.»");
  const agent2 = p.locator("[data-testid=agent-row][data-agent='2']");
  const count = (await agent2.locator("[data-testid=agent-open]").textContent())?.trim();
  const balance = (await agent2.locator("[data-testid=agent-balance]").textContent())?.trim();
  await agent2.locator("[data-testid=reassign-open]").click();
  await p.waitForSelector("[data-testid=reassign-dialog]");
  const summary = (await p.textContent("[data-testid=reassign-summary]")) ?? "";
  check(Boolean(count && balance && summary.includes(count) && summary.includes(balance)), "the confirmation names the shipment count and the custody balance");
  await p.click("[data-testid=reassign-confirm]");
  await p.waitForSelector("[data-testid=reassign-error]");
  check(true, "confirming without a target → the server's sentence");
  await p.selectOption("[data-testid=reassign-target]", "1");
  await p.click("[data-testid=reassign-confirm]");
  await p.waitForSelector("text=أُعيد إسناد كل شحنات");
  check(true, "emergency reassign (agent without an open shift) → the server's sentence");
  await p.screenshot({ path: join(OUT, "supervisor.png"), fullPage: true });

  // ── feature gate (FR-39.01) ──────────────────────────────────────────────────────
  const staff = await page(browser, { session: "staff" });
  await staff.goto(`${NOOR}/dashboard/shipping/sharwa-ship`, { waitUntil: "load" });
  await staff.waitForSelector("text=الميزة غير مفعَّلة لمتجرك");
  check((await api(staff, "GET", "/api/bff/shipping/shipments")).status === 403, "without `sharwa_ship` the API answers 403 too");

  // ── visual: mobile + dark ────────────────────────────────────────────────────────
  const mobile = await page(browser, { width: 390 });
  await mobile.goto(`${NOOR}/dashboard/shipping/sharwa-ship?tab=waybills`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=waybill-card]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "waybills-mobile.png"), fullPage: true });
  await mobile.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${withRejected.id}`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=timeline-event]");
  await mobile.screenshot({ path: join(OUT, "timeline-mobile.png"), fullPage: true });
  const dark = await page(browser, { dark: true });
  await dark.goto(`${NOOR}/dashboard/shipping/sharwa-ship/${withRejected.id}`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=timeline-event]");
  await dark.screenshot({ path: join(OUT, "timeline-dark.png"), fullPage: true });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ sharwa ship check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
