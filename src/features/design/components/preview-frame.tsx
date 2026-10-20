"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/shared/mono";
import { contrast } from "@/lib/color";
import { cn } from "@/lib/utils";
import { useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { useEditorParams } from "@/features/design/components/editor-links";
import { PREVIEW_MESSAGE, PREVIEW_PING, PREVIEW_READY, previewShades, type PreviewMessage } from "@/features/design/preview";
import { COLOR_TOKENS, DEVICE_WIDTH, HEX_RE, type DraftSection } from "@/features/design/schemas";
import { useDesignStore } from "@/features/design/store";

/**
 * The centre preview (FR-08.02): the REAL storefront (`<store origin>/?preview=1`) in an
 * iframe inside a 1px window frame. Every draft change is posted to it (`sharwa:theme`) and
 * applied by the storefront bridge without a reload (SC-08.1). The device switch only
 * changes the frame width (390 / 1280, scaled to fit, 200ms) — no reload either.
 *
 * Load failure (503 while provisioning, network): the bridge never says «ready», so after a
 * timeout the frame shows a message with «إعادة المحاولة» while the panel stays editable.
 */
const READY_TIMEOUT = 12_000;

function titleOf(s: DraftSection): string | null {
  const v = s.section_type === "product_grid" || s.section_type === "hero" ? s.content_data.title : s.settings.title;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function usePreviewMessage(): PreviewMessage | null {
  const theme = useDesignStore((s) => s.theme);
  const base = useDesignStore((s) => s.base);
  const sections = useDesignStore((s) => s.sections);
  const a = useDesignStore((s) => s.announcement);
  return useMemo(() => {
    if (!base) return null;
    // A half-typed hex never reaches the store: the last published value stands in.
    const color = (k: (typeof COLOR_TOKENS)[number]) => (HEX_RE.test(theme[k]) ? theme[k] : base.theme[k]);
    const primary = color("primary_color");
    return {
      type: PREVIEW_MESSAGE,
      theme_preset: theme.theme_preset,
      tokens: {
        primary_color: primary,
        secondary_color: color("secondary_color"),
        background_color: color("background_color"),
        text_color: color("text_color"),
        card_border_color: color("card_border_color"),
        brand_shades: previewShades(primary),
      },
      fonts: { heading: theme.heading_font, body: theme.body_font },
      design_style: theme.design_style,
      sections: sections.map((s) => ({
        id: s.id,
        section_type: s.section_type,
        label: s.label,
        is_active: s.is_active,
        show_on_mobile: s.settings.show_on_mobile !== false,
        title: titleOf(s),
      })),
      announcement: {
        enabled: a.enable_announcement_bar,
        text: a.announcement_text,
        background: HEX_RE.test(a.announcement_bg_color) ? a.announcement_bg_color : base.announcement.announcement_bg_color,
        color: HEX_RE.test(a.announcement_text_color) ? a.announcement_text_color : base.announcement.announcement_text_color,
        speed: a.announcement_scroll_speed,
        onHome: a.show_banner_on_home,
        onProducts: a.show_banner_on_products,
        onProductDetail: a.show_banner_on_product_detail,
        onCheckout: a.show_banner_on_checkout,
      },
    };
  }, [a, base, sections, theme]);
}

const MD = "(min-width: 768px)";
const subscribeMq = (cb: () => void) => {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
function useIsWide() {
  return useSyncExternalStore(subscribeMq, () => window.matchMedia(MD).matches, () => true);
}

export function PreviewFrame({ reloadKey }: { reloadKey: number }) {
  const origin = useStoreOrigin();
  const [{ device }] = useEditorParams();
  const wide = useIsWide();
  const message = usePreviewMessage();
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [state, setState] = useState<{ key: string; phase: "loading" | "ready" | "error" }>({ key: "", phase: "loading" });
  const [retry, setRetry] = useState(0);
  const frameKey = `${reloadKey}:${retry}`;
  const phase = state.key === frameKey ? state.phase : "loading";
  const latest = useRef(message);
  const src = `${origin}/?preview=1`;
  const target = useMemo(() => {
    try {
      return new URL(origin).origin;
    } catch {
      return "*";
    }
  }, [origin]);

  useEffect(() => {
    latest.current = message;
    if (message && phase === "ready") frame.current?.contentWindow?.postMessage(message, target);
  }, [message, phase, target]);

  // The bridge announces itself; the current draft is sent right away (and after every in-frame navigation).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || (e.data as { type?: string })?.type !== PREVIEW_READY) return;
      setState({ key: frameKey, phase: "ready" });
      if (latest.current) frame.current?.contentWindow?.postMessage(latest.current, target);
    };
    window.addEventListener("message", onMessage);
    // The SSR'd frame may have loaded (and said «ready») before this listener existed.
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_PING }, target);
    return () => window.removeEventListener("message", onMessage);
  }, [frameKey, target]);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = window.setTimeout(() => setState({ key: frameKey, phase: "error" }), READY_TIMEOUT);
    return () => window.clearTimeout(t);
  }, [phase, frameKey]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect;
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Phones: the preview fills the screen. Wider: the chosen device width, scaled to fit.
  const deviceWidth = wide ? DEVICE_WIDTH[device] : Math.max(size.w, 320);
  const scale = size.w > 0 ? Math.min(1, size.w / deviceWidth) : 1;
  const lowContrast = message ? contrast(message.tokens.text_color, message.tokens.background_color) < 4.5 : false;
  let host = origin;
  try {
    host = new URL(origin).host;
  } catch {
    // keep the raw origin
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/40 p-0 md:p-4" data-testid="preview">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-border bg-card md:rounded-lg md:border">
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3 text-xs text-muted-foreground">
          <Mono className="truncate" data-testid="preview-host">
            {host}/
          </Mono>
          <span className="flex shrink-0 items-center gap-3">
            {lowContrast ? (
              <span className="flex items-center gap-1.5 text-warning" data-testid="low-contrast-badge">
                <span aria-hidden className="size-1.5 rounded-full bg-warning" />
                تباين منخفض
              </span>
            ) : null}
            <span>
              {wide ? (device === "mobile" ? "جوال" : "سطح المكتب") : "جوال"} · <Mono>{Math.round(deviceWidth)}px</Mono>
            </span>
          </span>
        </div>
        <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 flex justify-center">
            <div className="relative h-full overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none" style={{ width: Math.round(deviceWidth * scale) }}>
              <iframe
                key={frameKey}
                ref={frame}
                src={src}
                title="معاينة المتجر"
                data-testid="preview-iframe"
                data-device={wide ? device : "mobile"}
                data-phase={phase}
              onLoad={() => frame.current?.contentWindow?.postMessage({ type: PREVIEW_PING }, target)}
                // The dashboard is RTL: the frame is anchored at the inline start (right) and scaled from there.
                style={{ width: deviceWidth, height: scale > 0 ? size.h / scale : size.h, transform: `scale(${scale})`, transformOrigin: "top right" }}
                className={cn(
                  "absolute top-0 start-0 border-0 bg-card transition-[width,transform] duration-200 ease-out motion-reduce:transition-none",
                  wide && device === "mobile" && "border-x border-border",
                )}
              />
            </div>
          </div>
          {phase === "loading" ? (
            <div className="absolute inset-0 flex flex-col gap-3 bg-card p-6" aria-hidden data-testid="preview-loading">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-2/3" />
            </div>
          ) : null}
          {phase === "error" ? (
            <div role="alert" className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-card p-6" data-testid="preview-error">
              <p className="text-base font-medium">تعذّر تحميل المعاينة</p>
              <p className="max-w-prose text-sm text-muted-foreground">قد يكون المتجر قيد التجهيز أو الشبكة متقطعة. تعديلاتك في اللوحة محفوظة في المسودة.</p>
              <Button variant="outline" className="h-11 md:h-9" onClick={() => setRetry((n) => n + 1)}>
                إعادة المحاولة
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
