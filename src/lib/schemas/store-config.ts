import { z } from "zod";
import { currencySchema } from "./money";

/** `GET /api/v1/config/` — Ready fields are required; `[NEEDS BACKEND]` extensions are optional. */
export const sectionTypeSchema = z.enum([
  "hero",
  "category_strip",
  "featured_products",
  "latest_products",
  "slider",
  "banner_grid",
  "product_grid",
  "promotional_offers",
]);
export type SectionType = z.infer<typeof sectionTypeSchema>;

export const storeSectionSchema = z.object({
  id: z.number().int(),
  section_type: sectionTypeSchema,
  label: z.string().optional().default(""),
  order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  content_data: z.record(z.string(), z.unknown()).optional().default({}),
});
export type StoreSection = z.infer<typeof storeSectionSchema>;

export const brandShadesSchema = z.record(z.string(), z.string());

export const storeConfigSchema = z.object({
  // Ready
  store_name: z.string(),
  primary_color: z.string(),
  secondary_color: z.string(),
  background_color: z.string(),
  text_color: z.string(),
  heading_font: z.string(),
  body_font: z.string(),
  design_style: z.string(),
  theme_preset: z.string(),
  brand_shades: brandShadesSchema.optional().default({}),
  theme_choice: z.string().optional().default("default"),
  logo: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  announcement_text: z.string().nullable().optional(),
  enable_announcement_bar: z.boolean().optional().default(false),
  sections: z.array(storeSectionSchema).optional().default([]),
  // [NEEDS BACKEND] extensions (M09/M11/M12/M19/M26)
  card_border_color: z.string().optional(),
  announcement_bg_color: z.string().optional(),
  announcement_text_color: z.string().optional(),
  announcement_scroll_speed: z.enum(["slow", "medium", "fast"]).optional(),
  show_banner_on_home: z.boolean().optional(),
  show_banner_on_products: z.boolean().optional(),
  show_banner_on_product_detail: z.boolean().optional(),
  show_banner_on_checkout: z.boolean().optional(),
  free_shipping_threshold: z.string().nullable().optional(),
  currency: currencySchema.optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
  seo_og_image: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  facebook_link: z.string().nullable().optional(),
  instagram_link: z.string().nullable().optional(),
  tiktok_link: z.string().nullable().optional(),
  snapchat_link: z.string().nullable().optional(),
  about_us: z.string().nullable().optional(),
  timezone: z.string().optional(),
  week_start_day: z.enum(["sunday", "monday"]).optional(),
  gifting_enabled: z.boolean().optional(),
  loyalty_enabled: z.boolean().optional(),
  tracking: z
    .object({
      meta_pixel_id: z.string().nullable().optional(),
      tiktok_pixel_id: z.string().nullable().optional(),
      snapchat_pixel_id: z.string().nullable().optional(),
      gtm_container_id: z.string().nullable().optional(),
      ga4_measurement_id: z.string().nullable().optional(),
    })
    .optional(),
});
export type StoreConfig = z.infer<typeof storeConfigSchema>;
