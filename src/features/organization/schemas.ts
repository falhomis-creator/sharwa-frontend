import { z } from "zod";

/**
 * M05 data contracts (data-model §4 «Organization», discovery 02 §2). Every write row is
 * `[NEEDS BACKEND]` (contracts/needs-backend-inventory.md §M05); the shapes below are the
 * PROPOSED `/api/v1/{categories,brands,tags,collections,badges}/` payloads, served today
 * by `/api/bff/*` from `src/mocks/organization/*`.
 *
 * Field limits are the model's own: Category.name 100, Tag.name 60, ProductBadge.name 50,
 * SEO mixin 70/160/255 (discovery 02 §1).
 */
export const SEO_LIMITS = { meta_title: 70, meta_description: 160, meta_keywords: 255 } as const;
export const CATEGORY_NAME_MAX = 100;
export const TAG_NAME_MAX = 60;
export const BADGE_NAME_MAX = 50;
/** `ProductBadge.color` default (discovery 02 §2). Data, not styling. */
export const BADGE_DEFAULT_COLOR = "#64748b";
/** IMAGE_EXTENSIONS (discovery 01 §2.4). */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;
export const IMAGE_EXTENSIONS_MESSAGE = "الصيغ المسموحة: jpg, jpeg, png, webp, gif";
/** Path separator exactly as the backend renders it («إلكترونيات ⟵ هواتف»). */
export const PATH_SEPARATOR = " ⟵ ";

const seoFields = {
  meta_title: z.string().max(SEO_LIMITS.meta_title).default(""),
  meta_description: z.string().max(SEO_LIMITS.meta_description).default(""),
  meta_keywords: z.string().max(SEO_LIMITS.meta_keywords).default(""),
  og_image: z.string().nullable().default(null),
};

// ── Category ──────────────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  parent_id: z.number().int().nullable(),
  /** [NEEDS BACKEND] proposed — the model has no explicit order today (M05 §10). */
  sort_order: z.number().int(),
  image: z.string().nullable(),
  products_count: z.number().int(),
  ...seoFields,
});
export type Category = z.infer<typeof categorySchema>;
export const categoryListSchema = z.array(categorySchema);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم التصنيف.").max(CATEGORY_NAME_MAX, `الاسم ${CATEGORY_NAME_MAX} حرفاً على الأكثر.`),
  parent_id: z.number().int().nullable(),
  image: z.string().nullable(),
  meta_title: z.string().max(SEO_LIMITS.meta_title, `العنوان ${SEO_LIMITS.meta_title} حرفاً على الأكثر.`),
  meta_description: z
    .string()
    .max(SEO_LIMITS.meta_description, `الوصف ${SEO_LIMITS.meta_description} حرفاً على الأكثر.`),
  meta_keywords: z.string().max(SEO_LIMITS.meta_keywords, `الكلمات ${SEO_LIMITS.meta_keywords} حرفاً على الأكثر.`),
  og_image: z.string().nullable(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const reorderMovesSchema = z.object({
  moves: z.array(z.object({ id: z.number().int(), parent_id: z.number().int().nullable(), sort_order: z.number().int() })),
});
export type ReorderMoves = z.infer<typeof reorderMovesSchema>;

// ── Brand ─────────────────────────────────────────────────────────────────────────────
export const brandSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  products_count: z.number().int(),
});
export type Brand = z.infer<typeof brandSchema>;
export const brandListSchema = z.array(brandSchema);

// ── Tag ───────────────────────────────────────────────────────────────────────────────
export const tagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  products_count: z.number().int(),
  /** [NEEDS BACKEND] derived — drives «غير مستخدم» (US-05.4.2). */
  last_used_at: z.string().nullable(),
});
export type Tag = z.infer<typeof tagSchema>;
export const tagListSchema = z.array(tagSchema);

// ── Collection ────────────────────────────────────────────────────────────────────────
export const collectionProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  image: z.string().nullable(),
  display_price: z.string(),
  is_archived: z.boolean(),
});
export type CollectionProduct = z.infer<typeof collectionProductSchema>;

export const collectionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  products_count: z.number().int(),
});
export type Collection = z.infer<typeof collectionSchema>;
export const collectionListSchema = z.array(collectionSchema);

export const collectionDetailSchema = collectionSchema.extend({
  products: z.array(collectionProductSchema),
});
export type CollectionDetail = z.infer<typeof collectionDetailSchema>;

// ── Badge ─────────────────────────────────────────────────────────────────────────────
export const badgeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** Hex as stored by Django; rendered as data (swatch/dot), never as a class. */
  color: z.string(),
  products_count: z.number().int(),
});
export type Badge = z.infer<typeof badgeSchema>;
export const badgeListSchema = z.array(badgeSchema);

/** The three computed badges (discovery 02 §2 `active_badges`) — read-only, never deletable. */
export const DYNAMIC_BADGES = [
  { key: "out_of_stock", name: "نفدت الكمية", color: "#dc2626", rule: "حين يصل المخزون إلى صفر." },
  { key: "on_sale", name: "تخفيض", color: "#16a34a", rule: "حين يكون السعر القديم أعلى من السعر الحالي ضمن نافذة التخفيض." },
  { key: "new_arrival", name: "وصل حديثاً", color: "#0ea5e9", rule: "خلال 7 أيام من إنشاء المنتج." },
] as const;

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────────────
/** «إلكترونيات ⟵ هواتف» for a category id, walking `parent_id`. */
export function categoryPath(id: number | null, byId: Map<number, Category>): string {
  const parts: string[] = [];
  const seen = new Set<number>();
  let cur = id === null ? undefined : byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent_id === null ? undefined : byId.get(cur.parent_id);
  }
  return parts.join(PATH_SEPARATOR);
}

export function hasImageExtension(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/** WCAG relative-luminance contrast of white text on `hex` (US-05.6.3). */
export function contrastWithWhite(hex: string): number {
  if (!HEX_RE.test(hex)) return 21;
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (l + 0.05);
}

/** Latin slug suggestion; Arabic-only names fall back to the server's suggestion. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
