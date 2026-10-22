/**
 * Schema audit (2026-10-23) — programmatic check of «إضافة منتج» with ONLY the mandatory fields.
 *
 *   npx tsx scripts/product-minimum-check.ts [out.json]
 *
 * 1. The form schema accepts the minimum (name, price, category, unit) with every optional field
 *    left empty — Arabic-Indic digits included.
 * 2. Each mandatory field, when missing, fails with its Arabic message ON that field.
 * 3. Optional fields typed loosely (a slug with spaces/capitals, a bare «www.» link) never block.
 * 4. The payload the editor sends (`formToPayload`) is accepted by the BFF mock `createProduct`.
 * 5. The payload is written to [out.json] so the Django test can post the very same body
 *    (`api.test_products_api.MinimumPayloadTests`).
 */
import { writeFileSync } from "node:fs";
import { productFormSchema, type ProductFormValues } from "@/features/products/schemas";
import { EMPTY_PRODUCT_FORM, formToPayload } from "@/features/products/components/editor/form-mapping";
import { createProduct } from "@/mocks/catalog/products";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures += 1;
}

const minimum: ProductFormValues = { ...EMPTY_PRODUCT_FORM, name: "عسل سدر", price: "١٢٠٫٥", category_id: "1", unit: "piece", stock: "" };

const ok = productFormSchema.safeParse(minimum);
check("الحد الأدنى (الاسم + السعر + التصنيف + الوحدة) مقبول وكل الاختياري فارغ", ok.success, ok.error?.issues);

for (const [field, value, message] of [
  ["name", "", "أدخل اسم المنتج."],
  ["price", "", "أدخل سعر المنتج."],
  ["category_id", "", "اختر تصنيف المنتج (أو أنشئ تصنيفاً بزر +)."],
] as const) {
  const r = productFormSchema.safeParse({ ...minimum, [field]: value });
  const issue = r.error?.issues.find((i) => i.path[0] === field);
  check(`«${field}» إلزامي برسالة عربية على الحقل نفسه`, !r.success && issue?.message === message, r.error?.issues);
}
const unitBad = productFormSchema.safeParse({ ...minimum, unit: "" as never });
check("«unit» إلزامي (قيمة من القائمة)", !unitBad.success && unitBad.error.issues.some((i) => i.path[0] === "unit"));

const formula = productFormSchema.safeParse({ ...minimum, price: "", pricing_type: "formula", formula_unit_price: "250", formula_coefficient: "0.875" });
check("السعر غير مطلوب حين تحسبه المعادلة", formula.success, formula.error?.issues);

const loose: ProductFormValues = {
  ...minimum,
  slug: "My Product!! 2026",
  image_url: "www.example.com/a.png",
  video_url: "",
  description: "",
  barcode: "",
  sku: "",
  meta_title: "",
};
const looseOk = productFormSchema.safeParse(loose);
check("slug بمسافات وأحرف كبيرة ورابط بلا https لا يمنعان الحفظ", looseOk.success, looseOk.error?.issues);
const loosePayload = formToPayload(loose);
check("slug يُحوَّل إلى رابط صالح", loosePayload.slug === "my-product-2026", loosePayload.slug);
check("الرابط يُكمَل بـ https://", loosePayload.image_url === "https://www.example.com/a.png", loosePayload.image_url);

const payload = formToPayload(minimum);
check("الأرقام العربية تُرسل أرقاماً لاتينية", payload.price === "120.5", payload.price);
check("المخزون الفارغ يُرسل 0", payload.stock === "0", payload.stock);
check("التصنيف يُرسل رقماً", payload.category_id === 1, payload.category_id);

const out = process.argv[2];
if (out) {
  writeFileSync(out, JSON.stringify(payload, null, 1));
  console.log(`payload → ${out}`);
}

// The BFF mock route answers POST /api/bff/products with this function.
const created = createProduct("demo", payload);
check("BFF (محاكاة) يقبل الجسم نفسه — 201", created.ok && created.status === 201, created.ok ? undefined : created.body);

console.log(failures ? `\n${failures} فحص(فحوص) فشلت` : "\nكل الفحوص ناجحة");
process.exit(failures ? 1 : 0);
