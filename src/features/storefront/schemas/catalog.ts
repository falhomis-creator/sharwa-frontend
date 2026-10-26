import { z } from "zod";
import { PAYMENT_POLICIES, UNITS } from "@/features/products/schemas/enums";
import { paginated } from "@/lib/schemas/pagination";

/**
 * Storefront catalogue contracts — ready-api-v1 #2–#4 plus the `[NEEDS BACKEND]` extensions
 * M09 §7 / M10 §7 propose. Ready keys are required; every extension is optional so a real
 * Django answer (which has none of them yet) still parses and the UI hides the missing
 * blocks (FR-10.08). Unknown keys pass through (no `.strict()`), every `display_*` is a
 * server-formatted string the UI never re-formats.
 */

// ── #2 GET /api/v1/catalog/categories/ ──────────────────────────────────────────────────
export interface CategoryNode {
  id: number;
  name: string;
  image?: string | null;
  subcategories: CategoryNode[];
}

export const CategoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    name: z.string(),
    // `image` for the category strip (M09 §7) — served by Django since INT-011.
    image: z.string().nullable().optional(),
    subcategories: z.array(CategoryNodeSchema).optional().default([]),
  }),
);
export const CategoryTreeSchema = z.array(CategoryNodeSchema);

// ── #3 GET /api/v1/catalog/products/ ────────────────────────────────────────────────────
export const PaymentPolicySchema = z.enum(PAYMENT_POLICIES);

/** `category` is the serializer's display value — a name today; an object is tolerated. */
const cardCategory = z
  .union([z.string(), z.number(), z.object({ id: z.number().int(), name: z.string() })])
  .nullable()
  .optional();

export const ProductCardSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  image: z.string().nullable().optional(),
  // External image link (FR-09.09 prefers it when present).
  image_url: z.string().nullable().optional(),
  category: cardCategory,
  display_price: z.string(),
  display_old_price: z.string().nullable().optional(),
  stock: z.coerce.number(),
  is_featured: z.boolean().optional().default(false),
  is_free_shipping: z.boolean().optional().default(false),
  payment_policy: PaymentPolicySchema.optional().default("cod"),
  // Merchant badges on list items (M09 §7) — served by Django since INT-011.
  badges: z.array(z.object({ name: z.string(), color: z.string().optional() })).optional(),
  // Readable URL part after the id (M10 §10) — served by Django since INT-011.
  slug: z.string().nullable().optional(),
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

export const ProductPageSchema = paginated(ProductCardSchema);
export type ProductPage = z.infer<typeof ProductPageSchema>;

/** The query keys of #3 — FR-09.05 keeps exactly these in the URL. */
export const PRODUCT_QUERY_KEYS = [
  "category",
  "brand",
  "tag",
  "collection",
  "search",
  "is_featured",
  "page",
  "page_size",
  "ordering",
] as const;
export type ProductQueryKey = (typeof PRODUCT_QUERY_KEYS)[number];
export type ProductQuery = Partial<Record<ProductQueryKey, string>>;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

// ── #4 GET /api/v1/catalog/products/<id>/ ───────────────────────────────────────────────
export const VARIANT_DISPLAY_STYLES = ["swatches", "dropdown", "radio"] as const;
export const PERSONALIZATION_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "multi_select",
  "date",
  "checkbox",
  "file",
  "image",
] as const;
export type PersonalizationFieldType = (typeof PERSONALIZATION_FIELD_TYPES)[number];

export const VariantOptionSchema = z.object({
  id: z.number().int(),
  value: z.string(),
  image: z.string().nullable().optional(),
  // The swatch colour — DATA, rendered as the one allowed inline style (M10 §11 VII).
  color: z.string().nullable().optional(),
});
export type VariantOption = z.infer<typeof VariantOptionSchema>;

export const VariantAttributeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  field_type: z.string().optional().default("select"),
  is_required: z.boolean().optional().default(true),
  options: z.array(VariantOptionSchema),
});
export type VariantAttribute = z.infer<typeof VariantAttributeSchema>;

export const ProductVariantSchema = z.object({
  id: z.number().int(),
  option_ids: z.array(z.number().int()),
  display_effective_price: z.string(),
  stock: z.coerce.number(),
  sku: z.string().optional().default(""),
  image: z.string().nullable().optional(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const TierPriceSchema = z.object({ min_quantity: z.number().int().positive(), display_price: z.string() });
export type TierPrice = z.infer<typeof TierPriceSchema>;

export const PersonalizationFieldSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  field_type: z.enum(PERSONALIZATION_FIELD_TYPES),
  is_required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().default([]),
  display_price_add: z.string().nullable().optional(),
});
export type PersonalizationField = z.infer<typeof PersonalizationFieldSchema>;

export const COMPAT_OPERATORS = ["equals", "not_equals", "in"] as const;

/** M37 compatibility rule between variant attributes of the components (FR-37.03). */
export const CompatRuleSchema = z.object({
  id: z.number().int(),
  attribute_a_id: z.number().int(),
  attribute_a_name: z.string(),
  operator: z.enum(COMPAT_OPERATORS),
  attribute_b_id: z.number().int().nullable(),
  value: z.string().nullable(),
});
export type CompatRule = z.infer<typeof CompatRuleSchema>;

export const BundleSchema = z.object({
  display_build_fee: z.string().nullable().optional(),
  /** Σ(mandatory × quantity) + build fee — the server's sentence (US-37.1.1). */
  display_total: z.string().nullable().optional(),
  unavailable_component: z.string().nullable().optional(),
  components: z.array(
    z.object({
      product_id: z.number().int(),
      name: z.string(),
      image: z.string().nullable().optional(),
      quantity: z.coerce.number(),
      is_optional: z.boolean().optional().default(false),
      in_stock: z.boolean().optional().default(true),
      display_price: z.string().nullable().optional(),
      choice: z
        .object({ attribute_id: z.number().int(), attribute_name: z.string(), options: z.array(z.object({ id: z.number().int(), value: z.string() })) })
        .nullable()
        .optional(),
    }),
  ),
  rules: z.array(CompatRuleSchema).optional().default([]),
});

export const FormulaSchema = z.object({
  unit: z.string(),
  display_unit_price: z.string(),
  coefficient: z.string(),
  display_fixed_extra: z.string().nullable().optional(),
});

export const ReviewsSummarySchema = z.object({
  average_rating: z.coerce.number(),
  count: z.number().int(),
  rating_distribution: z.record(z.string(), z.number().int()),
});
export type ReviewsSummary = z.infer<typeof ReviewsSummarySchema>;

export const ProductDetailSchema = ProductCardSchema.extend({
  // Ready
  description: z.string().nullable().optional().default(""),
  sizes_list: z.array(z.string()).optional().default([]),
  colors_list: z.array(z.string()).optional().default([]),
  deposit_required: z.union([z.string(), z.number()]).nullable().optional(),
  // M10 §7 extensions, same names as the model fields — served by Django since INT-012.
  display_deposit: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  images: z
    .array(z.object({ url: z.string(), alt: z.string().nullable().optional(), sort_order: z.number().int().optional() }))
    .optional(),
  video_url: z.string().nullable().optional(),
  unit: z.enum(UNITS).optional(),
  min_quantity: z.number().int().nullable().optional(),
  max_quantity: z.number().int().nullable().optional(),
  allow_variable_quantity: z.boolean().optional(),
  low_stock_threshold: z.number().int().nullable().optional(),
  allow_backorder: z.boolean().optional(),
  delivery_duration: z.string().nullable().optional(),
  product_template: z.enum(["standard", "landing_page"]).optional(),
  product_type: z.enum(["physical", "digital", "service"]).optional(),
  variant_display_style: z.enum(VARIANT_DISPLAY_STYLES).optional(),
  attributes: z.array(VariantAttributeSchema).optional(),
  variants: z.array(ProductVariantSchema).optional(),
  tier_prices: z.array(TierPriceSchema).optional(),
  pricing_type: z.enum(["fixed", "formula"]).optional(),
  formula: FormulaSchema.nullable().optional(),
  is_bundle: z.boolean().optional(),
  bundle: BundleSchema.nullable().optional(),
  is_personalizable: z.boolean().optional(),
  personalization_fields: z.array(PersonalizationFieldSchema).optional(),
  refundable_deposit: z.object({ display_amount: z.string(), refund_rule: z.string().nullable(), return_event: z.string().nullable().optional() }).nullable().optional(),
  is_auction: z.boolean().optional(),
  is_bookable: z.boolean().optional(),
  booking_duration_minutes: z.number().int().nullable().optional(),
  category_path: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  brand: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
  related: z
    .object({
      related: z.array(ProductCardSchema).optional().default([]),
      upsell: z.array(ProductCardSchema).optional().default([]),
      cross_sell: z.array(ProductCardSchema).optional().default([]),
    })
    .optional(),
  reviews_summary: ReviewsSummarySchema.nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  // Raw values for JSON-LD ONLY — never rendered (M10 §10, US-10.7.4).
  structured: z
    .object({
      price: z.string(),
      currency: z.string(),
      sku: z.string().nullable().optional(),
      brand: z.string().nullable().optional(),
      availability: z.enum(["InStock", "OutOfStock", "PreOrder"]),
    })
    .optional(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

// ── [NEEDS BACKEND] sub-resources (M09 §7, M10 §7) ──────────────────────────────────────
export const FacetSchema = z.object({ id: z.number().int(), name: z.string(), slug: z.string().optional(), count: z.number().int() });
export const FacetsSchema = z.object({
  brands: z.array(FacetSchema),
  tags: z.array(FacetSchema),
  collections: z.array(FacetSchema),
});
export type Facets = z.infer<typeof FacetsSchema>;

export const OFFER_TYPES = ["discount", "free_shipping", "buy_x_get_y"] as const;
export const OfferSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  offer_type: z.enum(OFFER_TYPES),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  cta_text: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
});
export const OffersSchema = z.array(OfferSchema);
export type Offer = z.infer<typeof OfferSchema>;

export const ReviewSchema = z.object({
  id: z.number().int(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  customer_name: z.string(),
  created_at: z.string(),
  admin_reply: z.string().nullable().optional(),
});
export type Review = z.infer<typeof ReviewSchema>;
export const ReviewsPageSchema = ReviewsSummarySchema.extend({
  next: z.string().nullable().optional(),
  results: z.array(ReviewSchema),
});
export type ReviewsPage = z.infer<typeof ReviewsPageSchema>;

export const AUCTION_STATUSES = ["draft", "active", "ended"] as const;
export const AuctionSchema = z.object({
  status: z.enum(AUCTION_STATUSES),
  display_current_bid: z.string(),
  display_bid_step: z.string(),
  display_buy_now: z.string().nullable().optional(),
  // The next acceptable amount as a decimal string, computed by the server (no local maths).
  next_bid_amount: z.string(),
  display_next_bid: z.string(),
  /** `null` = open until further notice (M37 §8). */
  end_at: z.string().nullable(),
  anti_sniping_seconds: z.number().int(),
  bids_count: z.number().int(),
  /** Only once ended: whether the hidden reserve was reached — never its amount. */
  reserve_met: z.boolean().nullable().optional(),
  // FR-37.06: a public response carrying `reserve` is REJECTED, not silently dropped.
  reserve: z.never().optional(),
});
export type Auction = z.infer<typeof AuctionSchema>;

export const SLOT_STATUSES = ["available", "held", "booked", "cancelled"] as const;
export const SlotsSchema = z.object({
  date: z.string(),
  timezone: z.string().optional(),
  slots: z.array(z.object({ start_datetime: z.string(), end_datetime: z.string(), status: z.enum(SLOT_STATUSES) })),
  next_available_date: z.string().nullable().optional(),
});

/** M26 hold: `POST …/slots/hold/` → the server's `held_until` (the buyer only displays it). */
export const SlotHoldSchema = z.object({ slot_id: z.number().int(), start_datetime: z.string(), held_until: z.string() });
export type SlotHold = z.infer<typeof SlotHoldSchema>;
export type Slots = z.infer<typeof SlotsSchema>;

export const QuoteSchema = z.object({ display_price: z.string() });
export const OkSchema = z.object({ ok: z.boolean().optional(), detail: z.string().optional() }).passthrough();

/** Display name of a card's category, whatever shape the serializer used. */
export function categoryLabel(category: ProductCard["category"]): string | null {
  if (category === null || category === undefined) return null;
  if (typeof category === "string") return category;
  if (typeof category === "number") return null;
  return category.name;
}

/** The image to show on a card: the external link wins (FR-09.09), then the gallery image. */
export function cardImage(p: Pick<ProductCard, "image" | "image_url">): string | null {
  return p.image_url || p.image || null;
}
