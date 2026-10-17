/**
 * A verbatim port of the platform's own landing page,
 * `sharwa_saas/tenants/templates/tenants/home.html` (owner direction
 * 2026-10-17: "clone the original interface exactly").
 *
 * This is a SEPARATE module from `landing.content.ts` on purpose. That file
 * holds the M01 spec copy and is still imported by the capabilities bento,
 * how-it-works, pricing, FAQ, proof bar and footer — none of which this page
 * mounts any more, and none of which were deleted. Keeping the two apart lets
 * the clone use the product's real strings (note the brand's own spelling,
 * «شروة», where the M01 copy had drifted to «شروه») without rewriting a word
 * of the other.
 *
 * Every string below is copied from the template character for character. Do
 * not edit this copy — it belongs to the product, not to this repository.
 */

export interface Feature {
  /** The template's `.feature-icon` glyph. */
  icon: string;
  title: string;
  body: string;
}

export const brand = {
  /** `.brand` — `🛍️ شروة <span>.</span>` */
  glyph: "🛍️",
  name: "شروة",
  /** The teal full stop that closes the wordmark. */
  dot: ".",
} as const;

export const nav = {
  createStore: "إنشاء متجر",
  login: "تسجيل الدخول",
} as const;

export const hero = {
  badge: "منصة المتاجر الإلكترونية المتكاملة",
  badgeGlyph: "🚀",
  /** `<h1>` split exactly where the template's `<br>` and `<span>` fall. */
  titleLine1: "أطلق متجرك الإلكتروني الاحترافي",
  titleLine2Before: "مع ",
  titleAccent: "منصة شروة",
  titleLine2After: " بسهولة",
  subtitle:
    "ابدأ تجارتك الإلكترونية بكل قوة: إدارة المنتجات، استقبال وإرسال إشعارات الواتساب للعملاء، دعم كامل لأسعار الصرف المتعددة، والدفع بالمحافظ الإلكترونية.",
  cta: "أنشئ متجرك الآن مجاناً",
} as const;

export const features: Feature[] = [
  {
    icon: "⚡",
    title: "متجر فوري ونطاق مخصص",
    body: "احصل على متجر متكامل فوري بنطاق فرعي فائق السرعة مهيأ بالكامل للبيع.",
  },
  {
    icon: "💱",
    title: "إدارة العملات والصرف",
    body: "دعم الريال السعودي، الدولار، واليمني (صنعاء وعدن) مع تحويل تلقائي للأسعار.",
  },
  {
    icon: "📲",
    title: "إشعارات واتساب تلقائية",
    body: "إشعار فوري للتاجر بطلبات الشراء، وإشعار للزبون عند تجهيز طلبه تلقائياً.",
  },
  {
    icon: "💳",
    title: "طرق الدفع والمحافظ",
    body: "دعم الدفع عند الاستلام، إرفاق إشعارات التحويل، والدفع المباشر عبر المحافظ.",
  },
];

export const seo = {
  title: "منصة شروة | بوابتك الذكية للتجارة الإلكترونية",
  description:
    "ابدأ تجارتك الإلكترونية بكل قوة: إدارة المنتجات، إشعارات الواتساب، أسعار الصرف المتعددة، والدفع بالمحافظ الإلكترونية.",
} as const;
