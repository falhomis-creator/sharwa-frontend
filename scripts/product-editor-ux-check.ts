/**
 * Browser check of the «إضافة منتج» schema audit (2026-10-23) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/product-editor-ux-check.ts [port]   (default 3000)
 *
 * As the `noor` merchant:
 *   1. the mandatory fields (name, price, category, unit) carry a red asterisk, nothing else does;
 *   2. «حفظ» is clickable on an empty form and answers with the missing fields in Arabic, focusing
 *      the first one;
 *   3. a product saves with ONLY the mandatory fields (Arabic digits in the price, a loose slug);
 *   4. a new product with only a pending image counts as «تغييرات غير محفوظة»;
 *   5. on a saved product «حفظ» stays clickable with no change, an uploaded image is saved at once,
 *      and editing a variant row is an unsaved change that the main «حفظ» persists.
 * Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
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

/** A tiny valid PNG (no fixture file needed). */
function png(): Buffer {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.from([0, 0, 102, 255, 0, 102, 255, 0, 0, 102, 255, 0, 102, 255]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function api<T>(page: Page, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { ok: r.ok, status: r.status, text: await r.text() };
    },
    { method, path, body },
  );
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.text}`);
  return JSON.parse(res.text) as T;
}

// Next keeps up to three routes alive (hidden): always target the editor on screen.
const editor = (page: Page) => page.locator("[data-testid=product-editor]:visible");
const saveBar = (page: Page) => editor(page).locator("[data-testid=save-bar]");

async function main() {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240));
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));

  // ── 1. Asterisks ──────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/products/new`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=product-editor]");
  for (const id of ["pe-name", "pe-price", "pe-category", "pe-unit"]) {
    check((await page.locator(`label[for=${id}] .text-destructive`).count()) === 1, `«${id}» has the red asterisk`);
  }
  for (const id of ["pe-desc", "pe-slug", "pe-sku", "pe-barcode", "pe-mt", "pe-stock", "pe-iurl"]) {
    check((await page.locator(`label[for=${id}] .text-destructive`).count()) === 0, `«${id}» is optional (no asterisk)`);
  }

  // ── 2. «حفظ» on an empty form ─────────────────────────────────────────────────────────
  const save = editor(page).locator("[data-testid=product-save]");
  check(await save.isEnabled(), "«حفظ» is clickable on an empty new product");
  await save.click();
  await page.waitForSelector("#pe-name-error");
  const bar = (await saveBar(page).textContent()) ?? "";
  check(bar.includes("أكمل الحقول المطلوبة") && bar.includes("اسم المنتج") && bar.includes("السعر") && bar.includes("التصنيف"), `the bar names the missing fields («${bar.trim()}»)`);
  check((await page.locator("#pe-price-error").textContent())?.includes("أدخل سعر المنتج") ?? false, "price error in Arabic under the field");
  check((await page.locator("#pe-category-error").count()) === 1, "category error under the field");
  await page.waitForTimeout(400);
  check((await page.evaluate(() => document.activeElement?.id)) === "pe-name", "the first missing field gets the focus");

  // ── 3. Only the mandatory fields ──────────────────────────────────────────────────────
  const name = `منتج الحد الأدنى ${Date.now() % 100000}`;
  await page.fill("#pe-name", name);
  await page.fill("#pe-price", "١٢٠٫٥");
  await page.locator("#pe-category").selectOption({ index: 1 });
  await page.fill("#pe-slug", "My Loose Slug!!");
  await save.click();
  await page.waitForURL(/\/dashboard\/products\/\d+$/, { timeout: 15_000 });
  const productId = Number(/products\/(\d+)$/.exec(page.url())![1]);
  const created = await api<{ name: string; price: string; slug: string; description: string; category_id: number | null }>(page, "GET", `/api/bff/products/${productId}`);
  check(created.name === name && created.price === "120.5" && created.category_id !== null, `saved with only the mandatory fields (#${productId}, price ${created.price})`);
  check(/^my-loose-slug(-\d+)?$/.test(created.slug), `the loose slug became «${created.slug}»`);

  // ── 5a. Saved product: «حفظ» stays clickable; an image saves at once ──────────────────
  await page.waitForSelector("[data-testid=product-editor]");
  check(await save.isEnabled(), "«حفظ» is clickable on a saved product with no change");
  await editor(page).locator("[data-testid=card-media] input[type=file]").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: png() });
  await page.getByText("رُفعت الصورة وحُفظت مع المنتج").waitFor({ timeout: 10_000 });
  const withImage = await api<{ images: unknown[] }>(page, "GET", `/api/bff/products/${productId}`);
  check(withImage.images.length === 1, "the uploaded image is already saved");
  await save.click();
  await page.getByText("حُفظت التغييرات").first().waitFor({ timeout: 10_000 });
  check(true, "«حفظ» with no form change still saves");

  // ── 5b. Variant row edit is an unsaved change, persisted by the main «حفظ» ─────────────
  const attrs = await api<Array<{ id: number; options: Array<{ id: number }> }>>(page, "GET", "/api/bff/products/variant-attributes");
  const attr = attrs.find((a) => a.options.length >= 2)!;
  const variants = await api<Array<{ id: number }>>(page, "POST", `/api/bff/products/${productId}/variants/generate`, {
    attribute_ids: [attr.id],
    option_ids: attr.options.slice(0, 2).map((o) => o.id),
    exclude: [],
  });
  await page.reload({ waitUntil: "networkidle" });
  await editor(page).locator("[data-testid=variant-row]").first().waitFor();
  const stockCell = editor(page).locator("[data-testid=variant-row]").first().locator("input").nth(2);
  await stockCell.fill("٧");
  check(((await saveBar(page).textContent()) ?? "").includes("تغييرات غير محفوظة"), "editing a variant row marks the product as changed");
  await save.click();
  await page.getByText(/حُفظت التغييرات مع \d+ متغيراً/).waitFor({ timeout: 10_000 });
  const after = await api<{ variants: Array<{ id: number; stock: string }> }>(page, "GET", `/api/bff/products/${productId}`);
  check(after.variants.find((v) => v.id === variants[0]!.id)?.stock === "7.000", "the main «حفظ» saved the variant stock (Arabic digit ٧ → 7)");

  // ── 4. New product with only a pending image ──────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/products/new`, { waitUntil: "networkidle" });
  await editor(page).locator("[data-testid=pending-media-input]").setInputFiles({ name: "b.png", mimeType: "image/png", buffer: png() });
  check(((await saveBar(page).textContent()) ?? "").includes("تغييرات غير محفوظة"), "a pending image alone counts as an unsaved change");
  check(await save.isEnabled(), "«حفظ» is clickable");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log(`  ${e}`);
  }
  const failed = failures.length + consoleErrors.length;
  console.log(failed ? `\n${failures.length} فحص فشل، ${consoleErrors.length} خطأ في الطرفية` : "\nكل الفحوص ناجحة");
  process.exit(failed ? 1 : 0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
