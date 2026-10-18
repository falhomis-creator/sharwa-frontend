/**
 * Every visible string of the onboarding wizard (M02, research R-11). Quoted texts marked
 * «حرفياً» in the spec are kept verbatim — the four subdomain reasons come from the server
 * and `src/lib/tenant.ts`, not from here.
 */

export const wordmark = { name: "شروة", dot: "." } as const;

export const steps = [
  {
    key: "details",
    number: "01",
    label: "بيانات المتجر",
    body: "الاسم ورقم الواتساب ورابط المتجر. لا بريد ولا كلمة مرور الآن.",
  },
  {
    key: "verify",
    number: "02",
    label: "التحقق",
    body: "رمز من ستة أرقام يصلك على واتساب.",
  },
  {
    key: "provision",
    number: "03",
    label: "التجهيز",
    body: "نُنشئ قاعدة بيانات متجرك، ثم تختار كلمة مرور اللوحة.",
  },
] as const;

export type StepKey = (typeof steps)[number]["key"];

export const asideTitle = "ثلاث خطوات، دقيقة واحدة";

export const register = {
  title: "أنشئ متجرك",
  subtitle: "أربعة حقول، ثم رمز على واتساب.",
  storeName: { label: "اسم المتجر", placeholder: "متجر نور" },
  phone: {
    label: "رقم الواتساب",
    placeholder: "0770841802",
    hint: "سيُرسل إليه رمز التحقق.",
    normalizedLabel: "يُرسل بالصيغة",
  },
  subdomain: {
    label: "رابط المتجر",
    placeholder: "mystore",
    hint: "أحرف إنجليزية صغيرة وأرقام",
    preview: "سيكون متجرك على",
    checking: "جارٍ الفحص",
    available: "متاح",
    unchecked: "سيُفحص عند الإرسال",
  },
  categories: { label: "القطاعات", optional: "اختياري" },
  terms: {
    before: "أوافق على",
    link: "شروط الاستخدام",
    after: "لمنصة شروة.",
  },
  submit: "إنشاء المتجر",
  submitting: "جارٍ الإرسال…",
  resume: {
    text: "لديك متجر قيد التجهيز من هذا المتصفح.",
    action: "متابعة الحالة",
  },
  merchantLogin: "دخول التاجر",
} as const;

export const verify = {
  title: "أدخل رمز التحقق",
  sentTo: "أرسلنا رمزاً من ستة أرقام إلى واتساب",
  codeLabel: "رمز التحقق",
  digitLabel: (i: number) => `الرقم ${i} من 6`,
  expiresIn: "ينتهي خلال",
  expired: "انتهت صلاحية الرمز",
  resend: "إرسال رمز جديد",
  resending: "جارٍ الإرسال…",
  resent: "أرسلنا رمزاً جديداً.",
  submit: "تأكيد",
  submitting: "جارٍ التحقق…",
  edit: "تعديل البيانات",
  retry: "إعادة المحاولة",
} as const;

export const status = {
  /** FR-02.08 — verbatim; the template's emoji is dropped on purpose (principle I). */
  waiting: (storeName?: string) => (storeName ? `جارٍ تجهيز متجرك ${storeName}` : "جارٍ تجهيز متجرك"),
  ready: "تهانينا! تم إنشاء متجرك بنجاح",
  failed: "تعذّر تجهيز متجرك تلقائياً",
  /** Followed by the masked number in Mono (FR text: «… على واتساب {merchant_phone}»). */
  failedBody: "سنُعيد المحاولة تلقائياً وسنتواصل معك على واتساب",
  elapsed: "الزمن المنقضي",
  slow: "يستغرق التجهيز أحياناً دقيقتين، سنرسل لك رابط المتجر على واتساب أيضاً",
  reconnecting: "نحاول الاتصال…",
  lastCheck: { before: "آخر فحص ناجح قبل", after: "ثانية" },
  steps: ["إنشاء قاعدة البيانات", "الإعدادات الأولية", "التفعيل"],
  enterDashboard: "الدخول إلى لوحة التحكم",
  viewStore: "عرض المتجر",
  copy: "نسخ",
  copied: "نُسخ",
  redirectIn: { before: "نحوّلك إلى لوحة التحكم خلال", after: "ثوانٍ" },
  notFoundTitle: "لم نجد طلب التأسيس هذا",
  notFoundBody: "قد يكون الرابط منتهياً أو منسوخاً بشكل ناقص.",
  startOver: "ابدأ من جديد",
} as const;

export const messages = {
  storeNameLength: "اسم المتجر من 3 إلى 100 حرف",
  phoneRequired: "أدخل رقم الواتساب",
  phoneInvalid: "رقم واتساب غير صحيح",
  phoneTaken: "هذا الرقم مرتبط بمتجر",
  agreeTerms: "يجب الموافقة على الشروط",
  codeInvalid: "الرمز غير صحيح",
  /** US-02.3.3 «محاولات كثيرة، حاول بعد {Retry-After}». */
  tooMany: (seconds: number) => `محاولات كثيرة، حاول بعد ${seconds} ثانية`,
  tooManyParts: { before: "محاولات كثيرة، حاول بعد", after: "ثانية" },
  network: "تعذّر الاتصال بالخادم. بياناتك محفوظة، حاول مجدداً.",
} as const;

/**
 * Terms text (M02 §7 «نص الشروط» — n/a, a content file in the repo). Plain paragraphs,
 * shown in a dialog from the consent line.
 */
export const terms = {
  title: "شروط استخدام منصة شروة",
  paragraphs: [
    "بإنشاء متجر على شروة توافق على أن البيانات التي تدخلها صحيحة وأن رقم الواتساب ملكك ويمكن التواصل معك عليه.",
    "رابط المتجر الذي تختاره يُحجز لمتجرك وحده، ولا يمكن تغييره بعد التجهيز إلا عبر الدعم.",
    "أنت مسؤول عن المنتجات التي تعرضها وعن التزامها بالأنظمة المعمول بها في بلدك.",
    "تحفظ شروة بيانات متجرك وطلباتك لتشغيل الخدمة فقط، ولا تبيعها لأي طرف.",
    "يحق للمنصة إيقاف أي متجر يخالف هذه الشروط بعد إشعار صاحبه على واتساب.",
  ],
  close: "إغلاق",
} as const;
