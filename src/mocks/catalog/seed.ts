import type { Brand, Category, Collection, Tag } from "@/features/organization/schemas";
import type {
  GlobalTemplate,
  HazardClass,
  PaymentPolicy,
  PricingType,
  ProductImage,
  ProductTemplate,
  ProductType,
  Unit,
  VariantAttribute,
  VariantOption,
} from "@/features/products/schemas";
import { int, pick, seeded, sku as makeSku } from "@/mocks/_fixtures";
import { FIXTURE_NOW } from "@/mocks/store-state";

/**
 * Catalogue fixtures for M04/M05 (`[NEEDS BACKEND]`): 16 categories over three levels,
 * 6 brands, 10 tags, 3 manual collections, 4 merchant badges, the three variant
 * attributes of T070 (المقاس · اللون · الخامة), 2 blueprints, the 35 central sectors and
 * 60 Arabic products that between them switch on every conditional field the editor has
 * (deposit, formula pricing, taxes, sale window, serialized, bundle, auction, bookable,
 * digital, hazardous) so SC-04.3 can be checked against real rows.
 *
 * Raw hex values are DATA (what Django stores for `ProductBadge.color` and swatches),
 * consumed as data by the UI — never as styling.
 */

export interface MockProduct {
  id: number;
  name: string;
  name_en: string;
  slug: string;
  sku: string;
  barcode: string;
  product_type: ProductType;
  category_id: number | null;
  brand_id: number | null;
  tag_ids: number[];
  badge_ids: number[];
  blueprint_id: number | null;
  price: string;
  old_price: string | null;
  sale_start_at: string | null;
  sale_end_at: string | null;
  cost_price: string | null;
  currency: "SAR" | "USD" | "YER_OLD" | "YER_NEW";
  payment_policy: PaymentPolicy;
  deposit_required: string | null;
  is_taxable: boolean;
  tax_rate: string | null;
  pricing_type: PricingType;
  live_rate_ref: string | null;
  formula_unit_price: string | null;
  formula_coefficient: string | null;
  formula_fixed_extra: string | null;
  has_refundable_deposit: boolean;
  refundable_deposit_amount: string | null;
  refundable_deposit_refund_rule: string;
  refundable_deposit_return_event: string;
  is_serialized: boolean;
  is_bundle: boolean;
  bundle_build_fee: string | null;
  is_auction: boolean;
  auction_status: "draft" | "active" | "ended" | null;
  is_personalizable: boolean;
  is_bookable: boolean;
  booking_duration_minutes: number | null;
  stock: string;
  unit: Unit;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  min_quantity: number | null;
  max_quantity: number | null;
  allow_variable_quantity: boolean;
  description: string;
  description_en: string;
  images: ProductImage[];
  image_url: string;
  video_url: string;
  variant_display_style: "swatches" | "dropdown" | "radio";
  product_template: "standard" | "landing_page";
  is_available: boolean;
  published_at: string | null;
  archived_at: string | null;
  is_featured: boolean;
  is_free_shipping: boolean;
  delivery_duration: string;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  is_hazardous: boolean;
  hazard_class: HazardClass;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string | null;
  variant_attribute_ids: number[];
  views_count: number;
  add_to_cart_count: number;
  serial_available: number | null;
  created_at: string;
  updated_at: string;
}

export interface MockVariant {
  id: number;
  product_id: number;
  option_ids: number[];
  sku: string;
  extra_price: string;
  stock: string;
  image: string | null;
}

export interface MockBadge {
  id: number;
  name: string;
  color: string;
}

export interface MockCollection extends Omit<Collection, "products_count"> {
  product_ids: number[];
}

export interface MockChange {
  id: number;
  product_id: number;
  field: string;
  before: string | null;
  after: string | null;
  actor: string;
  at: string;
}

function iso(daysAgo: number, hour = 10): string {
  return new Date(FIXTURE_NOW - daysAgo * 86_400_000 - (20 - hour) * 3_600_000).toISOString();
}

export function isoFromNow(days: number): string {
  return new Date(FIXTURE_NOW + days * 86_400_000).toISOString();
}

// ── Organization ──────────────────────────────────────────────────────────────────────
type CategorySeed = Omit<Category, "products_count">;

const seo = { meta_title: "", meta_description: "", meta_keywords: "", og_image: null };

export const CATEGORY_SEED: CategorySeed[] = [
  { id: 1, name: "أزياء", parent_id: null, sort_order: 0, image: null, ...seo, meta_title: "أزياء رجالية ونسائية" },
  { id: 2, name: "رجالي", parent_id: 1, sort_order: 0, image: null, ...seo },
  { id: 3, name: "نسائي", parent_id: 1, sort_order: 1, image: null, ...seo },
  { id: 4, name: "إكسسوارات", parent_id: 1, sort_order: 2, image: null, ...seo },
  { id: 5, name: "عطور وبخور", parent_id: null, sort_order: 1, image: null, ...seo },
  { id: 6, name: "إلكترونيات", parent_id: null, sort_order: 2, image: null, ...seo },
  { id: 7, name: "هواتف", parent_id: 6, sort_order: 0, image: null, ...seo },
  { id: 8, name: "سماعات", parent_id: 6, sort_order: 1, image: null, ...seo },
  { id: 9, name: "أغذية", parent_id: null, sort_order: 3, image: null, ...seo },
  { id: 10, name: "تمور", parent_id: 9, sort_order: 0, image: null, ...seo },
  { id: 11, name: "قهوة وشاي", parent_id: 9, sort_order: 1, image: null, ...seo },
  { id: 12, name: "المنزل", parent_id: null, sort_order: 4, image: null, ...seo },
  { id: 13, name: "مطبخ", parent_id: 12, sort_order: 0, image: null, ...seo },
  { id: 14, name: "ديكور", parent_id: 12, sort_order: 1, image: null, ...seo },
  { id: 15, name: "كتب", parent_id: null, sort_order: 5, image: null, ...seo },
  { id: 16, name: "عروض موسمية", parent_id: null, sort_order: 6, image: null, ...seo },
];

export const BRAND_SEED: Omit<Brand, "products_count">[] = [
  { id: 1, name: "دار العود", slug: "dar-aloud", logo: null },
  { id: 2, name: "نسيج", slug: "naseej", logo: null },
  { id: 3, name: "تقنية بلس", slug: "tech-plus", logo: null },
  { id: 4, name: "مزارع القصيم", slug: "qassim-farms", logo: null },
  { id: 5, name: "حراز", slug: "haraz", logo: null },
  { id: 6, name: "بيت الفخار", slug: "pottery-house", logo: null },
];

export const TAG_SEED: Omit<Tag, "products_count" | "last_used_at">[] = [
  { id: 1, name: "الأكثر مبيعاً", slug: "best-seller" },
  { id: 2, name: "هدايا", slug: "gifts" },
  { id: 3, name: "رمضان", slug: "ramadan" },
  { id: 4, name: "صيفي", slug: "summer" },
  { id: 5, name: "شتوي", slug: "winter" },
  { id: 6, name: "طبيعي", slug: "natural" },
  { id: 7, name: "يدوي الصنع", slug: "handmade" },
  { id: 8, name: "إصدار محدود", slug: "limited" },
  { id: 9, name: "العيد", slug: "eid" },
  { id: 10, name: "تصفية", slug: "clearance" },
];

export const BADGE_SEED: MockBadge[] = [
  { id: 1, name: "حصري", color: "#18181b" },
  { id: 2, name: "صناعة يمنية", color: "#b45309" },
  { id: 3, name: "اختيار المحرر", color: "#0369a1" },
  { id: 4, name: "فاتح", color: "#fde68a" },
];

// ── Variant dictionary (T070: 3 attributes) ──────────────────────────────────────────
function option(id: number, attribute_id: number, value: string, extra: Partial<VariantOption> = {}): VariantOption {
  return {
    id,
    attribute_id,
    value,
    text_value: value,
    numeric_value: null,
    unit_value: null,
    boolean_value: null,
    date_value: null,
    image: null,
    color: null,
    ...extra,
  };
}

export const ATTRIBUTE_SEED: Omit<VariantAttribute, "products_count">[] = [
  {
    id: 1,
    name: "المقاس",
    field_type: "select",
    data_type: "text",
    unit: "",
    min_value: null,
    max_value: null,
    is_required: true,
    sort_order: 0,
    options: [option(1, 1, "S"), option(2, 1, "M"), option(3, 1, "L"), option(4, 1, "XL")],
  },
  {
    id: 2,
    name: "اللون",
    field_type: "swatches",
    data_type: "text",
    unit: "",
    min_value: null,
    max_value: null,
    is_required: true,
    sort_order: 1,
    options: [
      option(5, 2, "أسود", { color: "#18181b" }),
      option(6, 2, "أبيض", { color: "#fafafa" }),
      option(7, 2, "أحمر", { color: "#b91c1c" }),
      option(8, 2, "كحلي", { color: "#1e3a8a" }),
    ],
  },
  {
    id: 3,
    name: "الخامة",
    field_type: "select",
    data_type: "text",
    unit: "",
    min_value: null,
    max_value: null,
    is_required: false,
    sort_order: 2,
    options: [option(9, 3, "قطن"), option(10, 3, "كتان"), option(11, 3, "صوف")],
  },
];

// ── Templates ─────────────────────────────────────────────────────────────────────────
export const GLOBAL_SECTORS = [
  "ملابس",
  "أحذية",
  "عطور",
  "إلكترونيات",
  "هواتف وإكسسواراتها",
  "مجوهرات",
  "ساعات",
  "أثاث",
  "مستلزمات مطبخ",
  "أغذية",
  "تمور",
  "قهوة وشاي",
  "حلويات",
  "مستحضرات تجميل",
  "عناية بالبشرة",
  "ألعاب",
  "كتب",
  "قرطاسية",
  "رياضة",
  "قطع غيار السيارات",
  "أدوات منزلية",
  "إضاءة",
  "سجاد",
  "أقمشة",
  "حقائب",
  "نظارات",
  "هدايا",
  "زهور",
  "مستلزمات الحيوانات الأليفة",
  "أطفال ورضّع",
  "صحة",
  "أدوات بناء",
  "زراعة",
  "تكييف وتبريد",
  "خدمات",
] as const;

export function globalTemplates(): GlobalTemplate[] {
  return GLOBAL_SECTORS.map((name, i) => {
    const id = i + 1;
    if (name === "ملابس" || name === "أقمشة") {
      return {
        id,
        name,
        attributes: [
          { name: "المقاس", field_type: "select", data_type: "text", values: ["S", "M", "L", "XL", "XXL"] },
          { name: "اللون", field_type: "swatches", data_type: "text", values: ["أسود", "أبيض", "رمادي"] },
          { name: "الخامة", field_type: "select", data_type: "text", values: ["قطن", "بوليستر"] },
        ],
      };
    }
    if (name === "أحذية") {
      return {
        id,
        name,
        attributes: [
          { name: "مقاس الحذاء", field_type: "select", data_type: "number", values: ["40", "41", "42", "43", "44"] },
          { name: "اللون", field_type: "swatches", data_type: "text", values: ["أسود", "بني"] },
        ],
      };
    }
    if (name === "عطور") {
      return {
        id,
        name,
        attributes: [{ name: "الحجم", field_type: "radio", data_type: "unit", values: ["30", "50", "100"] }],
      };
    }
    return {
      id,
      name,
      attributes: [{ name: "اللون", field_type: "swatches", data_type: "text", values: ["أسود", "أبيض"] }],
    };
  });
}

export const TEMPLATE_SEED: Omit<ProductTemplate, "products_count">[] = [
  {
    id: 1,
    name: "ملابس قطنية",
    global_template_id: 1,
    variant_attribute_ids: [1, 2],
    fields: {
      product_type: "physical",
      unit: "piece",
      currency: "SAR",
      payment_policy: "cod",
      is_taxable: true,
      tax_rate: "15.00",
      low_stock_threshold: 3,
      variant_display_style: "swatches",
      is_free_shipping: false,
      delivery_duration: "2-4 أيام",
      weight: "0.400",
      hazard_class: "none",
    },
    updated_at: iso(12),
  },
  {
    id: 2,
    name: "عطور بعربون",
    global_template_id: 3,
    variant_attribute_ids: [],
    fields: {
      product_type: "physical",
      unit: "piece",
      currency: "SAR",
      payment_policy: "deposit",
      deposit_required: "50.00",
      is_hazardous: true,
      hazard_class: "flammable",
      delivery_duration: "3-5 أيام",
      weight: "0.250",
    },
    updated_at: iso(30),
  },
];

export const LIVE_RATE_REFS = [
  { key: "gold_21", label: "ذهب عيار 21 (غرام)", display_rate: "245.30 ر.س" },
  { key: "gold_24", label: "ذهب عيار 24 (غرام)", display_rate: "280.35 ر.س" },
  { key: "saffron_g", label: "زعفران (غرام)", display_rate: "18.00 ر.س" },
];

// ── Products ──────────────────────────────────────────────────────────────────────────
interface ProductSeedRow {
  name: string;
  en: string;
  cat: number;
  brand?: number;
  price: number;
  type?: ProductType;
}

const PRODUCT_ROWS: ProductSeedRow[] = [
  // رجالي
  { name: "ثوب قطن صيفي", en: "Summer cotton thobe", cat: 2, brand: 2, price: 180 },
  { name: "شماغ أحمر", en: "Red shemagh", cat: 2, brand: 2, price: 95 },
  { name: "ثوب شتوي صوف", en: "Winter wool thobe", cat: 2, brand: 2, price: 260 },
  { name: "غترة بيضاء", en: "White ghutra", cat: 2, brand: 2, price: 70 },
  { name: "نعال جلد رجالي", en: "Men's leather sandals", cat: 2, price: 140 },
  { name: "جاكيت جلد", en: "Leather jacket", cat: 2, price: 420 },
  // نسائي
  { name: "عباية كلاسيك سوداء", en: "Classic black abaya", cat: 3, brand: 2, price: 230 },
  { name: "عباية مطرزة", en: "Embroidered abaya", cat: 3, brand: 2, price: 340 },
  { name: "طرحة شيفون", en: "Chiffon scarf", cat: 3, price: 45 },
  { name: "جلابية صيفية", en: "Summer jalabiya", cat: 3, price: 160 },
  { name: "حقيبة جلد طبيعي", en: "Genuine leather bag", cat: 3, price: 310 },
  { name: "حذاء رياضي نسائي", en: "Women's sneakers", cat: 3, price: 199 },
  // إكسسوارات
  { name: "ساعة ذكية", en: "Smart watch", cat: 4, brand: 3, price: 450 },
  { name: "نظارة شمسية", en: "Sunglasses", cat: 4, price: 120 },
  { name: "محفظة جلد", en: "Leather wallet", cat: 4, price: 85 },
  { name: "حزام جلد", en: "Leather belt", cat: 4, price: 75 },
  { name: "خاتم فضة", en: "Silver ring", cat: 4, price: 150 },
  { name: "مسبحة كهرمان", en: "Amber prayer beads", cat: 4, price: 900 },
  // عطور
  { name: "عطر عود ملكي 50مل", en: "Royal oud perfume 50ml", cat: 5, brand: 1, price: 240 },
  { name: "دهن عود كمبودي", en: "Cambodian oud oil", cat: 5, brand: 1, price: 520 },
  { name: "بخور معمول", en: "Mamoul incense", cat: 5, brand: 1, price: 65 },
  { name: "مبخرة سيراميك", en: "Ceramic incense burner", cat: 5, brand: 6, price: 90 },
  { name: "عطر مسك أبيض", en: "White musk perfume", cat: 5, brand: 1, price: 110 },
  { name: "عطر فرنسي 100مل", en: "French perfume 100ml", cat: 5, price: 680 },
  // هواتف
  { name: "جوال بحافظة", en: "Phone with case", cat: 7, brand: 3, price: 1450 },
  { name: "حافظة جوال جلد", en: "Leather phone case", cat: 7, brand: 3, price: 55 },
  { name: "شاحن سريع 25 واط", en: "25W fast charger", cat: 7, brand: 3, price: 79 },
  { name: "كابل شحن مضفّر", en: "Braided charging cable", cat: 7, brand: 3, price: 35 },
  { name: "باور بانك 20000", en: "Power bank 20000", cat: 7, brand: 3, price: 129 },
  { name: "حامل جوال للسيارة", en: "Car phone holder", cat: 7, price: 49 },
  // سماعات
  { name: "سماعة لاسلكية", en: "Wireless earbuds", cat: 8, brand: 3, price: 199 },
  { name: "سماعة رأس", en: "Headphones", cat: 8, brand: 3, price: 289 },
  { name: "سماعة أذن رياضية", en: "Sport earphones", cat: 8, brand: 3, price: 119 },
  { name: "مكبر صوت بلوتوث", en: "Bluetooth speaker", cat: 8, brand: 3, price: 175 },
  // تمور
  { name: "تمر سكري فاخر 1كغ", en: "Premium sukkari dates 1kg", cat: 10, brand: 4, price: 80 },
  { name: "تمر عجوة المدينة", en: "Madinah ajwa dates", cat: 10, brand: 4, price: 120 },
  { name: "تمر خلاص", en: "Khalas dates", cat: 10, brand: 4, price: 60 },
  { name: "معمول تمر", en: "Date mamoul", cat: 10, price: 45 },
  // قهوة وشاي
  { name: "قهوة عربية مطحونة 500غ", en: "Ground Arabic coffee 500g", cat: 11, brand: 5, price: 65 },
  { name: "قهوة يمنية حراز", en: "Yemeni Haraz coffee", cat: 11, brand: 5, price: 140 },
  { name: "شاي أحمر فاخر", en: "Premium black tea", cat: 11, price: 38 },
  { name: "هيل حب 250غ", en: "Cardamom pods 250g", cat: 11, price: 55 },
  { name: "زعفران", en: "Saffron", cat: 11, price: 90 },
  // مطبخ
  { name: "طقم فناجين", en: "Cups set", cat: 13, brand: 6, price: 150 },
  { name: "دلة قهوة نحاس", en: "Copper coffee pot", cat: 13, brand: 6, price: 210 },
  { name: "ترمس حافظ", en: "Thermos flask", cat: 13, price: 95 },
  { name: "طقم صحون", en: "Plates set", cat: 13, brand: 6, price: 260 },
  { name: "سكاكين مطبخ", en: "Kitchen knives", cat: 13, price: 130 },
  // ديكور
  { name: "مصباح مكتبي", en: "Desk lamp", cat: 14, price: 115 },
  { name: "مزهرية زجاج", en: "Glass vase", cat: 14, brand: 6, price: 85 },
  { name: "سجادة صلاة", en: "Prayer rug", cat: 14, price: 70 },
  { name: "إطار صور خشب", en: "Wooden photo frame", cat: 14, price: 40 },
  { name: "شمعة معطرة", en: "Scented candle", cat: 14, price: 50 },
  { name: "ساعة حائط", en: "Wall clock", cat: 14, price: 135 },
  // المنزل (خدمة)
  { name: "ورشة تغليف هدايا", en: "Gift wrapping workshop", cat: 12, price: 60, type: "service" },
  // كتب
  { name: "كتاب تطوير الذات", en: "Self-development e-book", cat: 15, price: 25, type: "digital" },
  { name: "رواية عربية", en: "Arabic novel", cat: 15, price: 48 },
  { name: "كتاب طبخ يمني", en: "Yemeni cookbook", cat: 15, price: 65 },
  { name: "قصص أطفال", en: "Children's stories", cat: 15, price: 30 },
  { name: "دفتر ملاحظات جلد", en: "Leather notebook", cat: 15, price: 55 },
];

const DESCRIPTIONS = [
  "خامة ممتازة وتشطيب يدوي متقن، مناسب للاستخدام اليومي.",
  "منتج أصلي بضمان المتجر، يصل مغلفاً بعناية.",
  "اختيار عملائنا الأول هذا الموسم.",
  "",
];

export function seedProducts(): { products: MockProduct[]; variants: MockVariant[] } {
  const rnd = seeded(20261017);
  const products: MockProduct[] = [];
  const variants: MockVariant[] = [];

  PRODUCT_ROWS.forEach((row, i) => {
    const id = 1001 + i;
    const daysAgo = int(rnd, 1, 120);
    const updatedAgo = Math.min(daysAgo, int(rnd, 0, 20));
    const price = `${row.price}.00`;
    const hasSale = i % 7 === 3;
    const product: MockProduct = {
      id,
      name: row.name,
      name_en: row.en,
      slug: row.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      sku: makeSku(rnd),
      barcode: i % 3 === 0 ? `6281${String(100000000 + i * 7919).slice(0, 9)}` : "",
      product_type: row.type ?? "physical",
      category_id: row.cat,
      brand_id: row.brand ?? null,
      tag_ids: [pick(rnd, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])].concat(i % 4 === 0 ? [2] : []).filter((v, j, a) => a.indexOf(v) === j),
      badge_ids: i % 9 === 0 ? [1] : i % 11 === 0 ? [2] : [],
      blueprint_id: row.cat === 2 || row.cat === 3 ? 1 : null,
      price,
      old_price: hasSale ? `${Math.round(row.price * 1.25)}.00` : null,
      sale_start_at: hasSale ? iso(5) : null,
      sale_end_at: hasSale ? isoFromNow(i % 2 === 0 ? 10 : -2) : null,
      cost_price: `${Math.round(row.price * 0.55)}.00`,
      currency: "SAR",
      payment_policy: "cod",
      deposit_required: null,
      is_taxable: i % 5 === 0,
      tax_rate: i % 5 === 0 ? "15.00" : null,
      pricing_type: "fixed",
      live_rate_ref: null,
      formula_unit_price: null,
      formula_coefficient: null,
      formula_fixed_extra: null,
      has_refundable_deposit: false,
      refundable_deposit_amount: null,
      refundable_deposit_refund_rule: "",
      refundable_deposit_return_event: "",
      is_serialized: false,
      is_bundle: false,
      bundle_build_fee: null,
      is_auction: false,
      auction_status: null,
      is_personalizable: false,
      is_bookable: false,
      booking_duration_minutes: null,
      stock: `${int(rnd, 8, 140)}.000`,
      unit: "piece",
      low_stock_threshold: null,
      allow_backorder: false,
      min_quantity: null,
      max_quantity: null,
      allow_variable_quantity: false,
      description: pick(rnd, DESCRIPTIONS),
      description_en: "",
      images: [],
      image_url: "",
      video_url: "",
      variant_display_style: "dropdown",
      product_template: "standard",
      is_available: true,
      published_at: null,
      archived_at: null,
      is_featured: i % 13 === 0,
      is_free_shipping: row.price >= 300,
      delivery_duration: "2-4 أيام",
      weight: `${(int(rnd, 1, 30) / 10).toFixed(3)}`,
      length: null,
      width: null,
      height: null,
      is_hazardous: false,
      hazard_class: "none",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: null,
      variant_attribute_ids: [],
      views_count: int(rnd, 40, 4200),
      add_to_cart_count: int(rnd, 3, 320),
      serial_available: null,
      created_at: iso(daysAgo),
      updated_at: iso(updatedAgo, 14),
    };
    products.push(product);
  });

  const byName = (name: string) => products.find((p) => p.name === name)!;

  // Lifecycle mix (FR-04.02): drafts, scheduled, archived.
  for (const n of ["جاكيت جلد", "حامل جوال للسيارة", "معمول تمر", "ساعة حائط", "دفتر ملاحظات جلد"]) {
    byName(n).is_available = false;
  }
  byName("عباية مطرزة").published_at = isoFromNow(3);
  byName("عطر فرنسي 100مل").published_at = isoFromNow(6);
  for (const n of ["كابل شحن مضفّر", "شاي أحمر فاخر", "إطار صور خشب"]) {
    byName(n).archived_at = iso(9);
  }

  // Stock mix: 7 low (≤ 3), 3 out.
  const low = ["شماغ أحمر", "طرحة شيفون", "نظارة شمسية", "بخور معمول", "سماعة رأس", "تمر عجوة المدينة", "دلة قهوة نحاس"];
  low.forEach((n, i) => (byName(n).stock = `${(i % 3) + 1}.000`));
  for (const n of ["حزام جلد", "شاحن سريع 25 واط", "سجادة صلاة"]) byName(n).stock = "0.000";

  // Every conditional field has at least one owner (SC-04.3).
  const perfume = byName("عطر فرنسي 100مل");
  Object.assign(perfume, {
    payment_policy: "deposit",
    deposit_required: "150.00",
    is_hazardous: true,
    hazard_class: "flammable",
    blueprint_id: 2,
  } satisfies Partial<MockProduct>);

  const saffron = byName("زعفران");
  Object.assign(saffron, {
    pricing_type: "formula",
    live_rate_ref: "saffron_g",
    formula_unit_price: "18.00",
    formula_coefficient: "5.000",
    formula_fixed_extra: "0.00",
    unit: "gram",
    stock: "420.500",
    allow_variable_quantity: true,
    min_quantity: 1,
    max_quantity: 50,
  } satisfies Partial<MockProduct>);

  const watch = byName("ساعة ذكية");
  Object.assign(watch, { is_serialized: true, serial_available: 6, stock: "6.000" } satisfies Partial<MockProduct>);

  const cups = byName("طقم فناجين");
  Object.assign(cups, { is_bundle: true, bundle_build_fee: "10.00" } satisfies Partial<MockProduct>);

  const beads = byName("مسبحة كهرمان");
  Object.assign(beads, { is_auction: true, auction_status: "active", stock: "1.000", is_available: true } satisfies Partial<MockProduct>);

  // Published (Phase 4) so the storefront has one personalizable product to show (M10 US-10.3.4).
  const ring = byName("خاتم فضة");
  Object.assign(ring, { is_personalizable: true } satisfies Partial<MockProduct>);

  // One product on the single-column landing template (M10 US-10.7.3).
  // …sold with a deposit, so a VISIBLE product exercises «المطلوب الآن / عند الاستلام» (M12 US-12.6.1).
  Object.assign(byName("دهن عود كمبودي"), {
    product_template: "landing_page",
    payment_policy: "deposit",
    deposit_required: "100.00",
  } satisfies Partial<MockProduct>);

  const workshop = byName("ورشة تغليف هدايا");
  Object.assign(workshop, {
    is_bookable: true,
    booking_duration_minutes: 60,
    stock: "20.000",
    weight: null,
    delivery_duration: "",
  } satisfies Partial<MockProduct>);

  const ebook = byName("كتاب تطوير الذات");
  Object.assign(ebook, { stock: "999.000", weight: null, delivery_duration: "" } satisfies Partial<MockProduct>);

  const thermos = byName("ترمس حافظ");
  Object.assign(thermos, {
    has_refundable_deposit: true,
    refundable_deposit_amount: "20.00",
    refundable_deposit_refund_rule: "يُرد كاملاً عند إرجاع العبوة سليمة خلال 30 يوماً",
    refundable_deposit_return_event: "استلام العبوة في الفرع",
  } satisfies Partial<MockProduct>);

  const coffee = byName("قهوة يمنية حراز");
  Object.assign(coffee, {
    video_url: "https://www.youtube.com/watch?v=sharwa-haraz",
    image_url: "https://cdn.example.invalid/haraz.jpg", // deliberately unreachable: exercises the «رابط» item (M04 §8)
    meta_title: "قهوة يمنية حراز أصلية",
    meta_description: "بن حراز اليمني محمّص على الطريقة التقليدية.",
  } satisfies Partial<MockProduct>);

  // Variants: three products with a generated matrix.
  let variantId = 5000;
  const rndV = seeded(77);
  const addMatrix = (p: MockProduct, attrIds: number[], groups: number[][]) => {
    p.variant_attribute_ids = attrIds;
    p.variant_display_style = attrIds.includes(2) ? "swatches" : "dropdown";
    const combos = groups.reduce<number[][]>((acc, g) => acc.flatMap((c) => g.map((o) => [...c, o])), [[]]);
    for (const combo of combos) {
      variantId += 1;
      variants.push({
        id: variantId,
        product_id: p.id,
        option_ids: combo,
        sku: `${p.sku}-${combo.join("")}`,
        extra_price: combo.includes(4) ? "20.00" : "0.00",
        stock: `${int(rndV, 0, 14)}.000`,
        image: null,
      });
    }
  };
  addMatrix(byName("ثوب قطن صيفي"), [1, 2], [[1, 2, 3, 4], [5, 6]]);
  addMatrix(byName("عباية كلاسيك سوداء"), [1], [[1, 2, 3]]);
  addMatrix(byName("حذاء رياضي نسائي"), [2], [[5, 6, 7]]);

  return { products, variants };
}

export const COLLECTION_SEED: MockCollection[] = [
  { id: 1, name: "هدايا العيد", slug: "eid-gifts", description: "تشكيلة مختارة لهدايا العيد.", product_ids: [1019, 1023, 1035, 1044, 1013] },
  { id: 2, name: "الأكثر طلباً", slug: "most-wanted", description: "", product_ids: [1007, 1031, 1039, 1001, 1035, 1019] },
  { id: 3, name: "تصفية الصيف", slug: "summer-clearance", description: "آخر القطع بأسعار مخفضة.", product_ids: [1004, 1009, 1028] },
];

export function seedChanges(products: MockProduct[]): MockChange[] {
  const changes: MockChange[] = [];
  let id = 1;
  for (const p of products.slice(0, 12)) {
    changes.push({ id: id++, product_id: p.id, field: "price", before: String(Number(p.price) - 20) + ".00", after: p.price, actor: "مالك المتجر", at: iso(6, 11) });
    changes.push({ id: id++, product_id: p.id, field: "stock", before: "40.000", after: p.stock, actor: "سارة الحربي", at: iso(2, 16) });
  }
  return changes;
}
