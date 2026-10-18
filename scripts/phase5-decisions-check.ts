/**
 * Functional check for the Phase 5 owner decisions (2026-10-19) — execution_log.md
 * «Phase 5 decisions»:
 *   1. owner-only screens are HIDDEN for staff in the sidebar and ⌘K, and the BFF says 403;
 *   2. the «مدير المتجر» fixture (`manager`) logs in and sees forbidden / owner-only, not feature-off;
 *   3. `www.` (and other labels) are accepted on the merchant's own domain;
 *   4. reports: `reports.view` + category keys (manager opens sales, not profit);
 *   5. one editing surface for the payment toggles (settings → read-only summary + link);
 *   6. checkout + M06 form options read the M15 delivery methods and pickup points;
 *   7. the passthrough registry is covered by its own unit note (no browser surface).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/phase5-decisions-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
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

type Session = "merchant" | "staff" | "manager";

async function newPage(browser: Browser, session: Session | null): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  if (session) await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|403|404|409)/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return page;
}

async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, {
        method,
        headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
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

const sidebarHrefs = (page: Page) =>
  page.locator("nav[aria-label='أقسام اللوحة'] a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));

const OWNER_ONLY_PATHS = ["/dashboard/payments", "/dashboard/design", "/dashboard/settings/domains", "/dashboard/settings/webhooks", "/dashboard/locations", "/dashboard/marketing/campaigns", "/dashboard/wallet"];

async function openAllGroups(page: Page) {
  // Expand every collapsed group so nested links are in the DOM.
  const toggles = page.locator("nav[aria-label='أقسام اللوحة'] button[aria-expanded=false]");
  for (let i = (await toggles.count()) - 1; i >= 0; i--) await toggles.nth(i).click().catch(() => undefined);
}

async function main() {
  const browser = await launch();

  // ── 1 + 2: sidebar for the owner, the manager and the cashier ─────────────────────
  const owner = await newPage(browser, "merchant");
  await owner.goto(`${NOOR}/dashboard`, { waitUntil: "networkidle" });
  await openAllGroups(owner);
  const ownerLinks = await sidebarHrefs(owner);
  check(OWNER_ONLY_PATHS.every((p) => ownerLinks.some((h) => h.split("?")[0] === p)), "owner: every owner-only destination is in the sidebar");

  const manager = await newPage(browser, "manager");
  await manager.goto(`${NOOR}/dashboard`, { waitUntil: "networkidle" });
  const me = await api(manager, "GET", "/api/bff/dashboard/me");
  const staff = (me.json.staff ?? {}) as { roles?: string[]; full_name?: string };
  check(me.status === 200 && me.json.kind === "staff" && staff.roles?.includes("مدير المتجر") === true, `manager fixture resolves to a staff session «${staff.full_name}» / مدير المتجر`);
  check(Array.isArray(me.json.features) && (me.json.features as string[]).length === 39, "manager carries the store's full plan (features are store-wide)");
  await openAllGroups(manager);
  const managerLinks = await sidebarHrefs(manager);
  check(OWNER_ONLY_PATHS.every((p) => !managerLinks.some((h) => h.split("?")[0] === p)), "manager: owner-only destinations are hidden (not disabled)");
  check(managerLinks.includes("/dashboard/staff") && managerLinks.includes("/dashboard/reports") && managerLinks.includes("/dashboard/inventory"), "manager: staff, reports and inventory are reachable");
  const pay403 = await api(manager, "GET", "/api/bff/payments/gateways");
  check(pay403.status === 403, `manager: the BFF still answers 403 on payments (${pay403.status})`);

  // ⌘K: no owner-only page, no «إعداد: شروة باي» for staff.
  await manager.keyboard.press("Control+k");
  await manager.waitForSelector("[role=dialog] input");
  await manager.keyboard.type("شروة باي");
  await manager.waitForTimeout(400);
  const paletteText = (await manager.locator("[role=dialog]").innerText()).replace(/\s+/g, " ");
  check(!paletteText.includes("إعداد: شروة باي") && !paletteText.includes("ربط بوابات الدفع"), "manager: ⌘K lists neither the payments page nor its settings fields");
  await manager.keyboard.press("Escape");

  // ── 4: reports — sales yes, profit no ────────────────────────────────────────────
  const sales = await api(manager, "GET", "/api/bff/reports/sales_overview?from=2026-10-01&to=2026-10-17");
  const profit = await api(manager, "GET", "/api/bff/reports/store_overview?from=2026-10-01&to=2026-10-17");
  check(sales.status === 200 && profit.status === 403, `manager: sales report 200, profit report 403 (${sales.status}/${profit.status})`);

  const cashier = await newPage(browser, "staff");
  await cashier.goto(`${NOOR}/dashboard`, { waitUntil: "networkidle" });
  await openAllGroups(cashier);
  const cashierLinks = await sidebarHrefs(cashier);
  check(OWNER_ONLY_PATHS.every((p) => !cashierLinks.some((h) => h.split("?")[0] === p)), "cashier: owner-only destinations are hidden");

  // Manager login through the real form path (phone of staff #4).
  const login = await newPage(browser, null);
  await login.goto(`${NOOR}/dashboard/staff/login`, { waitUntil: "domcontentloaded" });
  const res = await api(login, "POST", "/api/bff/auth/staff/login", { phone: "967770000004", password: "sharwa-local-demo" });
  const cookies = await login.context().cookies();
  check(res.status === 204 && cookies.some((c) => c.name === "sharwa_mock_session" && c.value === "manager"), "staff login with the manager phone sets the `manager` session");

  // ── 3: www. on the merchant's own domain ──────────────────────────────────────────
  const www = await api(owner, "POST", "/api/bff/domains", { domain: `www.decisions-${Date.now() % 100000}.com` });
  const rec = ((www.json.dns_records ?? []) as Array<{ type: string; name: string }>)[0];
  check(www.status === 201 && rec?.type === "CNAME" && rec.name === "www", `www.<domain> is accepted and gets a CNAME (${www.status} ${rec?.type ?? ""})`);
  const apiLabel = await api(owner, "POST", "/api/bff/domains", { domain: `shop.decisions-${Date.now() % 100000}.net` });
  check(apiLabel.status === 201, "any other subdomain of the merchant's own domain is accepted");
  for (const r of [www, apiLabel]) if (r.status === 201) await api(owner, "DELETE", `/api/bff/domains/${String(r.json.id)}`);
  const platform = await api(owner, "POST", "/api/bff/domains", { domain: "www.noor.localhost" });
  check(platform.status === 400, "the platform namespace stays refused");

  // ── 5: one editing surface for payment toggles ──────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/settings/payments`, { waitUntil: "networkidle" });
  check((await owner.locator("[data-testid=settings-payments] [role=switch]").count()) === 0, "settings → الدفع has no switches (read-only summary)");
  check((await owner.locator("[data-testid=manage-payments]").getAttribute("href")) === "/dashboard/payments", "settings → الدفع links to /dashboard/payments");
  const state = (await owner.locator("[data-testid=payments-state-enable_sharwa_pay]").innerText()).trim();
  check(state === "مفعّل" || state === "متوقف", `the summary reads the live state («${state}»)`);

  // ── 6: checkout + M06 options read the M15 methods ───────────────────────────────
  const name = `توصيل تجريبي ${Date.now() % 10000}`;
  const created = await api(owner, "POST", "/api/bff/shipping/delivery-methods", { name, price: "3000.00", estimated_time: "2-3 أيام", is_active: true });
  check(created.status === 201, `M15: a new delivery method is created (${created.status})`);
  const methodId = Number(created.json.id);
  const opts = await api(owner, "GET", "/api/bff/orders/form-options");
  check(((opts.json.delivery_methods ?? []) as Array<{ id: number }>).some((m) => m.id === methodId), "M06 manual-order options list the new M15 method");

  const shopper = await newPage(browser, null);
  await shopper.goto(`${NOOR}/`, { waitUntil: "domcontentloaded" });
  const add = await api(shopper, "POST", "/api/v1/cart/actions/", { product_id: 1053, action_type: "add" });
  check(add.status < 400, `storefront: cart add (${add.status})`);
  const d1 = await api(shopper, "GET", "/api/bff/checkout/delivery-options");
  const ids1 = ((d1.json.delivery_methods ?? []) as Array<{ id: number; name: string }>).map((m) => m.id);
  check(ids1.includes(methodId), "checkout offers the method added in M15");
  check(!ids1.includes(3), "checkout hides the seeded inactive method (#3)");
  await api(owner, "PATCH", `/api/bff/shipping/delivery-methods/${methodId}`, { is_active: false });
  const d2 = await api(shopper, "GET", "/api/bff/checkout/delivery-options");
  check(!((d2.json.delivery_methods ?? []) as Array<{ id: number }>).some((m) => m.id === methodId), "disabling it in M15 removes it from checkout at once");
  const pickups = (d2.json.pickup_locations ?? []) as Array<{ id: number; phone: string }>;
  check(pickups.length > 0 && pickups.every((p) => p.id !== 3) && pickups.every((p) => /^\d+$/.test(p.phone)), "checkout pickups are M15's active points with their own phone");
  await api(owner, "DELETE", `/api/bff/shipping/delivery-methods/${methodId}`);

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ phase 5 decisions check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
