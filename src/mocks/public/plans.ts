import type { PublicPlansResponse } from "@/features/landing/schemas/plans";

/**
 * Reflects the ACTUAL platform state (discovery 01 §4): subscriptions are
 * switched off and every store sits on the single default free plan.
 */
export function plansMock(): PublicPlansResponse {
  return {
    subscriptions_enabled: false,
    plans: [
      {
        code: "is_default_free",
        name: "مجاني",
        is_free: true,
        price: "0.00",
        currency: "SAR",
        billing_interval: "monthly",
        max_products: null,
        max_orders_per_month: null,
        features: [
          "منتجات ومتغيرات بلا حد",
          "لوحة طلبات كاملة",
          "نقطة بيع للمعرض",
          "محفظة شروة باي",
          "ربط شركات الشحن",
          "نطاق فرعي مجاني",
          "دعم على واتساب",
        ],
      },
    ],
  };
}
