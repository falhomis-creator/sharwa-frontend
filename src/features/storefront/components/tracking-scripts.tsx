"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { StoreConfig } from "@/features/storefront/schemas/config";

/**
 * The merchant's tracking tools on the storefront (M19 US-19.2, INT-023) — the same five
 * snippets Django injects from `products/templates/products/partials/_tracking_scripts.html`
 * (GTM, Meta Pixel, TikTok Pixel, Snapchat Pixel, gtag for GA4 + Google Ads), fed by
 * `config.tracking` from `GET /api/v1/config/`.
 *
 * - Django sends `tracking: null` when the master switch is off or the plan lacks
 *   `tracking_tools`, and only the filled ids otherwise — so nothing loads for an empty id.
 * - Ids are validated server-side (no whitespace or `<>"'`); they are still embedded with
 *   `JSON.stringify` so a value can never break out of the inline script.
 * - The storefront is a client-routed app: Meta/TikTok/Snapchat only see the first page load
 *   from their snippet, so every later pathname change sends their page-view event here.
 *   GA4 (enhanced measurement) and GTM (history trigger) follow history changes themselves.
 * - Inert inside the dashboard's theme preview frame (`?preview=1`) — the merchant editing
 *   colours must not inflate their own audiences.
 */
type Tracking = NonNullable<StoreConfig["tracking"]>;

type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  ttq?: { page: () => void };
  snaptr?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

function inPreviewFrame(): boolean {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get("preview") === "1";
  } catch {
    return false;
  }
}

const q = (value: string) => JSON.stringify(value);
const noopSubscribe = () => () => {};
/** False on the server and in the preview frame; true in a real visitor's browser. */
const useLiveVisitor = () => useSyncExternalStore(noopSubscribe, () => !inPreviewFrame(), () => false);

export function TrackingScripts({ tracking }: { tracking: StoreConfig["tracking"] }) {
  const t: Tracking = tracking ?? {};
  const pathname = usePathname();
  const first = useRef(true);
  const live = useLiveVisitor();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const w = window as PixelWindow;
    try {
      w.fbq?.("track", "PageView");
      w.ttq?.page();
      w.snaptr?.("track", "PAGE_VIEW");
    } catch {
      // A blocked or half-loaded pixel never breaks navigation.
    }
  }, [pathname]);

  if (!tracking || !live) return null;

  const gtagId = t.ga4_measurement_id || t.google_ads_conversion_id;
  return (
    <>
      {t.gtm_container_id ? (
        <Script id="sharwa-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${q(t.gtm_container_id)});`}
        </Script>
      ) : null}
      {t.meta_pixel_id ? (
        <Script id="sharwa-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${q(t.meta_pixel_id)});fbq('track','PageView');`}
        </Script>
      ) : null}
      {t.tiktok_pixel_id ? (
        <Script id="sharwa-tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(${q(t.tiktok_pixel_id)});ttq.page();}(window,document,'ttq');`}
        </Script>
      ) : null}
      {t.snapchat_pixel_id ? (
        <Script id="sharwa-snap-pixel" strategy="afterInteractive">
          {`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script',r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u)})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init',${q(t.snapchat_pixel_id)});snaptr('track','PAGE_VIEW');`}
        </Script>
      ) : null}
      {gtagId ? (
        <>
          <Script id="sharwa-gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`} strategy="afterInteractive" />
          <Script id="sharwa-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${
              t.ga4_measurement_id ? `gtag('config',${q(t.ga4_measurement_id)});` : ""
            }${t.google_ads_conversion_id ? `gtag('config',${q(t.google_ads_conversion_id)});` : ""}`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/**
 * Google Ads purchase conversion on the order-success page (Django: `is_order_success` in
 * the same partial). Sent once per order — a reload of the success page does not count twice.
 */
export function AdsConversion({ tracking, orderId }: { tracking: StoreConfig["tracking"]; orderId: string }) {
  const id = tracking?.google_ads_conversion_id;
  const label = tracking?.google_ads_conversion_label;

  useEffect(() => {
    if (!id || !label || inPreviewFrame()) return;
    const key = `sharwa:ads-conversion:${orderId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
    } catch {
      // storage unavailable — send anyway
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      const gtag = (window as PixelWindow).gtag;
      tries += 1;
      if (gtag) {
        gtag("event", "conversion", { send_to: `${id}/${label}`, transaction_id: orderId });
        try {
          window.sessionStorage.setItem(key, "1");
        } catch {
          // ignore
        }
      }
      if (gtag || tries >= 20) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [id, label, orderId]);

  return null;
}
