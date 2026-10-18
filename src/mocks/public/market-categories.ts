import type { MarketCategory } from "@/features/onboarding/schemas";

/**
 * `GET /api/v1/public/market-categories/` fixture (M02 §7 — `[NEEDS BACKEND]`).
 * Active `MarketCategory` rows, already ordered by `display_order`.
 */
export function marketCategoriesMock(): MarketCategory[] {
  return [
    { id: 1, name: "أزياء وملابس" },
    { id: 2, name: "عطور وتجميل" },
    { id: 3, name: "إلكترونيات" },
    { id: 4, name: "مواد غذائية" },
    { id: 5, name: "منزل ومطبخ" },
    { id: 6, name: "هدايا" },
    { id: 7, name: "أطفال" },
    { id: 8, name: "خدمات وحجوزات" },
  ];
}
