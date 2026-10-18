import { z } from "zod";

/**
 * `GET /api/v1/search/?q=&types=&limit=5` (M48 §7 — `[NEEDS BACKEND]`). Groups are trimmed
 * by the session's permissions on the server too; `pages`/`actions` are optional and may be
 * empty — the palette's own index (navigation.ts) is the primary source for those.
 */
export const searchResultSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.number().int(),
        customer_name: z.string(),
        customer_phone: z.string(),
        display_total: z.string(),
        status: z.string(),
        fulfillment_status: z.object({ name: z.string(), color: z.string() }).nullable(),
        created_at: z.string(),
      }),
    )
    .default([]),
  products: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        name_en: z.string(),
        sku: z.string(),
        image: z.string().nullable(),
        display_price: z.string(),
        stock: z.string(),
      }),
    )
    .default([]),
  customers: z.array(z.object({ phone: z.string(), name: z.string(), orders_count: z.number().int() })).default([]),
  pages: z.array(z.object({ key: z.string(), title: z.string(), path: z.string() })).default([]),
  actions: z.array(z.object({ key: z.string(), title: z.string() })).default([]),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
