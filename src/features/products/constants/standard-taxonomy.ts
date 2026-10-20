import type { DataType, FieldType } from "@/features/products/schemas";

/**
 * Standard e-commerce taxonomy (M04 «Zero-Config» templates, owner directive 2026-10-20).
 *
 * A frontend preset dictionary, NOT backend data: picking a category in the «قالب جديد» form
 * checks the listed attributes. Names already in the store dictionary are matched by name and
 * checked. The others appear as new attributes and are created in the dictionary only when the
 * template is saved. Nothing is locked: the merchant can uncheck or add attributes freely.
 *
 * This is separate from the 35 central sectors (`GlobalVariantTemplate`, «من قطاع مركزي»), which
 * come from the backend with option values. These presets carry attribute NAMES only, so a
 * merchant with an empty store can start a template instantly.
 */
export type StandardCategory = {
  id: string;
  label: string;
  attributes: readonly string[];
};

export const STANDARD_TAXONOMY = [
  // Fashion & Beauty
  { id: "fashion", label: "الملابس والأزياء", attributes: ["المقاس", "اللون", "الخامة", "الفئة المستهدفة"] },
  { id: "shoes", label: "الأحذية", attributes: ["مقاس الحذاء", "اللون", "مادة الصنع"] },
  { id: "jewelry", label: "الساعات والمجوهرات", attributes: ["نوع المعدن", "العيار", "نوع الحجر", "لون المينا"] },
  { id: "perfumes", label: "العطور", attributes: ["الحجم/مل", "نسبة التركيز", "العائلة العطرية"] },
  { id: "cosmetics", label: "مستحضرات التجميل", attributes: ["الدرجة/اللون", "نوع البشرة المناسب", "الحجم"] },

  // Tech & Devices
  { id: "smartphones", label: "الجوالات والأجهزة الذكية", attributes: ["سعة التخزين", "الذاكرة العشوائية", "اللون", "فترة الضمان"] },
  { id: "computers", label: "الكمبيوترات وملحقاتها", attributes: ["المعالج", "كرت الشاشة", "الرام", "لغة الكيبورد"] },
  { id: "home_appliances", label: "الأجهزة المنزلية", attributes: ["السعة/الحجم", "القوة بالواط", "اللون", "الضمان"] },

  // Home & Living
  { id: "furniture", label: "الأثاث والديكور", attributes: ["الأبعاد", "المادة", "اللون", "الوزن"] },
  { id: "kitchen", label: "أدوات المطبخ", attributes: ["السعة باللتر", "مادة الصنع", "عدد القطع"] },
  { id: "bedding", label: "المفروشات والأسرة", attributes: ["المقاس", "نوع القماش", "اللون"] },

  // Consumables & Hobbies
  { id: "grocery", label: "المواد الغذائية", attributes: ["الوزن/الحجم", "النكهة", "تاريخ الصلاحية"] },
  { id: "coffee", label: "القهوة ومختصاتها", attributes: ["الوزن", "درجة التحميص", "نوع الطحنة", "السلالة"] },
  { id: "sports", label: "الرياضة واللياقة", attributes: ["المقاس", "اللون", "الوزن"] },
  { id: "toys", label: "ألعاب الأطفال", attributes: ["العمر المناسب", "اللون", "مادة الصنع"] },
  { id: "books", label: "الكتب والقرطاسية", attributes: ["لغة الكتاب", "نوع الغلاف", "عدد الصفحات"] },

  // Specialized
  { id: "automotive", label: "قطع غيار السيارات", attributes: ["الموديل المتوافق", "سنة الصنع", "رقم القطعة"] },
  { id: "digital", label: "المنتجات الرقمية", attributes: ["المنطقة/المتجر", "الفئة السعرية"] },
  { id: "general", label: "منتج عام", attributes: ["اللون", "الحجم"] },
] as const satisfies readonly StandardCategory[];

export type StandardCategoryId = (typeof STANDARD_TAXONOMY)[number]["id"];

/** Picker groups in the order the menu shows them (`<optgroup>`). Every id appears exactly once. */
export const STANDARD_TAXONOMY_GROUPS: readonly { label: string; ids: readonly StandardCategoryId[] }[] = [
  { label: "الأزياء والجمال", ids: ["fashion", "shoes", "jewelry", "perfumes", "cosmetics"] },
  { label: "التقنية والأجهزة", ids: ["smartphones", "computers", "home_appliances"] },
  { label: "المنزل والمعيشة", ids: ["furniture", "kitchen", "bedding"] },
  { label: "الاستهلاكيات والهوايات", ids: ["grocery", "coffee", "sports", "toys", "books"] },
  { label: "أقسام متخصصة", ids: ["automotive", "digital", "general"] },
];

export function standardCategory(id: string): StandardCategory | undefined {
  return STANDARD_TAXONOMY.find((c) => c.id === id);
}

/**
 * Normalises an attribute name for matching against the store dictionary: trims, collapses
 * spaces, drops tatweel and harakat, and folds the alef/yaa/taa-marbuta variants, so «الأبعاد» matches
 * «الابعاد» and «المقاس » matches «المقاس». Matching only; the name saved is the one shown.
 */
export function normalizeAttributeName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Type for an attribute the preset creates. Most are a dropdown of text values (the
 * dictionary's own default); the few that are clearly a date or a count get that type so
 * the merchant does not have to fix them later. Anything with a unit stays plain text:
 * a `unit` data type needs a unit the preset cannot guess.
 */
const CREATE_HINTS: Record<string, { field_type: FieldType; data_type: DataType }> = {
  [normalizeAttributeName("اللون")]: { field_type: "swatches", data_type: "text" },
  [normalizeAttributeName("تاريخ الصلاحية")]: { field_type: "date", data_type: "date" },
  [normalizeAttributeName("عدد الصفحات")]: { field_type: "numeric", data_type: "number" },
  [normalizeAttributeName("عدد القطع")]: { field_type: "numeric", data_type: "number" },
  [normalizeAttributeName("سنة الصنع")]: { field_type: "numeric", data_type: "number" },
  [normalizeAttributeName("رقم القطعة")]: { field_type: "text", data_type: "text" },
};

export function attributeCreateType(name: string): { field_type: FieldType; data_type: DataType } {
  return CREATE_HINTS[normalizeAttributeName(name)] ?? { field_type: "select", data_type: "text" };
}
