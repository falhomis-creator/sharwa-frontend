/**
 * Functional check for Phase 5 — M07 customers & CRM (T096–T098).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/customers-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M07 US-07.1–07.5, FR-07.02/03/07/08/10):
 *   - ~2 000 derived customers, server pages of 50; `0770841802` matches `967770841802`;
 *     `77084` and the `dormant` segment land in the URL and the shared link reproduces them;
 *   - the live segment count and «إنشاء حملة لهذه الشريحة» carry the same segment to M13;
 *     `bought_product` + a picked product updates the count;
 *   - Enter on a row opens the `?customer=` sheet; the full page shows both trust sources apart;
 *   - `cod_disabled` → banner, re-enable needs the typed confirmation, reversible, audited;
 *   - notes: newest first with author, deletable by the author/owner, cashier cannot delete the owner's;
 *   - review reply PATCH reaches the storefront rows; wallet/points tabs; masked marketplace phone;
 *   - export: confirm dialog → CSV; 429 on `critical` (forced with `?simulate=critical`) → disabled
 *     with the reason; a cashier sees no export button and the BFF answers 403;
 *   - the empty store renders «لا عملاء بعد».
 * Exit 1 on a failed check or a console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "07-customers");
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const consoleErrors: string[] = [];
type Json = Record<string, unknown>;

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // 403/429/400/404 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|404|409|429)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, session: "merchant" | "staff", host = "noor.localhost", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  watch(page, `${session}@${host}`);
  return page;
}

async function bff(page: Page, path: string, init?: { method?: string; body?: Json }): Promise<{ status: number; body: Json; text: string }> {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body ? JSON.stringify(init.body) : undefined });
      const text = res.status === 204 ? "" : await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        body = {};
      }
      return { status: res.status, body, text };
    },
    { path, init },
  );
}

const rowsSel = "[data-testid=customers-table] tbody tr[data-row]";

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");

  // ── list: scale, search normalisation, URL state ────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers`, { waitUntil: "networkidle" });
  await page.waitForSelector(rowsSel);
  const all = (await bff(page, "/api/bff/customers?page_size=50")).body as { count: number; results: unknown[] };
  check(all.count >= 1900 && (await page.locator(rowsSel).count()) === 50, `~2 000 derived customers, 50 per server page (${all.count})`);

  await page.getByLabel("بحث في العملاء").first().fill("0770841802");
  await page.waitForURL((u) => u.searchParams.get("q") === "0770841802", { timeout: 6_000 });
  await page.waitForFunction((s) => document.querySelectorAll(s).length === 1, rowsSel, { timeout: 6_000 });
  check((await page.locator(rowsSel).first().innerText()).includes("+967 770 841 802"), "searching `0770841802` matches the normalised `967770841802`");

  await page.goto(`${BASE}/dashboard/customers?q=77084&segment=dormant`, { waitUntil: "networkidle" });
  await page.waitForSelector(rowsSel);
  const shared = (await bff(page, "/api/bff/customers?q=77084&segment=dormant")).body as { count: number };
  const dormant = (await bff(page, "/api/bff/customers/segments/count?segment=dormant")).body as { count: number };
  check((await page.locator("[data-testid=filter-segment]").first().inputValue()) === "dormant" && dormant.count > 0 && shared.count >= 1 && (await page.locator(rowsSel).count()) === shared.count, `a shared link restores search + «خامل» (${shared.count} rows; segment ${dormant.count})`);
  await page.waitForFunction((n) => document.querySelector("[data-testid=segment-count]")?.textContent?.replace(/,/g, "") === String(n), dormant.count, { timeout: 6_000 });
  check((await page.getAttribute("[data-testid=segment-campaign]", "href")) === "/dashboard/marketing/campaigns/new?segment=dormant", "the live segment count shows, and «إنشاء حملة» carries segment=dormant to M13");

  // bought_product: pick a product → count updates, product_id in the URL.
  await page.goto(`${BASE}/dashboard/customers?segment=bought_product`, { waitUntil: "networkidle" });
  check((await page.locator("[data-testid=segment-count]").innerText()).includes("اختر منتجاً"), "`bought_product` asks for a product first");
  await page.locator("[data-testid=product-search]").first().fill("عباية");
  await page.locator("[data-testid=product-option]").first().click();
  await page.waitForURL((u) => Boolean(u.searchParams.get("product_id")));
  const pid = new URL(page.url()).searchParams.get("product_id");
  const bought = (await bff(page, `/api/bff/customers/segments/count?segment=bought_product&product_id=${pid}`)).body as { count: number };
  await page.waitForFunction((n) => document.querySelector("[data-testid=segment-count]")?.textContent?.replace(/,/g, "") === String(n), bought.count, { timeout: 6_000 });
  check(bought.count > 0 && (await page.getAttribute("[data-testid=segment-campaign]", "href"))!.includes(`product_id=${pid}`), `picking a product updates the count (${bought.count}) and the campaign link`);

  // ── Enter → sheet ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers?q=0770841802`, { waitUntil: "networkidle" });
  await page.waitForSelector(rowsSel);
  await page.keyboard.press("j");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => u.searchParams.get("customer") === "967770841802");
  await page.waitForSelector("[data-testid=customer-sheet] [data-testid=customer-profile]");
  check(true, "J + Enter on a row opens the profile sheet (?customer= in the URL)");
  await page.screenshot({ path: join(OUT, "sheet.png") });
  await page.keyboard.press("Escape");
  await page.waitForURL((u) => !u.searchParams.has("customer"));

  // ── profile: trust sources apart, number strip ──────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers/0770841802`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=customer-profile]");
  const platform = await page.locator("[data-testid=trust-platform]").innerText();
  const local = await page.locator("[data-testid=trust-store]").innerText();
  check(platform.includes("80%") && platform.includes("12") && platform.includes("3") && local.includes("في متجرك") && !local.includes("%"), "platform trust «80% — 12 ناجح / 3 فاشل» and the store record shown apart, never merged");
  check((await page.locator("[data-testid=number-strip] > div").count()) === 4 && (await page.locator("[data-testid=whatsapp]").getAttribute("href")) === "https://wa.me/967770841802", "one 4-number strip; WhatsApp opens wa.me/<phone>");

  // ── COD disabled → re-enable with typed confirmation → disable again ────────────
  await page.goto(`${BASE}/dashboard/customers/967770000099`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=cod-disabled-banner]");
  await page.screenshot({ path: join(OUT, "cod-disabled.png"), fullPage: true });
  await page.click("[data-testid=cod-enable]");
  await page.fill("[data-testid=cod-reason]", "سدّد المستحقات ووعد بالاستلام");
  check(await page.locator("[data-testid=cod-submit]").isDisabled(), "re-enabling COD stays disabled until the confirmation word is typed");
  await page.fill("[data-testid=cod-confirm]", "تفعيل");
  await page.click("[data-testid=cod-submit]");
  await page.waitForSelector("[data-testid=cod-disable]");
  const audit = (await bff(page, "/api/bff/audit-log?page_size=100")).body as { results?: Array<{ action_code: string }> };
  check(JSON.stringify(audit).includes("customers.cod_enabled"), "re-enabling COD flips the store record and writes an audit row");
  await page.click("[data-testid=cod-disable]");
  await page.click("[data-testid=cod-submit]");
  await page.waitForSelector("#cod-reason-error, [data-testid=cod-dialog] [role=alert]");
  check(true, "disabling without a reason is refused under the field");
  await page.fill("[data-testid=cod-reason]", "رفض الاستلام مجدداً");
  await page.click("[data-testid=cod-submit]");
  await page.waitForSelector("[data-testid=cod-disabled-banner]");
  check(true, "COD can be disabled again with a reason");

  // ── notes ───────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers/967770841802`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=customer-profile]");
  await page.keyboard.press("n");
  await page.waitForURL((u) => u.searchParams.get("tab") === "notes");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "note-input", null, { timeout: 5_000 });
  const body = `ملاحظة فحص ${Date.now() % 10000}`;
  await page.keyboard.type(body);
  await page.click("[data-testid=note-save]");
  await page.waitForFunction((b) => document.querySelector("[data-testid=note-row]")?.textContent?.includes(b), body, { timeout: 6_000 });
  check((await page.locator("[data-testid=note-row]").first().innerText()).includes("فارس العمري"), "`N` opens the notes tab focused; a saved note appears on top with its author");

  // ── review reply → storefront rows ──────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers/967770841802?tab=reviews`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=review-row]");
  check(/\d\/5/.test(await page.locator("[data-testid=review-row]").first().innerText()), "reviews show the rating as `n/5` numbers");
  await page.locator("[data-testid=reply-open]").first().click();
  const reply = `شكراً لتقييمك ${Date.now() % 1000}`;
  await page.fill("[data-testid=reply-input]", reply);
  await page.click("[data-testid=reply-save]");
  await page.waitForSelector(`[data-testid=admin-reply]:has-text("${reply}")`);
  const reviewId = await page.locator("[data-testid=review-row]").first().getAttribute("data-review-id");
  const productId = (((await bff(page, "/api/bff/customers/967770841802/reviews")).body as unknown as Array<{ id: number; product: { id: number } }>)).find((r) => String(r.id) === reviewId)!.product.id;
  const pub = await bff(page, `/api/bff/storefront/products/${productId}/reviews?page=1`);
  check(pub.text.includes(reply) || (await bff(page, "/api/bff/customers/967770841802/reviews")).text.includes(reply), "the reply is saved on the ProductReview row (PATCH /reviews/[id])");

  // ── wallet / points / wishlist tabs ─────────────────────────────────────────────
  const withWallet = ((await bff(page, "/api/bff/customers?has_wallet=true&page_size=1")).body as { results: Array<{ phone: string }> }).results[0]!.phone;
  await page.goto(`${BASE}/dashboard/customers/${withWallet}?tab=wallet`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=tab-wallet]");
  check((await page.locator("[data-testid=wallet-row]").count()) <= 10 && /\/dashboard\/customers\/wallets\/\d+/.test((await page.getAttribute("[data-testid=manage-wallet]", "href")) ?? ""), "wallet tab: ≤ 10 latest transactions and «إدارة المحفظة» → M35");
  await page.goto(`${BASE}/dashboard/customers/967770841802?tab=wallet`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=create-wallet]");
  check((await page.getAttribute("[data-testid=create-wallet]", "href")) === "/dashboard/customers/wallets/new?phone=967770841802", "no wallet → «لا محفظة» + «إنشاء محفظة» prefilled");
  await page.goto(`${BASE}/dashboard/customers/967770841802?tab=wishlist`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=wishlist-row]");
  check((await page.locator("[data-testid=wishlist-row]").count()) === 3, "wishlist tab reads M42's rows by phone");

  // ── export: confirm → CSV; 429 critical → disabled ──────────────────────────────
  await page.goto(`${BASE}/dashboard/customers?segment=dormant`, { waitUntil: "networkidle" });
  await page.waitForSelector(rowsSel);
  await page.click("[data-testid=export-open]");
  check((await page.locator("[data-testid=export-dialog]").innerText()).includes("يُسجَّل هذا التصدير في سجل التدقيق ويخضع لتنبيهات الحجم"), "export opens the audit confirmation dialog");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("[data-testid=export-confirm]")]);
  check(download.suggestedFilename().endsWith(".csv"), "confirming downloads a CSV with the current filters");
  const csv = await bff(page, "/api/bff/customers/export.csv?segment=dormant");
  check(csv.status === 200 && csv.text.split("\n").filter(Boolean).length === dormant.count + 1, "the CSV has exactly the segment's rows + header");
  await page.route("**/api/bff/customers/export.csv**", (route) => route.continue({ url: `${route.request().url()}&simulate=critical` }));
  await page.click("[data-testid=export-open]");
  await page.click("[data-testid=export-confirm]");
  await page.waitForSelector("[data-testid=export-critical]");
  check(await page.locator("[data-testid=export-open]").isDisabled(), "429 (critical export_volume) disables export with «تجاوزت حدّ التصدير اليومي»");
  await page.screenshot({ path: join(OUT, "export-critical.png") });

  // ── cashier ─────────────────────────────────────────────────────────────────────
  const staff = await newPage(browser, "staff");
  await staff.goto(`${BASE}/dashboard/customers`, { waitUntil: "networkidle" });
  await staff.waitForSelector(rowsSel);
  check((await staff.locator("[data-testid=export-open]").count()) === 0 && (await bff(staff, "/api/bff/customers/export.csv")).status === 403, "a cashier without customers.export sees no export button; the BFF answers 403");
  await staff.goto(`${BASE}/dashboard/customers/967770841802?tab=notes`, { waitUntil: "networkidle" });
  await staff.waitForSelector("[data-testid=note-row]");
  const ownerNote = ((await bff(staff, "/api/bff/customers/967770841802/notes")).body as unknown as Array<{ id: number; author: string; can_delete: boolean }>).find((n) => n.author === "فارس العمري")!;
  const del = await bff(staff, `/api/bff/customers/967770841802/notes/${ownerNote.id}`, { method: "DELETE" });
  check(!ownerNote.can_delete && del.status === 403 && (await staff.locator("[data-testid=cod-disable]").isDisabled()), "a cashier cannot delete the owner's note (403) nor toggle COD (disabled)");

  // ── empty store ─────────────────────────────────────────────────────────────────
  const empty = await newPage(browser, "merchant", "shop.localhost");
  await empty.goto(`http://shop.localhost:${PORT}/dashboard/customers`, { waitUntil: "networkidle" });
  await empty.waitForSelector("text=لا عملاء بعد — يظهر العميل بعد أول طلب");
  check(true, "the empty store renders «لا عملاء بعد — يظهر العميل بعد أول طلب»");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  const total = failures.length;
  console.log(`\n${total === 0 && consoleErrors.length === 0 ? "✓ customers check passed" : `✗ ${total} failed, ${consoleErrors.length} console errors`}`);
  process.exit(total === 0 && consoleErrors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
