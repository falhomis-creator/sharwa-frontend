/**
 * Functional check for M13 — مركز التسويق (T102–T104) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/marketing-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove: the hub strip reads the summary; the coupon list filters
 * by `?status=` and shows «غير محدود»; a coupon is created through the form and the server
 * 400 (duplicate code) lands under the field; the influencer coupon keeps its code locked;
 * the offer form switches fields by type and saves a buy_x_get_y offer as multipart; the
 * abandoned-cart Sheet sends a reminder; the settings form flags an unknown `{var}`; a
 * campaign is created from `?segment=`, previewed, scheduled and cancelled, and an unconnected
 * channel is disabled; a timeline event is created and appears as a bar; loyalty rejects a
 * zero; gifting toggles; the staff cashier gets 403 on owner-only rows; the `shop` store
 * renders empties. Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const failures: string[] = [];
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  try {
    return await chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
  } catch (err) {
    if (override && existsSync(override)) throw err;
    throw new Error(`Chromium not found — set SHARWA_CHROMIUM. (${String(err)})`);
  }
}

async function context(browser: Browser, session: "merchant" | "staff", host = "noor.localhost"): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  return ctx;
}

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // Provoked 4xx responses (duplicate code, zero loyalty value, 403 for staff) are logged by the browser as failed resources.
    if (m.type() === "error" && !/status of (400|403)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] pageerror ${e.message.slice(0, 240)}`));
}

async function api(page: Page, path: string, init?: { method?: string; body?: unknown }) {
  return page.evaluate(
    async ([p, i]) => {
      const res = await fetch(p, { method: i?.method ?? "GET", headers: i?.body ? { "content-type": "application/json" } : {}, body: i?.body ? JSON.stringify(i.body) : undefined });
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* 204 */ }
      return { status: res.status, json };
    },
    [path, init] as const,
  );
}

async function main() {
  const browser = await launch();
  try {
    // ── merchant on noor ──────────────────────────────────────────────────────────────
    const ctx = await context(browser, "merchant");
    const page = await ctx.newPage();
    watch(page, "merchant");

    // 1. hub strip from the summary endpoint
    await page.goto(`${BASE}/dashboard/marketing`);
    const summary = (await api(page, "/api/bff/marketing/summary")).json as { active_coupons: number };
    await page.getByTestId("marketing-summary").locator("span[data-mono]").first().waitFor();
    const stripFirst = await page.getByTestId("marketing-summary").locator("span[data-mono]").first().innerText();
    check(Number(stripFirst) === summary.active_coupons, `hub strip shows ${summary.active_coupons} active coupons (got ${stripFirst})`);
    check((await page.getByTestId("marketing-tools").locator("li[data-enabled=true]").count()) === 7, "hub lists seven enabled tools for the owner");

    // 2. coupons list: ?status filter + «غير محدود»
    await page.goto(`${BASE}/dashboard/marketing/coupons?status=expired`);
    await page.getByTestId("coupons-table").locator("tbody").getByText("OLD20").waitFor();
    check((await page.getByTestId("coupons-table").locator("tbody tr").count()) === 1, "coupons ?status=expired → only OLD20");
    await page.goto(`${BASE}/dashboard/marketing/coupons`);
    await page.getByTestId("coupons-table").locator("tbody").getByText("WELCOME10").waitFor();
    check((await page.getByTestId("coupons-table").locator("tbody").getByText("غير محدود").count()) >= 1, "unlimited coupon reads «غير محدود»");

    // 3. coupon form: duplicate code → server 400 under the field; then a valid create
    await page.goto(`${BASE}/dashboard/marketing/coupons/new`);
    await page.getByTestId("code").fill("WELCOME10");
    await page.getByTestId("discount_value").fill("15");
    await page.getByTestId("save").click();
    await page.locator("#code-error").waitFor();
    check(/مستخدم/.test(await page.locator("#code-error").innerText()), "duplicate code → DRF error under «الكود»");
    await page.getByTestId("code").fill(`CHK${RUN}`);
    await page.getByTestId("max_uses").fill("20");
    await page.getByTestId("save").click();
    await page.waitForURL(/\/marketing\/coupons\/\d+$/);
    check(/\/coupons\/\d+$/.test(page.url()), "new coupon saved and opened on its page");
    check((await page.getByTestId("coupon-usage").innerText()).includes("0"), "fresh coupon shows 0/20 usage");

    // 4. influencer coupon: code locked
    const coupons = (await api(page, "/api/bff/marketing/coupons")).json as { results: Array<{ id: number; influencer: unknown }> };
    const infl = coupons.results.find((c) => c.influencer);
    await page.goto(`${BASE}/dashboard/marketing/coupons/${infl!.id}`);
    await page.getByTestId("code").waitFor();
    check((await page.getByTestId("code").getAttribute("readonly")) !== null, "influencer coupon: code input is locked (read-only)");

    // 5. offer form: type switch shows bxgy fields; multipart save
    await page.goto(`${BASE}/dashboard/marketing/offers/new`);
    check((await page.getByTestId("discount-fields").count()) === 1 && (await page.getByTestId("bxgy-fields").count()) === 0, "offer form starts with discount fields only");
    await page.getByTestId("offer_type").selectOption("buy_x_get_y");
    await page.getByTestId("bxgy-fields").waitFor();
    check((await page.getByTestId("discount-fields").count()) === 0, "buy_x_get_y hides the discount fields");
    await page.getByTestId("name").fill("عرض الفحص");
    await page.getByTestId("buy_quantity").fill("2");
    await page.getByTestId("get_quantity").fill("1");
    await page.getByTestId("get_product_id").fill("قهوة");
    await page.locator("[data-testid^=get_product_id-option-]").first().click();
    await page.getByTestId("get_product_id-selected").waitFor();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("image").setInputFiles({ name: "offer.png", mimeType: "image/png", buffer: png });
    await page.getByTestId("save").click();
    await page.waitForURL(/\/marketing\/offers\/\d+$/);
    const offerId = Number(page.url().split("/").pop());
    const offer = (await api(page, `/api/bff/marketing/offers/${offerId}`)).json as { image: string | null; offer_type: string; get_product: unknown };
    check(offer.offer_type === "buy_x_get_y" && !!offer.get_product, "buy_x_get_y offer saved with its gift product");
    check(!!offer.image && offer.image.startsWith("data:image/png"), "offer image went up as multipart and came back as a data URL");

    // 6. abandoned carts: open sheet, send reminder
    await page.goto(`${BASE}/dashboard/marketing/abandoned-carts?status=abandoned`);
    await page.getByTestId("carts-table").locator("tbody tr").first().waitFor();
    const carts = (await api(page, "/api/bff/marketing/abandoned-carts?status=abandoned")).json as { results: Array<{ id: number; customer_phone: string | null; reminder_step: number }> };
    const target = carts.results.find((c) => c.customer_phone)!;
    await page.goto(`${BASE}/dashboard/marketing/abandoned-carts?status=abandoned&cart=${target.id}`);
    await page.getByTestId("cart-sheet").waitFor();
    await page.getByTestId("remind").click();
    await page.getByTestId("remind-dialog").waitFor();
    await page.getByTestId("remind-dialog-confirm").click();
    await page.getByText("أُرسل التذكير", { exact: true }).waitFor();
    const after = (await api(page, `/api/bff/marketing/abandoned-carts/${target.id}`)).json as { reminder_step: number; last_reminder_sent_at: string | null };
    check(after.reminder_step === Math.min(2, target.reminder_step + 1) && !!after.last_reminder_sent_at, "«إرسال تذكير» bumps the reminder step and stamps the time");

    // 7. settings: unknown variable
    await page.goto(`${BASE}/dashboard/marketing/abandoned-carts/settings`);
    await page.getByTestId("reminder_1_message").waitFor();
    check(await page.getByTestId("channel_email").isDisabled() && await page.getByTestId("channel_sms").isDisabled(), "email/SMS channels disabled «قريباً»");
    await page.getByTestId("reminder_1_message").fill("مرحباً {customer_nme}");
    await page.getByTestId("save").click();
    await page.locator("#reminder_1_message-error").waitFor();
    check(/متغير غير معروف/.test(await page.locator("#reminder_1_message-error").innerText()), "unknown {var} → «متغير غير معروف»");

    // 8. campaign from ?segment= → create → preview → schedule → cancel; unconnected channel disabled
    await page.goto(`${BASE}/dashboard/marketing/campaigns/new?segment=dormant`);
    await page.getByTestId("audience-dormant").waitFor();
    // The URL state (nuqs) is applied after the first client render — wait for it, don't race it.
    const preselected = await page
      .waitForFunction(() => (document.querySelector('[data-testid="audience-dormant"]') as HTMLInputElement | null)?.checked === true, null, { timeout: 5000 })
      .then(() => true, () => false);
    check(preselected, "?segment=dormant preselects the audience");
    check(await page.locator("[data-channel=sms] input").isDisabled() && !(await page.locator("[data-channel=whatsapp] input").isDisabled()), "only WhatsApp is enabled; SMS disabled with «اربط القناة»");
    await page.getByTestId("name").fill("حملة الفحص");
    await page.getByTestId("message").fill("مرحباً {customer_name}، عروض الفحص هنا.");
    await page.getByTestId("save").click();
    await page.waitForURL(/\/marketing\/campaigns\/\d+$/);
    const campaignId = Number(page.url().split("/").pop());
    await page.getByTestId("preview").click();
    await page.getByTestId("rendered-message").waitFor();
    const rendered = await page.getByTestId("rendered-message").innerText();
    check(!rendered.includes("{customer_name}") && rendered.includes("عروض الفحص"), "preview renders {customer_name} with a real name");
    await page.keyboard.press("Escape");
    await page.getByTestId("schedule").click();
    await page.getByTestId("schedule-dialog").waitFor();
    await page.getByTestId("schedule-dialog-confirm").click();
    await page.getByTestId("cancel-schedule").waitFor();
    const scheduled = (await api(page, `/api/bff/marketing/campaigns/${campaignId}`)).json as { status: string; scheduled_at: string | null };
    check(scheduled.status === "scheduled" && !!scheduled.scheduled_at, "schedule → status scheduled with scheduled_at");
    await page.getByTestId("cancel-schedule").click();
    await page.getByTestId("cancel-dialog-confirm").click();
    await page.getByTestId("send-now").waitFor();
    const back = (await api(page, `/api/bff/marketing/campaigns/${campaignId}`)).json as { status: string };
    check(back.status === "draft", "cancel schedule → back to draft");
    const sentRO = (await api(page, "/api/bff/marketing/campaigns/1", { method: "PATCH", body: { name: "x" } })).status;
    check(sentRO === 400, "a sent campaign refuses edits (400)");

    // 9. timeline: create event → bar appears
    await page.goto(`${BASE}/dashboard/marketing/timeline?new=1`);
    await page.getByTestId("event-sheet").waitFor();
    await page.getByTestId("event-title").fill("حدث الفحص");
    await page.getByTestId("event-save").click();
    await page.getByText("أُضيف الحدث", { exact: true }).waitFor();
    await page.locator("[data-testid=timeline-bar]", { hasText: "حدث الفحص" }).first().waitFor();
    check(true, "new timeline event renders as a bar in its month row");
    check((await page.getByTestId("timeline-months").locator("li[data-month]").count()) >= 4, "timeline shows at least four month rows");

    // 10. loyalty: zero rejected (client), then server 400 by API; gifting toggles
    await page.goto(`${BASE}/dashboard/marketing/loyalty`);
    await page.getByTestId("riyals_per_point").waitFor();
    check((await page.getByTestId("loyalty-example").innerText()).includes("10"), "live example: 100 ر.س = 10 نقاط");
    await page.getByTestId("riyals_per_point").fill("0");
    await page.getByTestId("save").click();
    await page.locator("#riyals_per_point-error").waitFor();
    check(true, "loyalty: zero while enabled → error under the field");
    const srv = await api(page, "/api/bff/marketing/loyalty", { method: "PATCH", body: { riyals_per_point: 0 } });
    check(srv.status === 400, "loyalty PATCH riyals_per_point=0 → 400 from the shared program mock");
    const g0 = (await api(page, "/api/bff/marketing/gifting")).json as { is_enabled: boolean };
    await page.goto(`${BASE}/dashboard/marketing/gifting`);
    await page.getByTestId("gift_is_enabled").click();
    await page.waitForFunction(async (prev) => (await (await fetch("/api/bff/marketing/gifting")).json()).is_enabled !== prev, g0.is_enabled);
    check(true, "gifting switch persists through PATCH");
    await api(page, "/api/bff/marketing/gifting", { method: "PATCH", body: { is_enabled: g0.is_enabled } });
    await ctx.close();

    // ── staff cashier: owner-only rows → 403, coupons read-only ───────────────────────
    const staffCtx = await context(browser, "staff");
    const staff = await staffCtx.newPage();
    watch(staff, "staff");
    await staff.goto(`${BASE}/dashboard/marketing/coupons`);
    const s1 = (await api(staff, "/api/bff/marketing/campaigns")).status;
    const s2 = (await api(staff, "/api/bff/marketing/abandoned-carts")).status;
    const s3 = (await api(staff, "/api/bff/marketing/coupons", { method: "POST", body: { code: "STAFF1", discount_type: "percent", discount_value: "5", apply_to: "all" } })).status;
    check(s1 === 403 && s2 === 403, `staff → campaigns/abandoned-carts 403 (${s1}/${s2})`);
    check(s3 === 403, `staff without discounts.manage → POST coupons 403 (${s3})`);
    await staffCtx.close();

    // ── empty store ───────────────────────────────────────────────────────────────────
    const shopCtx = await context(browser, "merchant", "shop.localhost");
    const shop = await shopCtx.newPage();
    watch(shop, "shop");
    await shop.goto(`http://shop.localhost:${PORT}/dashboard/marketing/coupons`);
    await shop.getByText("لا كوبونات بعد").waitFor();
    check(true, "shop store renders the coupons empty state");
    await shopCtx.close();
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n${failures.length} failed, ${consoleErrors.length} console errors`);
    process.exit(1);
  }
  console.log("\nall M13 checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
