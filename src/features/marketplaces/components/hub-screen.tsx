"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConnectNoon, useDisconnect, useJobs, useMarketHub } from "@/features/marketplaces/api";
import { JOB_TYPE_LABELS, MARKET_LABELS, type MarketRow } from "@/features/marketplaces/schemas";
import { JobStatusText, MarketplacesGate, MarketplacesNav, StatusText } from "@/features/marketplaces/components/bits";

/**
 * `/dashboard/channels/marketplaces` (M28 US-28.1, FR-28.02): each market is a ROW (not
 * two look-alike cards) with its connection, last job and the shortcuts; the latest jobs
 * underneath. Amazon connects through the server's OAuth redirect; noon with an API key
 * that is never shown again.
 */
export function MarketplacesHubScreen() {
  return (
    <MarketplacesGate>
      <HubInner />
    </MarketplacesGate>
  );
}

function HubInner() {
  const hub = useMarketHub();
  const jobs = useJobs({ page_size: 5 });
  const [connected, setConnected] = useQueryState("connected", parseAsString);
  const [noonOpen, setNoonOpen] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (connected === "amazon") {
      toast.success("رُبط حساب أمازون");
      void setConnected(null);
    }
  }, [connected, setConnected]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الأسواق الإلكترونية" description="انشر منتجاتك على أمازون ونون واسحب طلباتها إلى لوحة الطلبات." />
      <MarketplacesNav active="hub" />
      {hub.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : hub.error ? (
        <ErrorState error={hub.error} onRetry={() => void hub.refetch()} />
      ) : (
        <>
          {hub.data && !hub.data.some((m) => m.connected) ? <EmptyState title="لم تربط أي سوق بعد" description="اربط أمازون أو نون للبدء." /> : null}
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="market-rows">
            {hub.data?.map((m) => <MarketRowView key={m.marketplace} m={m} now={now} onNoon={() => setNoonOpen(true)} />)}
          </ul>
        </>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="recent-jobs">
        <div className="flex items-baseline justify-between">
          <h2 id="recent-jobs" className="text-base font-medium">
            آخر المهام
          </h2>
          <Link href="/dashboard/channels/marketplaces/jobs" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            كل المهام
          </Link>
        </div>
        {jobs.data?.results.length ? (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden">
            {jobs.data.results.map((j) => (
              <li key={j.id}>
                <Link href={`/dashboard/channels/marketplaces/jobs?job=${j.id}`} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm hover:bg-muted">
                  <Mono className="text-muted-foreground">#{j.id}</Mono>
                  <span>{JOB_TYPE_LABELS[j.job_type]}</span>
                  <span className="text-muted-foreground">{MARKET_LABELS[j.marketplace]}</span>
                  <JobStatusText status={j.status} />
                  <span className="ms-auto text-xs text-muted-foreground">{formatRelative(j.created_at, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : jobs.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">لا مهام بعد.</p>
        )}
      </section>
      <NoonDialog open={noonOpen} onOpenChange={setNoonOpen} />
    </div>
  );
}

function MarketRowView({ m, now, onNoon }: { m: MarketRow; now: Date; onNoon: () => void }) {
  const disconnect = useDisconnect();
  const [confirm, setConfirm] = useState(false);
  const base = `/dashboard/channels/marketplaces/${m.marketplace}`;
  const btn = "h-11 lg:h-8";
  return (
    <li className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6" data-testid="market-row" data-market={m.marketplace}>
      <div className="flex min-w-48 flex-col gap-1">
        <span className="text-base font-medium">{MARKET_LABELS[m.marketplace]}</span>
        {m.needs_reauth ? (
          <StatusText tone="warning" label="يحتاج إعادة ربط" testId="market-conn" value="reauth" />
        ) : m.connected ? (
          <StatusText tone="success" label="مربوط" testId="market-conn" value="connected" />
        ) : (
          <StatusText tone="muted" label="غير مربوط" testId="market-conn" value="disconnected" />
        )}
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt>الحساب</dt>
          <dd className="truncate text-sm text-foreground" dir="ltr">
            {m.account_label ?? "—"}
          </dd>
        </div>
        <div>
          <dt>تاريخ الربط</dt>
          <dd className="text-sm text-foreground">{m.connected_at ? <Mono>{formatDate(m.connected_at)}</Mono> : "—"}</dd>
        </div>
        <div>
          <dt>القوائم</dt>
          <dd className="text-sm text-foreground">
            <Mono>{m.listings_count}</Mono>
            {m.needs_identifier_count ? (
              <span className="text-muted-foreground">
                {" "}
                · <Mono>{m.needs_identifier_count}</Mono> بلا معرّف
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>آخر مهمة</dt>
          <dd className="flex flex-wrap items-center gap-1 text-sm text-foreground">
            {m.last_job ? (
              <>
                <span>{JOB_TYPE_LABELS[m.last_job.job_type]}</span> <JobStatusText status={m.last_job.status} />
                {m.last_job.finished_at ? <span className="text-xs text-muted-foreground">{formatRelative(m.last_job.finished_at, now)}</span> : null}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {m.connected ? (
          <>
            <Link href={`${base}?tab=listings`} className={cn(buttonVariants({ variant: "outline" }), btn)} data-testid="to-listings">
              القوائم
            </Link>
            <Link href={`${base}?tab=settings`} className={cn(buttonVariants({ variant: "outline" }), btn)}>
              الإعدادات
            </Link>
            <Button variant="ghost" className={btn} onClick={() => setConfirm(true)}>
              فصل
            </Button>
          </>
        ) : m.marketplace === "amazon" ? (
          // Ready upstream: a server redirect into SP-API OAuth that returns to this page —
          // a full navigation on purpose (it leaves the app), hence a plain anchor.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/api/bff/marketplaces/amazon/oauth/start" className={cn(buttonVariants(), btn)} data-testid="connect-amazon">
            {m.needs_reauth ? "إعادة الربط" : "ربط أمازون"}
          </a>
        ) : (
          <Button className={btn} onClick={onNoon} data-testid="connect-noon">
            ربط نون
          </Button>
        )}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>فصل {MARKET_LABELS[m.marketplace]}؟</DialogTitle>
          <DialogDescription>تتوقف المزامنة وسحب الطلبات. القوائم تبقى محفوظة.</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className={btn} onClick={() => setConfirm(false)}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              className={btn}
              onClick={async () => {
                setConfirm(false);
                try {
                  await disconnect.mutateAsync(m.marketplace);
                  toast.success(`فُصل ${MARKET_LABELS[m.marketplace]}`);
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّر الفصل");
                }
              }}
            >
              فصل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function NoonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const connect = useConnectNoon();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setKey("");
          setError(null);
        }
      }}
    >
      <DialogContent data-testid="noon-dialog">
        <DialogTitle>ربط نون</DialogTitle>
        <DialogDescription>أدخل مفتاح API من بوابة شركاء نون. لن يُعرض المفتاح بعد الحفظ.</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await connect.mutateAsync(key.trim());
              toast.success("رُبط حساب نون");
              setKey("");
              onOpenChange(false);
            } catch (err) {
              setError(isApiError(err) ? (err.fields?.api_key?.[0] ?? err.userMessage) : "تعذّر الربط");
            }
          }}
        >
          <Field label="مفتاح API" htmlFor="noon-key" error={error ?? undefined} required>
            <input id="noon-key" type="password" autoComplete="off" dir="ltr" value={key} onChange={(e) => setKey(e.target.value)} className={cn(inputClass, "font-mono")} data-testid="noon-key" />
          </Field>
          <DialogFooter>
            <Button type="submit" className="h-11 lg:h-9" disabled={!key.trim() || connect.isPending} data-testid="noon-save">
              حفظ وربط
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
