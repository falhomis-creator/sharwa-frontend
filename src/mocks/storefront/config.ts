import type { StoreConfig } from "@/lib/schemas/store-config";
import { readSettings } from "@/mocks/settings/state";
import { tenantFixture } from "@/mocks/tenant/config";

/**
 * The storefront's `/api/v1/config/` fixture: the tenant fixture (identity, theme, sections)
 * plus every `[NEEDS BACKEND]` `StoreSetting` field M09 §7 asks Django to export, read from
 * the SAME settings row the M34 hub edits — so a merchant's change in «الإعدادات» shows on
 * the store on the next render (SC-09.2; the cached reads are invalidated by `mockRoute`).
 */
export function storefrontConfig(store: string | null, storeHost: string): StoreConfig | undefined {
  const fixture = tenantFixture(store);
  if (fixture?.outcome !== "ok" || !fixture.config) return undefined;
  const s = readSettings(store, storeHost);
  const full = store === "noor";
  return {
    ...fixture.config,
    store_name: s.store_name || fixture.config.store_name,
    whatsapp_number: s.whatsapp_number || null,
    announcement_text: s.announcement_text || null,
    enable_announcement_bar: s.enable_announcement_bar,
    announcement_bg_color: s.announcement_bg_color,
    announcement_text_color: s.announcement_text_color,
    announcement_scroll_speed: s.announcement_scroll_speed,
    show_banner_on_home: s.show_banner_on_home,
    show_banner_on_products: s.show_banner_on_products,
    show_banner_on_product_detail: s.show_banner_on_product_detail,
    show_banner_on_checkout: s.show_banner_on_checkout,
    free_shipping_threshold: s.free_shipping_threshold,
    currency: s.currency,
    seo_title: s.seo_title || null,
    seo_description: s.seo_description || null,
    seo_keywords: s.seo_keywords || null,
    seo_og_image: s.seo_og_image,
    contact_email: s.contact_email || null,
    facebook_link: s.facebook_link || null,
    instagram_link: s.instagram_link || null,
    tiktok_link: s.tiktok_link || null,
    snapchat_link: s.snapchat_link || null,
    about_us: s.about_us || null,
    return_policy: s.return_policy || null,
    timezone: s.timezone,
    week_start_day: s.week_start_day,
    gifting_enabled: full,
    loyalty_enabled: full,
  };
}
