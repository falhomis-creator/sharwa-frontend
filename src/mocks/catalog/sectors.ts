/**
 * The 35 central sectors (`GlobalVariantTemplate`) EXACTLY as Django seeds them —
 * generated from `C:\sharwa_saas\products\management\commands\seed_variant_templates.py`
 * (`SECTORS`), itself the code form of `sectors_variants_architecture.md`. Do not edit by
 * hand: regenerate from the Python list so the mock and the backend never drift.
 *
 * Per attribute: the exact `VariantAttribute.name` (unique per store), its normalised
 * `field_type`, the closed value list Django seeds as `VariantOption` (open/per-merchant
 * attributes have none, on purpose), and the three planning flags from the architecture doc.
 */
import type { FieldType } from "@/features/products/schemas";

export interface SectorAttributeSeed {
  name: string;
  field_type: FieldType;
  options?: readonly string[];
  affects_price: boolean;
  creates_inventory: boolean;
  crosses_matrix: boolean;
}

export interface SectorSeed {
  number: number;
  name: string;
  variants: readonly SectorAttributeSeed[];
}

export const CENTRAL_SECTORS: readonly SectorSeed[] = [
  {
    number: 1,
    name: "الملابس والأحذية",
    variants: [
      { name: "المقاس (S/M/L/XL أو رقمي)", field_type: "select", options: ["S", "M", "L", "XL"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللون", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الخامة/القماش", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الفئة (رجالي/نسائي/أطفال)", field_type: "radio", options: ["رجالي", "نسائي", "أطفال"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "عرض الحذاء (Narrow/Medium/Wide)", field_type: "select", options: ["Narrow", "Medium", "Wide"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "النمط/الطبعة", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 2,
    name: "الإلكترونيات والجوالات",
    variants: [
      { name: "اللون", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "سعة التخزين (128/256/512GB)", field_type: "select", options: ["128GB", "256GB", "512GB"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الذاكرة RAM", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "النطاق/الشبكة (5G/LTE)", field_type: "select", options: ["5G", "LTE"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "حالة الجهاز (جديد/مجدد/مستعمل)", field_type: "select", options: ["جديد", "مجدد", "مستعمل"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الضمان (سنة/سنتان)", field_type: "select", options: ["سنة", "سنتان"], affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 3,
    name: "العطور ومستحضرات التجميل",
    variants: [
      { name: "السعة (30/50/100 مل)", field_type: "select", options: ["30 مل", "50 مل", "100 مل"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الرائحة/الاسم", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: false },
      { name: "الشكل (كريم/جل/سبراي)", field_type: "select", options: ["كريم", "جل", "سبراي"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "درجة اللون للمكياج (Shade)", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: false },
      { name: "نوع البشرة (دهنية/جافة/مختلطة)", field_type: "select", options: ["دهنية", "جافة", "مختلطة"], affects_price: false, creates_inventory: false, crosses_matrix: false },
      { name: "التشغيلة/تاريخ الصلاحية", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 4,
    name: "المواد الغذائية والبهارات",
    variants: [
      { name: "الوزن/الكمية (250غ/500غ/1كغ)", field_type: "select", options: ["250غ", "500غ", "1كغ"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "العبوة/التغليف", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "درجة الطحن (ناعم/خشن/حبوب)", field_type: "select", options: ["ناعم", "خشن", "حبوب"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "المنشأ", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "النكهة", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الدفعة/تاريخ الانتهاء", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 5,
    name: "التقنية والطاقة الشمسية",
    variants: [
      { name: "القدرة الكهربائية (100/200/400 واط)", field_type: "select", options: ["100 واط", "200 واط", "400 واط"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "النوع (منزلي/تجاري)", field_type: "select", options: ["منزلي", "تجاري"], affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "السعة (أمبير ساعة للبطاريات)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "المكوّن (لوح/منظم/إنفرتر/بطارية)", field_type: "select", options: ["لوح", "منظم", "إنفرتر", "بطارية"], affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "الجهد (12/24/48 فولت)", field_type: "select", options: ["12 فولت", "24 فولت", "48 فولت"], affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 6,
    name: "المطاعم والكافيهات",
    variants: [
      { name: "الحجم (صغير/وسط/كبير)", field_type: "radio", options: ["صغير", "وسط", "كبير"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الإضافات (صوص/إضافات قهوة)", field_type: "multi_select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "نوع الحليب", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "درجة السكر/التحميص", field_type: "radio", affects_price: false, creates_inventory: false, crosses_matrix: false },
      { name: "النكهة (سيرب)", field_type: "multi_select", affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 7,
    name: "المنتجات الرقمية والاشتراكات",
    variants: [
      { name: "الخطة/المستوى (أساسي/احترافي)", field_type: "select", options: ["أساسي", "احترافي"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "المدة (شهري/سنوي)", field_type: "select", options: ["شهري", "سنوي"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "عدد المقاعد/المستخدمين", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "نوع الترخيص (مفرد/مؤسسي)", field_type: "select", options: ["مفرد", "مؤسسي"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "اللغة", field_type: "select", affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 8,
    name: "قطع غيار السيارات",
    variants: [
      { name: "سنة الموديل", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الماركة/الطراز", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الجهة (يمين/يسار)", field_type: "select", options: ["يمين", "يسار"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الجودة (أصلي/تجاري/مُعاد تصنيعه)", field_type: "select", options: ["أصلي", "تجاري", "مُعاد تصنيعه"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الأبعاد/القطر", field_type: "numeric", affects_price: false, creates_inventory: true, crosses_matrix: false },
      { name: "اللون (قطع ملونة)", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 9,
    name: "مواد البناء والكهرباء",
    variants: [
      { name: "الأبعاد (طول×عرض×سماكة)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "العيار/المقطع (أسلاك/حديد)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "المادة (نحاس/ألومنيوم/صلب)", field_type: "select", options: ["نحاس", "ألومنيوم", "صلب"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللون", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الطول (3م/6م)", field_type: "select", options: ["3م", "6م"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التعبئة (كرتون/باليت/طن)", field_type: "select", options: ["كرتون", "باليت", "طن"], affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 10,
    name: "الذهب والمجوهرات",
    variants: [
      { name: "العيار (18/21/24 قيراط)", field_type: "select", options: ["18 قيراط", "21 قيراط", "24 قيراط"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الوزن (جرام)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "مقاس الخاتم", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الحجر/الترصيع (قيراط/نوع)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "لون الذهب (أصفر/أبيض/وردي)", field_type: "select", options: ["أصفر", "أبيض", "وردي"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التصميم/الشكل", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 11,
    name: "المطابع والدعاية",
    variants: [
      { name: "المقاس (A4/A3/A5/مخصص)", field_type: "select", options: ["A4", "A3", "A5", "مخصص"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الخامة/الورق (GSM)", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "ألوان الطباعة (أبيض وأسود/ملون)", field_type: "select", options: ["أبيض وأسود", "ملون"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "التشطيب (لامع/مطفي/سيلوفان/طي)", field_type: "multi_select", options: ["لامع", "مطفي", "سيلوفان", "طي"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الكمية", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "التغليف/التجليد", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "ملف التصميم (Artwork)", field_type: "text", affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 12,
    name: "الصيدليات والمكملات",
    variants: [
      { name: "العدد/الحجم (30/60/90 كبسولة)", field_type: "select", options: ["30 كبسولة", "60 كبسولة", "90 كبسولة"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التركيز/الجرعة (500/1000 ملغ)", field_type: "select", options: ["500 ملغ", "1000 ملغ"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الشكل (أقراص/كبسول/سائل)", field_type: "select", options: ["أقراص", "كبسول", "سائل"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "النكهة", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الفئة العمرية (بالغ/أطفال)", field_type: "select", options: ["بالغ", "أطفال"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الدفعة/تاريخ الانتهاء", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 13,
    name: "الأثاث والديكور",
    variants: [
      { name: "الحجم/المقاس (مفرد/مزدوج/ملكي)", field_type: "select", options: ["مفرد", "مزدوج", "ملكي"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللون/التشطيب", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الخامة (خشب/معدن/قماش)", field_type: "select", options: ["خشب", "معدن", "قماش"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اتجاه الفتح (يمين/يسار للأبواب والكنب)", field_type: "select", options: ["يمين", "يسار"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "النمط/التصميم", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 14,
    name: "الزراعة والمشاتل",
    variants: [
      { name: "النوع/الصنف (السلالة)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الحجم/العمر (شتلة/نبتة كبيرة)", field_type: "select", options: ["شتلة", "نبتة كبيرة"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "حجم الأصيص (10/20/30 سم)", field_type: "select", options: ["10 سم", "20 سم", "30 سم"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الوزن (بذور/أسمدة بالغرام)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الموسم (نافذة توفر)", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 15,
    name: "الفعاليات وحجز التذاكر",
    variants: [
      { name: "نوع التذكرة (عادي/VIP/عائلي)", field_type: "select", options: ["عادي", "VIP", "عائلي"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التاريخ/الجلسة (الوقت)", field_type: "date", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "المقعد/المنطقة", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الحزمة (تذكرة + وجبة/نقل)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 16,
    name: "المكتبات والكتب",
    variants: [
      { name: "الصيغة (ورقي/إلكتروني/صوتي)", field_type: "select", options: ["ورقي", "إلكتروني", "صوتي"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللغة", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الطبعة/الإصدار", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الغلاف (مقوى/عادي)", field_type: "select", options: ["مقوى", "عادي"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "رقم ISBN", field_type: "text", affects_price: false, creates_inventory: true, crosses_matrix: false },
    ],
  },
  {
    number: 17,
    name: "الخدمات والصيانة المنزلية",
    variants: [
      { name: "نوع الخدمة (سباكة/كهرباء/تكييف)", field_type: "select", options: ["سباكة", "كهرباء", "تكييف"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "المدة (ساعة/نصف يوم/يوم)", field_type: "select", options: ["ساعة", "نصف يوم", "يوم"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "التاريخ/الوقت (موعد)", field_type: "date", affects_price: false, creates_inventory: false, crosses_matrix: true },
      { name: "المنطقة (نطاق خدمة)", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الأولوية (عادي/عاجل)", field_type: "select", options: ["عادي", "عاجل"], affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 18,
    name: "الحرف اليدوية (Handmade)",
    variants: [
      { name: "الحجم/المقاس", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللون/الخامة", field_type: "swatches", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التخصيص (اسم/حروف محفورة)", field_type: "text", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "النمط/التصميم", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "مدة التصنيع (Lead Time)", field_type: "numeric", affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 19,
    name: "الصالات الرياضية والتدريب",
    variants: [
      { name: "نوع الاشتراك (شهري/ربع سنوي/سنوي)", field_type: "select", options: ["شهري", "ربع سنوي", "سنوي"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "نوع الحصة (يوغا/كروسفت/...)", field_type: "select", options: ["يوغا", "كروسفت"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "المدرب", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الوقت (جدول الحصص)", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الباقة (8/12/24 جلسة)", field_type: "select", options: ["8 جلسات", "12 جلسة", "24 جلسة"], affects_price: true, creates_inventory: false, crosses_matrix: true },
    ],
  },
  {
    number: 20,
    name: "تجارة الجملة (B2B)",
    variants: [
      { name: "الكمية/التغليف (كرتون/باليت)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الحجم/المقاس", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللون", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "العبوة (وحدة البيع)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "حد أدنى للطلب (MOQ)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 21,
    name: "العقارات ومساحات العمل",
    variants: [
      { name: "نوع الوحدة (شقة/فيلا/مكتب/مستودع)", field_type: "select", options: ["شقة", "فيلا", "مكتب", "مستودع"], affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "المساحة (م²)", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "عدد الغرف", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الحالة (جاهز/على المخطط)", field_type: "select", options: ["جاهز", "على المخطط"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "نوع المعاملة (بيع/إيجار)", field_type: "select", options: ["بيع", "إيجار"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "مدة الإيجار (شهري/سنوي)", field_type: "select", options: ["شهري", "سنوي"], affects_price: true, creates_inventory: false, crosses_matrix: true },
    ],
  },
  {
    number: 22,
    name: "تأجير السيارات",
    variants: [
      { name: "الفئة (اقتصادي/فاخر/SUV)", field_type: "select", options: ["اقتصادي", "فاخر", "SUV"], affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "المدة (يوم/أسبوع/شهر)", field_type: "select", options: ["يوم", "أسبوع", "شهر"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "تاريخ الاستلام/التسليم", field_type: "date", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الإضافات (تأمين/سائق/GPS)", field_type: "multi_select", options: ["تأمين", "سائق", "GPS"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "حد الكيلومترات", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
    ],
  },
  {
    number: 23,
    name: "الأقمشة والجلود (بالقص)",
    variants: [
      { name: "اللون", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الخامة (قطن/حرير/جلد)", field_type: "select", options: ["قطن", "حرير", "جلد"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "عرض اللفة (سم)", field_type: "numeric", affects_price: false, creates_inventory: true, crosses_matrix: false },
      { name: "الطول المطلوب (متر)", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "السماكة (مم)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 24,
    name: "التصوير والإنتاج الإعلامي",
    variants: [
      { name: "نوع الخدمة (تصوير/مونتاج/بث)", field_type: "select", options: ["تصوير", "مونتاج", "بث"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "المدة (ساعة/يوم/أيام)", field_type: "select", options: ["ساعة", "يوم", "أيام"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الحزمة (مصور فقط/فريق كامل)", field_type: "select", options: ["مصور فقط", "فريق كامل"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "التاريخ/الوقت (موعد)", field_type: "date", affects_price: false, creates_inventory: false, crosses_matrix: true },
      { name: "تسليمات إضافية (صور خام/مونتاج إضافي)", field_type: "multi_select", options: ["صور خام", "مونتاج إضافي"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "حقوق الاستخدام (شخصي/تجاري)", field_type: "select", options: ["شخصي", "تجاري"], affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 25,
    name: "الحفلات والإعاشة (Catering)",
    variants: [
      { name: "الحزمة/القائمة", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "عدد الأشخاص", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "نوع المطبخ", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "التاريخ/الوقت (موعد الفعالية)", field_type: "date", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الإضافات (خدمة/مشروبات/تجهيزات)", field_type: "multi_select", options: ["خدمة", "مشروبات", "تجهيزات"], affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 26,
    name: "التغليف المخصص (B2B)",
    variants: [
      { name: "الأبعاد (طول×عرض×ارتفاع)", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الخامة (كرتون/بلاستيك/مضلع)", field_type: "select", options: ["كرتون", "بلاستيك", "مضلع"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الكمية (MOQ)", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الطباعة (لون واحد/ملون/بدون)", field_type: "select", options: ["لون واحد", "ملون", "بدون"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "التشطيب (طلاء/تغليف داخلي)", field_type: "multi_select", options: ["طلاء", "تغليف داخلي"], affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "ملف التصميم/القالب", field_type: "text", affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 27,
    name: "مستلزمات الأطفال",
    variants: [
      { name: "المقاس/العمر (0-3ش/3-6ش/...)", field_type: "select", options: ["0-3 أشهر", "3-6 أشهر"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "اللون", field_type: "swatches", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الجنس (ولد/بنت/محايد)", field_type: "select", options: ["ولد", "بنت", "محايد"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الطراز/النوع", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "شهادة المطابقة/السلامة", field_type: "text", affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 28,
    name: "المعدات الثقيلة والمولدات",
    variants: [
      { name: "القدرة (KVA/KW)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الحالة (جديد/مستعمل)", field_type: "select", options: ["جديد", "مستعمل"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "ساعات التشغيل", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الوقود (ديزل/بنزين)", field_type: "select", options: ["ديزل", "بنزين"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "سنة الصنع", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 29,
    name: "البرمجيات والسيرفرات",
    variants: [
      { name: "الخطة/المستوى", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "المدة (شهري/سنوي)", field_type: "select", options: ["شهري", "سنوي"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "عدد المستخدمين/المقاعد", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "مواصفات السيرفر (CPU/RAM/تخزين)", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "نوع الترخيص", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 30,
    name: "الحيوانات الأليفة",
    variants: [
      { name: "النوع/السلالة", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "العمر", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الحجم (صغير/متوسط/كبير)", field_type: "select", options: ["صغير", "متوسط", "كبير"], affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "الجنس", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "اللون/النمط", field_type: "select", affects_price: false, creates_inventory: true, crosses_matrix: true },
      { name: "سجل التطعيم/الصحة", field_type: "text", affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 31,
    name: "تجميع الكمبيوتر (PC Configurator)",
    variants: [
      { name: "المعالج (CPU)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "اللوحة الأم", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الذاكرة (السعة/السرعة)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "التخزين (SSD/HDD)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "كرت الشاشة (GPU)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الهيكل/مصدر الطاقة", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
    ],
  },
  {
    number: 32,
    name: "تعبئة الغاز والبطاريات (Deposit)",
    variants: [
      { name: "الحجم/السعة (أسطوانة/بطارية)", field_type: "select", options: ["أسطوانة", "بطارية"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "نوع المعاملة (تعبئة/استبدال/شراء جديد)", field_type: "select", options: ["تعبئة", "استبدال", "شراء جديد"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "السعة (أمبير/لتر)", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "الضمان", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 33,
    name: "السياحة والسفر (Dynamic Grouping)",
    variants: [
      { name: "الوجهة", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "المدة (أيام)", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "فئة الفندق (3/4/5 نجوم)", field_type: "select", options: ["3 نجوم", "4 نجوم", "5 نجوم"], affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "نوع الغرفة", field_type: "select", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "تاريخ المغادرة", field_type: "date", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "عدد الأشخاص/الإشغال", field_type: "numeric", affects_price: true, creates_inventory: true, crosses_matrix: true },
      { name: "قواعد الإلغاء (مجاني/غير قابل)", field_type: "select", options: ["مجاني", "غير قابل للاسترداد"], affects_price: true, creates_inventory: false, crosses_matrix: true },
    ],
  },
  {
    number: 34,
    name: "التبرعات (Open Pricing)",
    variants: [
      { name: "المبلغ (ادفع ما تشاء)", field_type: "numeric", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الفئة/الغرض (الحملة)", field_type: "select", affects_price: false, creates_inventory: false, crosses_matrix: false },
      { name: "التكرار (مرة/شهري)", field_type: "select", options: ["مرة واحدة", "شهري"], affects_price: true, creates_inventory: false, crosses_matrix: true },
      { name: "الإهداء/اسم المُهدى له", field_type: "text", affects_price: false, creates_inventory: false, crosses_matrix: false },
      { name: "طلب إيصال/إشعار ضريبي", field_type: "select", options: ["نعم", "لا"], affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
  {
    number: 35,
    name: "المزادات والتحف (1-of-1)",
    variants: [
      { name: "الحالة/الدرجة (ممتاز/جيد/مُرمَّم)", field_type: "select", options: ["ممتاز", "جيد", "مُرمَّم"], affects_price: true, creates_inventory: true, crosses_matrix: false },
      { name: "العمر/الحقبة", field_type: "select", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "الأصالة/المصدر (Provenance)", field_type: "text", affects_price: true, creates_inventory: false, crosses_matrix: false },
      { name: "المنشأ", field_type: "select", affects_price: false, creates_inventory: false, crosses_matrix: false },
      { name: "الأبعاد/الوزن", field_type: "numeric", affects_price: false, creates_inventory: false, crosses_matrix: false },
    ],
  },
];
