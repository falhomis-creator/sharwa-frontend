/**
 * Functional check for M42 — wishlist, reviews & back-in-stock (T132–T134) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/engagement-check.ts [port]   (default 3000)
 *
 * On `noor.localhost`, as a buyer (no session cookie):
 *   1. shopper identity — no phone at first; a toggle answers 409 and opens the phone panel;
 *      `POST shopper/phone` normalises `0770841802 → 967770841802` and rejects garbage.
 *   2. wishlist — toggle → `{saved:true}` then `{saved:false}`; the demo list shows the
 *      three states (available / sold out / unavailable) with the current server prices;
 *      a fresh number sees «لم تحفظ شيئاً بعد»; the card button carries `aria-pressed`.
 *   3. back in stock — 201 the first time, 200 afterwards (idempotent); the wishlist's
 *      «نبّهني عند التوفر» turns into «سنُنبّهك عبر واتساب».
 *   4. reviews — `?rating=5` returns only 5-star rows and drives the PDP filter; the star
 *      radiogroup moves with the arrow keys; the form still goes through the OTP step.
 *   5. store reviews — `GET` has the average and count; a `POST` adds one; the `/about`
 *      block renders the average in Mono.
 *
 * Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
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
  try {
    return await chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
  } catch (err) {
    if (override && existsSync(override)) throw err;
    throw new Error(`Chromium not found — set SHARWA_CHROMIUM. (${String(err)})`);
  }
}

async function context(browser: Browser, width = 1440): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
}

/** Statuses provoked on purpose. */
const EXPECTED = /status of (400|404|409)/;

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    if (m.type() === "error" && !EXPECTED.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

/** Browser-side fetch (Node cannot resolve `*.localhost`; Chromium can) — same cookies. */
async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const init: RequestInit = { method, headers: { accept: "application/json" } };
      if (body !== undefined) {
        init.headers = { accept: "application/json", "content-type": "application/json" };
        init.body = JSON.stringify(body);
      }
      const r = await fetch(path, init);
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

const randomPhone = () => `077${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;

async function main() {
  const browser = await launch();
  try {
    // ── 1. identity ───────────────────────────────────────────────────────────────────
    const ctx = await context(browser);
    const page = await ctx.newPage();
    watch(page, "pdp");
    await page.goto(`${NOOR}/p/1003`, { waitUntil: "networkidle" });
    const none = await api(page, "GET", "/api/bff/shopper/phone");
    check(none.status === 200 && none.json.phone_normalized === null, "a fresh session has no shopper phone");
    const refused = await api(page, "POST", "/api/bff/wishlist/toggle", { product_id: 1003 });
    check(refused.status === 409, `toggle without a phone → 409 (${refused.status})`);
    await page.click("[data-testid=wishlist-toggle]");
    await page.waitForSelector("[data-testid=shopper-phone]", { timeout: 5000 });
    check(await page.locator("[data-testid=shopper-phone]").isVisible(), "the PDP «احفظ» opens the phone panel when no phone is known");
    const bad = await api(page, "POST", "/api/bff/shopper/phone", { phone: "12" });
    check(bad.status === 400, `a bad phone is refused with 400 (${bad.status})`);
    const replay = page.waitForResponse((r) => r.url().endsWith("/api/bff/wishlist/toggle") && r.request().method() === "POST", { timeout: 8000 });
    await page.fill("[data-testid=shopper-phone] input", "0770841802");
    await page.click("[data-testid=shopper-phone-submit]");
    const replayed = (await (await replay).json()) as { saved: boolean };
    await page.waitForSelector("[data-testid=shopper-phone]", { state: "detached", timeout: 8000 });
    const me = await api(page, "GET", "/api/bff/shopper/phone");
    check(me.json.phone_normalized === "967770841802", `the panel saved and normalised the number (${String(me.json.phone_normalized)})`);
    await page.waitForSelector(`[data-testid=wishlist-toggle][aria-pressed=${replayed.saved}]`, { timeout: 8000 });
    check(true, `the pending save replays after the phone is saved (saved=${replayed.saved}, aria-pressed agrees)`);

    // ── 2. wishlist ───────────────────────────────────────────────────────────────────
    const a = await api(page, "POST", "/api/bff/wishlist/toggle", { product_id: 1003 });
    const b = await api(page, "POST", "/api/bff/wishlist/toggle", { product_id: 1003 });
    check(a.status === 200 && b.status === 200 && a.json.saved !== b.json.saved, `toggle flips saved (${String(a.json.saved)} → ${String(b.json.saved)})`);
    if (b.json.saved === false) await api(page, "POST", "/api/bff/wishlist/toggle", { product_id: 1003 });
    const list = await api(page, "GET", "/api/bff/wishlist");
    const items = (list.json.items as { product: { id: number; stock: number; is_available: boolean; display_price?: string } }[]) ?? [];
    const ids = items.map((i) => i.product.id);
    check(ids.includes(1003) && ids.includes(1016) && ids.includes(1008), `the demo list has the three states (${ids.join(",")})`);
    check(items.every((i) => typeof i.product.display_price === "string"), "every saved product carries the current server price");

    await page.goto(`${NOOR}/wishlist`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=wishlist-item]", { timeout: 8000 });
    const states = await page.locator("[data-testid=wishlist-item]").evaluateAll((els) => els.map((e) => e.getAttribute("data-state")));
    check(states.includes("available") && states.includes("sold_out") && states.includes("unavailable"), `the page renders available / sold_out / unavailable (${states.join(",")})`);
    check((await page.locator("[data-testid=wishlist-item][data-state=unavailable] [data-testid=wishlist-add]").count()) === 0, "an unavailable item offers no «أضف إلى السلة»");

    // ── 3. back in stock ──────────────────────────────────────────────────────────────
    await page.click("[data-testid=wishlist-notify]");
    await page.waitForFunction(() => document.querySelector("[data-testid=wishlist-notify]")?.textContent?.includes("سنُنبّهك"), undefined, { timeout: 8000 });
    check(await page.locator("[data-testid=wishlist-notify]").isDisabled(), "«نبّهني عند التوفر» becomes the disabled «سنُنبّهك عبر واتساب»");
    const again = await api(page, "POST", "/api/bff/catalog/products/1016/back-in-stock", {});
    check(again.status === 200 && again.json.already === true, `a repeated subscription is idempotent → 200 (${again.status})`);
    const first = await api(page, "POST", "/api/bff/catalog/products/1027/back-in-stock", { phone: randomPhone() });
    check(first.status === 201, `a first subscription → 201 (${first.status})`);

    // Remove one and reload — the server list is the truth (then put it back for the next run).
    await page.locator("[data-testid=wishlist-item][data-state=sold_out] [data-testid=wishlist-remove]").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-testid=wishlist-item][data-state=sold_out]").length === 0, undefined, { timeout: 8000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=wishlist-item]", { timeout: 8000 });
    check((await page.locator("[data-testid=wishlist-item][data-state=sold_out]").count()) === 0, "removal survives a reload (server list)");
    await api(page, "POST", "/api/bff/wishlist/toggle", { product_id: 1016 });

    // A new number sees the empty state; the card button carries aria-pressed.
    const fresh = await (await context(browser, 390)).newPage();
    watch(fresh, "mobile");
    await fresh.goto(`${NOOR}/wishlist`, { waitUntil: "networkidle" });
    await fresh.waitForSelector("[data-testid=wishlist-phone]", { timeout: 8000 });
    await fresh.fill("[data-testid=wishlist-phone] input", randomPhone());
    await fresh.click("[data-testid=shopper-phone-submit]");
    await fresh.waitForSelector("[data-testid=wishlist-empty]", { timeout: 8000 });
    check(await fresh.locator("[data-testid=wishlist-empty]").isVisible(), "a fresh number sees «لم تحفظ شيئاً بعد»");
    await fresh.goto(`${NOOR}/c/1`, { waitUntil: "networkidle" });
    const card = fresh.locator("[data-testid=card-wishlist]").first();
    const box = await card.boundingBox();
    check(Boolean(box && box.width >= 44 && box.height >= 44), `the card bookmark is ≥ 44px (${box?.width}×${box?.height})`);
    await card.click();
    await fresh.waitForSelector("[data-testid=card-wishlist][aria-pressed=true]", { timeout: 8000 });
    check(fresh.url().includes("/c/1"), "the card bookmark saves without navigating to the product");

    // ── 4. reviews ────────────────────────────────────────────────────────────────────
    const five = await api(page, "GET", "/api/bff/catalog/products/1002/reviews?rating=5");
    const rows = (five.json.results as { rating: number }[]) ?? [];
    check(rows.length > 0 && rows.every((r) => r.rating === 5), `?rating=5 returns only 5-star reviews (${rows.length})`);
    await page.goto(`${NOOR}/p/1002?rating=5`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=reviews-list] li", { timeout: 8000 });
    const shown = await page.locator("[data-testid=reviews-list] li").count();
    check(shown === Math.min(rows.length, 5), `the PDP honours ?rating=5 (${shown} shown)`);
    check((await page.locator("[data-testid=rating-bar][aria-pressed=true]").count()) === 1, "the 5-star bar is marked pressed");
    await page.click("[data-testid=review-open]");
    await page.waitForSelector("[data-testid=review-stars]", { timeout: 5000 });
    await page.locator("[data-testid=review-stars] [data-star='1']").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const checked = await page.locator("[data-testid=review-stars] [aria-checked=true]").getAttribute("data-star");
    check(checked === "2", `arrow keys move the star choice (star ${checked})`);
    check((await page.locator("[data-testid=review-stars]").getAttribute("aria-label")) === "التقييم من 5", "the radiogroup is labelled «التقييم من 5»");
    await page.fill("[data-testid=review-form] textarea", "منتج جميل ومطابق للوصف.");
    await page.click("[data-testid=review-form] button[type=submit]");
    await page.waitForSelector("[role=dialog] input", { timeout: 5000 });
    const prefilled = await page.locator("[role=dialog] input").first().inputValue();
    check(prefilled.includes("770841802"), `the OTP dialog is prefilled with the shopper phone (${prefilled})`);

    // ── 5. store reviews ──────────────────────────────────────────────────────────────
    const sr = await api(page, "GET", "/api/bff/store-reviews");
    check(sr.status === 200 && typeof sr.json.average_rating === "number" && Number(sr.json.count) >= 7, `store reviews GET has average and count (${String(sr.json.count)})`);
    const posted = await api(page, "POST", "/api/bff/store-reviews", { rating: 5, customer_name: "فاطمة", comment: "متجر ممتاز." });
    const after = await api(page, "GET", "/api/bff/store-reviews");
    check(posted.status === 201 && Number(after.json.count) === Number(sr.json.count) + 1, `store review POST adds one (${posted.status})`);
    const invalid = await api(page, "POST", "/api/bff/store-reviews", { rating: 9, customer_name: "" });
    check(invalid.status === 400, `an invalid store review → 400 (${invalid.status})`);
    await page.goto(`${NOOR}/about`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=store-review-average]", { timeout: 8000 });
    const avg = await page.locator("[data-testid=store-review-average]").textContent();
    check(/^\d\.\d$/.test(avg ?? ""), `/about shows the store average (${avg})`);
  } finally {
    await browser.close();
  }

  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n${failures.length} failed, ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\nall engagement checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
