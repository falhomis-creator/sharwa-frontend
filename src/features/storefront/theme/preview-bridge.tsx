"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StoreConfig } from "@/features/storefront/schemas/config";
import { StoreAnnouncement } from "@/features/storefront/components/store-announcement";
import { visiblePath } from "@/features/storefront/components/storefront-provider";
import { storeFontStack } from "@/features/storefront/theme/fonts";
import { buildStoreTheme } from "@/features/storefront/theme/tokens";
import { isPreviewMessage, PREVIEW_PING, PREVIEW_QUERY, PREVIEW_READY, type PreviewMessage } from "@/features/design/preview";

/**
 * Live-preview receiver for the theme customizer (M08 FR-08.02). Mounted once in the
 * storefront layout; inert unless the page is framed by the dashboard with `?preview=1`.
 *
 * The dashboard posts the whole ThemeDraft on every change and this component applies it to
 * the REAL M09 page, without a reload and without any network request:
 * - tokens → the same `buildStoreTheme()` the server uses, written as CSS variables on
 *   `[data-store-theme]` and on `<body>` (portaled sheets/dialogs);
 * - the announcement bar → re-rendered here with the draft text/colours/speed/placements
 *   (the server-rendered bar is hidden while a draft is applied);
 * - sections → one generated stylesheet: CSS `order` on the home `<main>` (a flex column)
 *   and `display:none` for inactive, deleted, or `show_on_mobile=false` rows under 768px.
 *   React-owned nodes are never moved or mutated, so streaming and hydration stay intact.
 *   Documented limits of the preview: a section the page has not rendered (new, or newly
 *   activated) is listed in a small «يظهر بمحتواه بعد النشر» notice instead of drawn, and
 *   content edits (titles, items, category) show after «نشر» — order, visibility, theme
 *   and the announcement bar are live.
 */
const STYLE_ID = "sharwa-preview-theme";
const MD = 768;

function isPreviewFrame(): boolean {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get(PREVIEW_QUERY) === "1";
  } catch {
    return false;
  }
}

function applyTheme(msg: PreviewMessage) {
  const root = document.querySelector<HTMLElement>("[data-store-theme]");
  if (!root) return;
  const theme = buildStoreTheme({
    store_name: "",
    theme_preset: msg.theme_preset,
    primary_color: msg.tokens.primary_color,
    secondary_color: msg.tokens.secondary_color,
    background_color: msg.tokens.background_color,
    text_color: msg.tokens.text_color,
    card_border_color: msg.tokens.card_border_color,
    brand_shades: msg.tokens.brand_shades,
    heading_font: msg.fonts.heading,
    body_font: msg.fonts.body,
    design_style: msg.design_style,
    theme_choice: "default",
    enable_announcement_bar: false,
    sections: [],
  } as StoreConfig);
  const vars: Record<string, string> = {
    ...theme.vars,
    "--store-font-heading": storeFontStack(theme.headingFont),
    "--store-font-body": storeFontStack(theme.bodyFont),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = theme.scheme;
  root.dataset.preset = theme.preset;
  root.dataset.style = theme.style;
  root.dataset.density = theme.density;
  root.dataset.scheme = theme.scheme;

  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  tag.textContent =
    `html body{${body};font-family:var(--store-font-body);color-scheme:${theme.scheme};background-color:var(--background);color:var(--foreground)}` +
    `[data-store-theme]>[data-testid=store-announcement]{display:none!important}` +
    sectionsCss(msg);
}

/**
 * Section order/visibility as ONE stylesheet: React-owned nodes (some still streaming or
 * hydrating) are never touched, so there is no hydration mismatch and late nodes match too.
 */
function sectionsCss(msg: PreviewMessage): string {
  const sel = (id: number) => `main[data-testid=store-home]>[data-section-id="${id}"]`;
  const rules = ["main[data-testid=store-home]{display:flex;flex-direction:column}"];
  const mobile: string[] = [];
  msg.sections.forEach((row, i) => {
    rules.push(`${sel(row.id)}{order:${i}}`);
    if (!row.is_active) rules.push(`${sel(row.id)}{display:none!important}`);
    else if (row.show_on_mobile) mobile.push(`${sel(row.id)}{display:block!important}`);
    else mobile.push(`${sel(row.id)}{display:none!important}`);
  });
  // A rendered section the draft deleted.
  const known = msg.sections.map((r) => `:not([data-section-id="${r.id}"])`).join("");
  rules.push(`main[data-testid=store-home]>[data-section-id]${known}{display:none!important}`);
  return `${rules.join("")}@media (max-width:${MD - 0.02}px){${mobile.join("")}}`;
}

function renderedSectionIds(): Set<number> {
  return new Set(Array.from(document.querySelectorAll<HTMLElement>("main[data-testid=store-home] > [data-section-id]")).map((n) => Number(n.dataset.sectionId)));
}

export function PreviewBridge() {
  const [draft, setDraft] = useState<PreviewMessage | null>(null);
  const [rendered, setRendered] = useState<Set<number>>(() => new Set());
  const [narrow, setNarrow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isPreviewFrame()) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      if ((e.data as { type?: unknown } | null)?.type === PREVIEW_PING) {
        window.parent.postMessage({ type: PREVIEW_READY }, "*");
        return;
      }
      if (!isPreviewMessage(e.data)) return;
      applyTheme(e.data);
      setDraft(e.data);
      setRendered(renderedSectionIds());
      setNarrow(window.innerWidth < MD);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, "*");
    // Streamed sections arrive later; the notice of not-yet-rendered sections follows the DOM.
    const mo = new MutationObserver(() => {
      const next = renderedSectionIds();
      setRendered((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const onResize = () => setNarrow(window.innerWidth < MD);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
    };
  }, []);

  if (!draft) return null;
  const a = draft.announcement;
  const onHome = visiblePath(pathname) === "/";
  const pending = onHome ? draft.sections.filter((r) => r.is_active && (!narrow || r.show_on_mobile) && !rendered.has(r.id)) : [];
  return (
    <>
      {a.enabled && a.text.trim() ? (
        <div data-preview-announcement>
          <StoreAnnouncement
            config={{
              text: a.text,
              background: a.background,
              color: a.color,
              speed: a.speed,
              onHome: a.onHome,
              onProducts: a.onProducts,
              onProductDetail: a.onProductDetail,
              onCheckout: a.onCheckout,
            }}
          />
        </div>
      ) : null}
      {pending.length && rendered.size > 0
        ? createPortal(
            <div role="status" data-preview-pending className="fixed inset-x-3 bottom-3 z-50 rounded-[var(--radius)] border border-dashed border-border bg-background p-3 text-sm text-muted-foreground md:inset-x-auto md:start-3 md:max-w-sm">
              يظهر بمحتواه بعد النشر: {pending.map((r) => r.label || r.title || "قسم جديد").join("، ")}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
