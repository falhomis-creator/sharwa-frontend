/**
 * M01 landing copy (FR-01.04 / FR-01.10).
 *
 * Rules enforced by review (constitution I): concrete verbs and product nouns
 * only — no "أطلق العنان", no "ثورة", no emoji, no superlatives. Hero title
 * ≤ 9 words, subtitle ≤ 25 words, card bodies ≤ 25 words.
 */

export interface ProofStat {
  label: string;
  value: string;
  unit: string;
  /** Provenance marker: static copy until `GET /api/v1/public/stats/` ships. */
  source: "static-2026-10";
}

export type BentoSize = 4 | 6 | 8;

export type PreviewKey =
  | "orders"
  | "variants"
  | "shipment"
  | "wallet"
  | "coupon"
  | "pos"
  | "inbox";

export interface Capability {
  key: string;
  title: string;
  body: string;
  size: BentoSize;
  preview: PreviewKey;
}

export const nav = [
  { href: "#capabilities", label: "القدرات" },
  { href: "#how", label: "كيف يعمل" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة" },
] as const;

export const hero = {
  eyebrow: "منصة تجارة إلكترونية متعددة المتاجر",
  title: "متجر إلكتروني كامل، من أول طلب إلى آخر شحنة",
  /** The two words the headline rests on; carry the brand gradient. */
  titleAccent: "آخر شحنة",
  /** Trimmed to one line: the hero sells the field below it, not itself. */
  subtitle: "اكتب اسم متجرك وابدأ البيع بالعربية خلال دقائق.",
  cta: "ابدأ متجرك",
  ctaSecondary: "شاهد القدرات",
  /** The second of the hero's two actions (header + under the form). */
  ctaLogin: "تسجيل الدخول للتجار",
  loginPrompt: "لديك متجر بالفعل؟",
  /** Sits under the field — the one objection worth answering at this point. */
  startHint: "مجاناً، وبلا بطاقة بنكية.",
} as const;

/**
 * TODO(stats): placeholder figures, not measured telemetry — every row carries
 * `source: 'static-2026-10'` and `getProofStats()` falls back to exactly these
 * until the public stats endpoint exists. Replace before any public launch.
 */
export const proofStats: ProofStat[] = [
  { label: "متاجر نشطة", value: "1,200", unit: "+", source: "static-2026-10" },
  { label: "طلب في آخر 30 يوماً", value: "48,500", unit: "+", source: "static-2026-10" },
  { label: "زمن إنشاء المتجر", value: "54", unit: "ثانية", source: "static-2026-10" },
];

export const capabilities: Capability[] = [
  {
    key: "orders",
    title: "لوحة الطلبات",
    body: "تابع كل طلب من الدفع إلى التسليم، غيّر الحالة، واطبع الفاتورة من نفس الشاشة.",
    size: 8,
    preview: "orders",
  },
  {
    key: "products",
    title: "المنتجات والمتغيرات",
    body: "مقاسات وألوان وأسعار لكل متغير، مع سعر وSKU ومخزون مستقل.",
    size: 4,
    preview: "variants",
  },
  {
    key: "shipping",
    title: "الشحن والتتبع",
    body: "اربط شركات الشحن، أنشئ البوليصة، وأعطِ المشتري رابط تتبع واحداً.",
    size: 4,
    preview: "shipment",
  },
  {
    key: "pay",
    title: "محفظة شروة باي",
    body: "أرصدة التحصيل والتسوية بالريال، مع كشف حركة لكل عملية.",
    size: 4,
    preview: "wallet",
  },
  {
    key: "discounts",
    title: "الخصومات والقسائم",
    body: "قسائم بنسبة أو مبلغ، بسقف استخدام وتاريخ انتهاء وشروط سلة.",
    size: 4,
    preview: "coupon",
  },
  {
    key: "pos",
    title: "نقطة البيع",
    body: "بِع في المعرض من نفس المخزون، واطبع الإيصال، واقبض نقداً أو بالشبكة.",
    size: 6,
    preview: "pos",
  },
  {
    key: "inbox",
    title: "صندوق المحادثات",
    body: "رسائل واتساب والمتجر في صندوق واحد، مربوطة بطلب المشتري وسجلّه.",
    size: 6,
    preview: "inbox",
  },
];

export const howItWorks = [
  {
    num: "01",
    title: "سجّل اسم متجرك",
    body: "اختر الاسم والنطاق الفرعي، فيُنشأ المتجر على الفور بنطاقه الخاص.",
  },
  {
    num: "02",
    title: "أضف منتجاتك",
    body: "ارفع الصور، حدّد الأسعار والمتغيرات، واضبط المخزون لكل فرع.",
  },
  {
    num: "03",
    title: "استلم طلباتك",
    body: "يصل الطلب إلى اللوحة، فتؤكّده وتشحنه وتحصّل قيمته من المحفظة.",
  },
] as const;

export const faqs = [
  {
    q: "هل أحتاج بطاقة بنكية للبدء؟",
    a: "لا. الاشتراك مجاني حالياً بكل الميزات، ولا نطلب أي وسيلة دفع عند إنشاء المتجر.",
  },
  {
    q: "هل أستطيع استخدام نطاقي الخاص؟",
    a: "نعم. يبدأ متجرك على نطاق فرعي مثل mystore.sharwaah.com، ويمكنك ربط نطاقك الخاص بعدها من إعدادات المتجر.",
  },
  {
    q: "كيف أحصّل أموال الطلبات؟",
    a: "تُقيَّد قيمة الطلبات في محفظة شروة باي داخل اللوحة، وتطلب التسوية إلى حسابك البنكي مع كشف حركة لكل عملية.",
  },
  {
    q: "هل المنصة تدعم العربية فعلياً؟",
    a: "المنصة عربية أصلاً من اليمين إلى اليسار في كل الشاشات، بخط IBM Plex Sans Arabic وأرقام جدولية للأسعار والتواريخ.",
  },
  {
    q: "هل أبيع في المعرض والمتجر معاً؟",
    a: "نعم. نقطة البيع تسحب من نفس المخزون، فينقص الرصيد مرة واحدة سواء جاء الطلب من المعرض أو من المتجر الإلكتروني.",
  },
  {
    q: "ماذا لو احتجت مساعدة في الإعداد؟",
    a: "فريق الدعم يرد على واتساب، ويمكنه إعداد المنتجات وطرق الشحن والدفع معك في أول مكالمة.",
  },
] as const;

export const footer = {
  columns: [
    {
      title: "المنصة",
      links: [
        { href: "#capabilities", label: "القدرات" },
        { href: "#how", label: "كيف يعمل" },
        { href: "#pricing", label: "الأسعار" },
        { href: "#faq", label: "الأسئلة الشائعة" },
      ],
    },
    {
      title: "للتاجر",
      links: [
        { href: "/login", label: "دخول التاجر" },
        { href: "/pay", label: "شروة باي" },
        { href: "/affiliates", label: "المسوقون" },
      ],
    },
    {
      title: "قانوني",
      links: [
        { href: "/terms", label: "شروط الاستخدام" },
        { href: "/privacy", label: "سياسة الخصوصية" },
        { href: "/refunds", label: "سياسة الاسترجاع" },
      ],
    },
  ],
  legal: "جميع الحقوق محفوظة لمنصة شروه",
} as const;

export const seo = {
  title: "متجرك الإلكتروني بالعربية",
  description:
    "منصة شروه: متجر إلكتروني كامل بلوحة تحكم عربية، نقطة بيع، محفظة، وشحن. سجّل اسم متجرك وابدأ البيع خلال دقائق.",
} as const;

/* ---------------------------------------------------------------------------
 * Data for the miniature dashboard (T035) and the bento previews (T036).
 * These render REAL components, never screenshots — TODO(M03): swap for the
 * actual dashboard shell once it exists.
 * ------------------------------------------------------------------------ */

export type OrderStatus = "paid" | "processing" | "shipped" | "pending" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "مدفوع",
  processing: "قيد التحضير",
  shipped: "تم الشحن",
  pending: "بانتظار الدفع",
  cancelled: "ملغي",
};

export const previewDashboard = {
  storeName: "متجر الندى",
  sidebar: [
    { label: "نظرة عامة", active: true },
    { label: "الطلبات", active: false },
    { label: "المنتجات", active: false },
    { label: "العملاء", active: false },
    { label: "الإعدادات", active: false },
  ],
  kpis: [
    { label: "طلبات اليوم", value: "37", unit: "" },
    { label: "إيراد اليوم", value: "8,420.00", unit: "ر.س" },
    { label: "عملاء جدد", value: "12", unit: "" },
    { label: "منخفض المخزون", value: "4", unit: "" },
  ],
  orders: [
    { id: "SH-10492", customer: "نورة العمري", total: "640.00", status: "paid" as OrderStatus },
    { id: "SH-10491", customer: "عبدالله الشمري", total: "1,280.00", status: "processing" as OrderStatus },
    { id: "SH-10490", customer: "ريم القحطاني", total: "215.50", status: "shipped" as OrderStatus },
    { id: "SH-10489", customer: "فهد الدوسري", total: "92.00", status: "pending" as OrderStatus },
    { id: "SH-10488", customer: "سارة الحربي", total: "3,105.00", status: "paid" as OrderStatus },
  ],
} as const;

export const previewData = {
  variants: {
    product: "عباية كلوش",
    rows: [
      { variant: "أسود · S", sku: "AB-BK-S", price: "320.00", stock: "18" },
      { variant: "أسود · M", sku: "AB-BK-M", price: "320.00", stock: "6" },
      { variant: "كحلي · M", sku: "AB-NV-M", price: "345.00", stock: "0" },
    ],
  },
  shipment: {
    tracking: "SA8842190037",
    carrier: "سمسا",
    steps: [
      { label: "أُنشئت البوليصة", at: "09:12", done: true },
      { label: "استلم المندوب", at: "11:40", done: true },
      { label: "في مركز الفرز", at: "14:05", done: true },
      { label: "خارج للتوصيل", at: "—", done: false },
    ],
  },
  wallet: {
    balance: "24,860.75",
    currency: "ر.س",
    pending: "3,120.00",
    rows: [
      { label: "تحصيل طلبات", amount: "+1,840.00" },
      { label: "تسوية بنكية", amount: "−9,500.00" },
      { label: "رسوم شحن", amount: "−286.00" },
    ],
  },
  coupon: {
    code: "NOOR25",
    value: "25%",
    used: "148",
    cap: "500",
    expires: "31 ديسمبر",
  },
  pos: {
    lines: [
      { name: "عباية كلوش · M", qty: "1", price: "320.00" },
      { name: "طرحة حرير", qty: "2", price: "90.00" },
    ],
    total: "500.00",
    currency: "ر.س",
  },
  inbox: {
    threads: [
      { name: "نورة العمري", channel: "واتساب", snippet: "وصل الطلب، شكراً لكم", unread: true },
      { name: "عبدالله الشمري", channel: "المتجر", snippet: "متى يتوفر المقاس L؟", unread: true },
      { name: "ريم القحطاني", channel: "واتساب", snippet: "أبغى أعدّل العنوان", unread: false },
    ],
  },
} as const;

/** Section intros — short, declarative, no filler (FR-01.10). */
export const sections = {
  capabilities: {
    label: "القدرات",
    title: "كل ما يحتاجه المتجر، في لوحة واحدة",
    body: "لا إضافات ولا ربط خارجي لتبدأ: الطلبات والمخزون والشحن والتحصيل تعمل معاً من اليوم الأول.",
  },
  how: {
    label: "كيف يعمل",
    title: "ثلاث خطوات حتى أول طلب",
  },
  pricing: {
    label: "الأسعار",
    title: "مجاني الآن، بكل الميزات",
    body: "لم نفتح الاشتراكات بعد. كل متجر جديد يبدأ على الخطة المجانية بلا حد للمنتجات أو الطلبات.",
  },
  faq: {
    label: "الأسئلة",
    title: "أسئلة يسألها التاجر قبل أن يبدأ",
  },
} as const;
