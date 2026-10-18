import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { MockIndicator } from "@/components/shared/mock-indicator";
import { SkipLink } from "@/components/shared/visually-hidden";
import { probeStore } from "@/features/tenant/api/probe";
import { platformOrigin } from "@/features/tenant/origin";
import { requestIdentity } from "@/features/tenant/request";
import { TENANT_ERROR_PATH } from "@/features/tenant/schemas";
import { getCategories } from "@/features/storefront/api/catalog";
import { getStoreConfig } from "@/features/storefront/api/config";
import { asCurrency } from "@/features/storefront/api/context";
import { CURRENCY_COOKIE } from "@/features/storefront/currency";
import { StoreThemeRoot } from "@/features/storefront/theme/apply-theme";
import { PreviewBridge } from "@/features/storefront/theme/preview-bridge";
import { buildStoreTheme } from "@/features/storefront/theme/tokens";
import { StoreAnnouncement } from "@/features/storefront/components/store-announcement";
import { StoreFooter } from "@/features/storefront/components/store-footer";
import { StoreHeader } from "@/features/storefront/components/store-header";
import { StorefrontChrome } from "@/features/storefront/components/storefront-chrome";
import { StorefrontProvider } from "@/features/storefront/components/storefront-provider";

/**
 * Storefront group root — the single place a store-origin page is admitted (M47 T052) and,
 * since Phase 4, the store's chrome (M09): the merchant's theme on the root element, the
 * announcement line, the header, the footer, the bottom bar and the cart.
 *
 * The URL segment is `_s/<store>`: an internal prefix the proxy writes and the network
 * cannot reach (SC-47.6). The folder is `%5Fs` because Next treats a literal `_folder` as a
 * PRIVATE folder and excludes it from routing — `%5F` is the documented escape.
 *
 * The probe is awaited in the layout body with NO `<Suspense>` above it. Any boundary at or
 * above this layout lets Next flush a static shell with a 200 before the probe resolves, so
 * an unknown or suspended store would answer 200 and then redirect from the client — the
 * contract requires a real 404/403/503 (FR-47.07/08). Without a boundary the status is real.
 *
 * The store slug is read from the proxy header rather than from `params` (Next's typegen
 * resolves this segment's `params` to `unknown` because of the `%5F` escape).
 */
export const instant = false;

/** Per-store defaults every page inherits: title template, manifest, generated icons (M44). */
export async function generateMetadata(): Promise<Metadata> {
  const identity = await requestIdentity();
  const config = await getStoreConfig(identity.store, identity.storeHost).catch(() => null);
  const name = config?.store_name ?? identity.store;
  return {
    title: { default: name, template: `%s — ${name}` },
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icon?size=192", sizes: "192x192", type: "image/png" }], apple: "/icon?size=192" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    openGraph: { siteName: name, locale: "ar_SA", type: "website" },
  };
}

/** The browser chrome takes the merchant's colour (M44 `theme_color`). */
export async function generateViewport(): Promise<Viewport> {
  const identity = await requestIdentity();
  const config = await getStoreConfig(identity.store, identity.storeHost).catch(() => null);
  return { themeColor: config ? buildStoreTheme(config).meta.primary : undefined };
}

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  // Request-time by definition, like the dashboard and onboarding groups: the probe below is
  // an uncached fetch, and without this Next's dev staged render can observe its completion
  // (undici stamps `Date.now()` on the response) inside a prefetch stage and report it.
  await connection();
  const [cookieStore, identity] = await Promise.all([cookies(), requestIdentity()]);
  const store = identity.store;
  const cookie = cookieStore.toString();

  const probe = await probeStore({ store, storeHost: identity.storeHost, cookie: cookie || null });

  switch (probe.outcome) {
    case "not_found":
      // `/_tenant/not-found` rather than `notFound()`: the proxy stamps a real 404 on that
      // rewrite, while `notFound()` renders through the (prerenderable) route and answers
      // 200 in production. `not-found.tsx` stays for in-store 404s (a missing product).
      redirect(TENANT_ERROR_PATH.not_found);
    case "inactive":
      redirect(TENANT_ERROR_PATH.inactive);
    case "provisioning":
      redirect(TENANT_ERROR_PATH.provisioning);
    case "session_bound_elsewhere":
      // Clear the foreign session once, then come back (US-47.2.3). The breadcrumb the
      // reset route leaves stops this from becoming a loop.
      if (!cookieStore.has("sharwa_session_reset")) {
        redirect("/api/bff/public/reset-store-session?next=/");
      }
      if (!probe.config) redirect(TENANT_ERROR_PATH.inactive);
      break;
    case "ok":
      break;
  }

  // Content reads are cached per store (R-02); the probe above stays the status authority.
  const [config, categories] = await Promise.all([
    getStoreConfig(store, identity.storeHost).catch(() => probe.config!),
    getCategories(store, identity.storeHost).catch(() => []),
  ]);
  const currency = asCurrency(cookieStore.get(CURRENCY_COOKIE)?.value) ?? config.currency ?? "SAR";
  const social = [
    { label: "فيسبوك", href: config.facebook_link },
    { label: "إنستغرام", href: config.instagram_link },
    { label: "تيك توك", href: config.tiktok_link },
    { label: "سناب شات", href: config.snapchat_link },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <QueryProvider>
      <StorefrontProvider
        value={{
          store,
          storeName: config.store_name,
          currency,
          whatsapp: config.whatsapp_number ?? null,
          freeShippingConfigured: Boolean(config.free_shipping_threshold && Number(config.free_shipping_threshold) > 0),
          giftingEnabled: config.gifting_enabled ?? false,
          loyaltyEnabled: config.loyalty_enabled ?? false,
          timezone: config.timezone ?? "Asia/Aden",
        }}
      >
        <StoreThemeRoot config={config} store={store}>
          <SkipLink />
          <PreviewBridge />
          {config.enable_announcement_bar && config.announcement_text ? (
            <StoreAnnouncement
              config={{
                text: config.announcement_text,
                background: config.announcement_bg_color ?? "var(--foreground)",
                color: config.announcement_text_color ?? "var(--background)",
                speed: config.announcement_scroll_speed ?? "medium",
                // Until Django exports the flags, the bar shows on the home page only (US-09.6.2).
                onHome: config.show_banner_on_home ?? true,
                onProducts: config.show_banner_on_products ?? false,
                onProductDetail: config.show_banner_on_product_detail ?? false,
                onCheckout: config.show_banner_on_checkout ?? false,
              }}
            />
          ) : null}
          <StoreHeader config={config} categories={categories} />
          {children}
          <StoreFooter
            info={{
              storeName: config.store_name,
              about: Boolean(config.about_us),
              returnPolicy: Boolean(config.return_policy),
              whatsapp: config.whatsapp_number ?? null,
              email: config.contact_email ?? null,
              social,
              platformUrl: platformOrigin(),
            }}
          />
          <StorefrontChrome categories={categories} whatsapp={config.whatsapp_number ?? null} storeName={config.store_name} />
          {process.env.NODE_ENV === "production" ? null : <MockIndicator initial={probe.isMock} />}
        </StoreThemeRoot>
      </StorefrontProvider>
    </QueryProvider>
  );
}
