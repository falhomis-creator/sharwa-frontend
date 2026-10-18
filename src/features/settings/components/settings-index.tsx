"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { prettyPhone } from "@/lib/format";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { CURRENCY_LABELS, SCROLL_SPEED_LABELS, SECTION_META, WEEK_START_LABELS, type SettingsSection, type StoreSettings } from "@/features/settings/schemas";
import { useSettings } from "@/features/settings/api";

/**
 * `/dashboard/settings` — the hub index (T084 «فهرس بطاقات نصية غير متماثلة»): two groups
 * of text rows, each section with what it holds NOW, so most questions («ما عملة المتجر؟»)
 * are answered without opening anything. Money/structure sections sit in their own group
 * behind the thin red rule — no icon tiles, no equal cards (constitution I).
 */
function summary(key: SettingsSection, s: StoreSettings) {
  switch (key) {
    case "identity":
      return (
        <>
          {s.store_name} · <Mono dir="ltr">{s.timezone}</Mono> · الأسبوع يبدأ {WEEK_START_LABELS[s.week_start_day]}
        </>
      );
    case "contact":
      return s.whatsapp_number ? (
        <>
          واتساب <Mono dir="ltr">{prettyPhone(s.whatsapp_number)}</Mono>
          {s.contact_email ? (
            <>
              {" "}
              · <Mono dir="ltr">{s.contact_email}</Mono>
            </>
          ) : null}
        </>
      ) : (
        <span className="text-warning">بلا رقم واتساب — زر واتساب مخفي في المتجر</span>
      );
    case "policies":
      return s.return_policy.trim() ? `سياسة الاسترجاع: ${s.return_policy.replace(/^##\s*/gm, "").split("\n").filter(Boolean)[1] ?? "مكتوبة"}` : "لا سياسة استرجاع بعد";
    case "shipping":
      return (
        <>
          توصيل <Money value={s.display_default_delivery_fee} /> · مجاني فوق <Money value={s.display_free_shipping_threshold} />
        </>
      );
    case "currency":
      return (
        <>
          العرض بـ{CURRENCY_LABELS[s.currency]} · <Mono dir="ltr">1 USD = {s.usd_to_sar} SAR</Mono>
        </>
      );
    case "seo":
      return s.seo_title ? s.seo_title : <span className="text-warning">بلا عنوان SEO</span>;
    case "announcement":
      return s.enable_announcement_bar ? (
        <>
          مفعّل · «{s.announcement_text}» · {SCROLL_SPEED_LABELS[s.announcement_scroll_speed]}
        </>
      ) : (
        "متوقف"
      );
    case "payments":
      return [s.enable_manual_payment ? "الدفع اليدوي" : null, s.enable_sharwa_pay ? "شروة باي" : null].filter(Boolean).join(" · ") || (
        <span className="text-warning">الدفع عند الاستلام فقط</span>
      );
    case "locations":
      return s.multi_location_enabled ? "مخزون لكل موقع" : "مخزون واحد";
  }
}

const GROUPS: Array<{ title: string; note?: string; keys: SettingsSection[] }> = [
  { title: "المتجر", note: "يُحفظ تلقائياً أثناء الكتابة.", keys: ["identity", "contact", "policies", "seo", "announcement"] },
  { title: "المال والبنية", note: "يُحفظ بزر وتأكيد — لمالك المتجر.", keys: ["shipping", "currency", "payments", "locations"] },
];

export function SettingsIndex() {
  const { canFeature } = useAccess();
  const session = useSession();
  const query = useSettings();

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const s = query.data;

  return (
    <div className="flex flex-col gap-10" data-testid="settings-index">
      {GROUPS.map((g, gi) => {
        const keys = g.keys.filter((k) => canFeature(SECTION_META[k].feature));
        if (!keys.length) return null;
        return (
          <section key={g.title} aria-labelledby={`settings-group-${gi}`} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`settings-group-${gi}`} className="text-sm font-medium">
                {g.title}
              </h2>
              {g.note ? <span className="text-xs text-muted-foreground">{g.note}</span> : null}
            </div>
            <ul className={gi === 1 ? "rounded-lg border border-destructive/70" : "rounded-lg border border-border"}>
              {keys.map((k) => {
                const meta = SECTION_META[k];
                const readOnly = meta.ownerOnly && session.kind !== "merchant";
                return (
                  <li key={k} className="border-b border-border last:border-0">
                    <Link
                      href={`/dashboard/settings/${k}`}
                      className="group flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                      data-testid={`settings-index-${k}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-baseline gap-2 text-sm font-medium">
                          {meta.title}
                          {readOnly ? <span className="text-xs font-normal text-muted-foreground">للقراءة</span> : null}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{summary(k, s)}</span>
                      </span>
                      <ChevronLeft className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
