"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { Check, Copy, ExternalLink, MessageCircle, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatNumber, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { useCustomer } from "@/features/customers/api";
import { SEGMENT_LABELS, type CustomerDetail, type Segment } from "@/features/customers/schemas";
import { CodTrustBlock } from "@/features/customers/components/cod-trust";
import { NotesTab, OrdersTab, PointsTab, ReviewsTab, WalletTab, WishlistTab } from "@/features/customers/components/profile-tabs";

/**
 * The customer profile (US-07.2): the SAME component behind the list's side sheet and
 * `/dashboard/customers/[phone]` (FR-07.05). Header (name + other names, phone Mono with
 * WhatsApp and copy, first/last order), ONE Mono number strip split by 1px rules
 * (constitution I — no KPI cards), the two COD trust sources apart, then the six tabs in the
 * URL (`?tab=`). Shortcuts: `W` WhatsApp, `N` new note.
 */
export const PROFILE_TABS = ["orders", "wallet", "points", "wishlist", "reviews", "notes"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];
const TAB_LABELS: Record<ProfileTab, string> = { orders: "الطلبات", wallet: "المحفظة", points: "النقاط", wishlist: "الأمنيات", reviews: "التقييمات", notes: "الملاحظات" };

export const profileTabParsers = { tab: parseAsStringLiteral(PROFILE_TABS).withDefault("orders") };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

export function CustomerProfile({ phone, variant }: { phone: string; variant: "sheet" | "page" }) {
  const query = useCustomer(phone);
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy data-testid="profile-loading">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.error && isApiError(query.error) && query.error.status === 404) {
    return (
      <EmptyState
        title="لا عميل بهذا الرقم في متجرك"
        description="العميل يظهر بعد أول طلب برقمه. تأكد من الرقم أو ابحث بالاسم."
        action={
          <Link href="/dashboard/customers" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            قائمة العملاء
          </Link>
        }
      />
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Profile customer={query.data} variant={variant} />;
}

function Profile({ customer: c, variant }: { customer: CustomerDetail; variant: "sheet" | "page" }) {
  const [{ tab }, setTab] = useQueryStates(profileTabParsers, { history: "replace" });
  const { canPermission } = useAccess();
  const session = useSession();
  const [copied, setCopied] = useState(false);
  const noteInput = useRef<HTMLTextAreaElement | null>(null);
  const focusNoteNext = useRef(false);
  const viewWarning = session.kind === "staff" && session.behavior?.view === "warning";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "w" && c.phone_available) {
        event.preventDefault();
        window.open(`https://wa.me/${c.phone}`, "_blank", "noopener,noreferrer");
      } else if (key === "n") {
        event.preventDefault();
        if (noteInput.current) noteInput.current.focus();
        else {
          focusNoteNext.current = true;
          void setTab({ tab: "notes" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.phone, c.phone_available, setTab]);

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(c.phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context) — nothing to do
    }
  }

  const strip: Array<{ key: string; label: string; value: ReactNode }> = [
    { key: "orders", label: "الطلبات", value: <Mono>{formatNumber(c.orders_count)}</Mono> },
    { key: "spent", label: "الإنفاق", value: <Money value={c.display_total_spent} /> },
    { key: "refunded", label: "المسترد", value: <Money value={c.display_refunded} /> },
    { key: "avg", label: "متوسط السلة", value: <Money value={c.display_avg_basket} /> },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="customer-profile" data-phone={c.phone}>
      {viewWarning ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground" data-testid="view-warning">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          نشاطك مرتفع اليوم — تُحتسب مشاهدات ملفات العملاء ضمن تنبيهات الحجم.
        </p>
      ) : null}

      <header className="flex flex-col gap-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-start gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
            <User className="size-4" strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="truncate text-xl font-semibold" data-testid="profile-name">
              {c.name}
            </h2>
            {c.other_names.length ? (
              <p className="text-xs text-muted-foreground" data-testid="other-names">
                أسماء أخرى مستخدمة: {c.other_names.join("، ")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1">
              {c.phone_available ? (
                <>
                  <Mono className="text-sm" data-testid="profile-phone">
                    {prettyPhone(c.phone)}
                  </Mono>
                  <button type="button" onClick={() => void copyPhone()} className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8" aria-label="نسخ الهاتف" data-testid="copy-phone">
                    {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  </button>
                  <a
                    href={`https://wa.me/${c.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:h-8"
                    title="واتساب (W)"
                    data-testid="whatsapp"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    واتساب
                    <ExternalLink className="size-3 rtl:-scale-x-100" aria-hidden />
                  </a>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground" data-testid="phone-masked">
                    هاتف غير متاح من السوق
                  </span>
                  <button type="button" disabled title="هاتف غير متاح من السوق" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground opacity-50 lg:h-8" data-testid="whatsapp-disabled">
                    <MessageCircle className="size-4" aria-hidden />
                    واتساب
                  </button>
                </>
              )}
            </div>
          </div>
          {variant === "sheet" ? (
            <Link href={`/dashboard/customers/${c.phone}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "me-12 h-11 lg:me-8 lg:h-8")} data-testid="open-full-page">
              الصفحة الكاملة
            </Link>
          ) : null}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            أول طلب <time dateTime={c.first_order_at}>{formatDate(c.first_order_at)}</time>
          </span>
          <span aria-hidden>·</span>
          <span>
            آخر طلب <time dateTime={c.last_order_at}>{formatDate(c.last_order_at)}</time>
          </span>
          {c.email ? (
            <>
              <span aria-hidden>·</span>
              <Mono>{c.email}</Mono>
            </>
          ) : null}
          {c.segment_flags.map((s) => (
            <span key={s} className="flex items-center gap-1.5" data-testid="segment-flag">
              <span aria-hidden>·</span>
              {SEGMENT_LABELS[s as Segment] ?? s}
            </span>
          ))}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4" data-testid="number-strip">
        {strip.map((s) => (
          <div key={s.key} className="flex min-w-0 flex-col gap-0.5 bg-background px-3 py-2">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="truncate text-base font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>

      <CodTrustBlock customer={c} />

      {canPermission("customers.manage_tier") ? (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3 text-sm" data-testid="tier-stub">
          <span className="font-medium">الفئة / الجملة</span>
          <span className="text-xs text-muted-foreground">قريباً — M36</span>
        </section>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4">
        <div role="tablist" aria-label="أقسام ملف العميل" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto border-b border-border px-1" data-testid="profile-tabs">
          {PROFILE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => void setTab({ tab: t === "orders" ? null : t })}
              data-testid={`profile-tab-${t}`}
              className={cn(
                "-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm lg:min-h-9",
                tab === t ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={TAB_LABELS[tab]}>
          {tab === "orders" ? <OrdersTab customer={c} /> : null}
          {tab === "wallet" ? <WalletTab customer={c} /> : null}
          {tab === "points" ? <PointsTab customer={c} /> : null}
          {tab === "wishlist" ? <WishlistTab customer={c} /> : null}
          {tab === "reviews" ? <ReviewsTab customer={c} /> : null}
          {tab === "notes" ? (
            <NotesTab
              customer={c}
              onInputRef={(el) => {
                noteInput.current = el;
                if (el && focusNoteNext.current) {
                  focusNoteNext.current = false;
                  el.focus();
                }
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
