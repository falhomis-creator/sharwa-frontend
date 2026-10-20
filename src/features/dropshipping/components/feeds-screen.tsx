"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { parseAsInteger, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilePicker } from "@/components/shared/file-picker";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateFeed, useDropMeta, useFeed, useFeedAction, useFeedPreview, useFeeds } from "@/features/dropshipping/api";
import { FEED_EXTENSIONS, FEED_FIELD_LABELS, FEED_STATUS_LABELS, feedExtensionOk, isLive, type Feed } from "@/features/dropshipping/schemas";
import { DROP_ROOT, DropJobStatus, DropshippingGate, DropshippingNav, StatusText } from "@/features/dropshipping/components/bits";

/** `/dashboard/channels/dropshipping/feeds` — the feed mappings (US-29.4). */
export function FeedsScreen() {
  return (
    <DropshippingGate>
      <FeedsInner />
    </DropshippingGate>
  );
}

function feedTone(s: Feed["status"]) {
  return s === "completed" ? "success" : s === "completed_with_errors" ? "warning" : s === "failed" ? "destructive" : s === "running" ? "info" : "muted";
}

function FeedsInner() {
  const q = useFeeds();
  const [now] = useState(() => new Date());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الملفات والموجزات"
        description={`ارفع ملفاً (${FEED_EXTENSIONS.join(" · ")}) أو رابطاً، اربط أعمدته، عاين، ثم شغّل.`}
        actions={
          <Link href={`${DROP_ROOT}/feeds/new`} className={cn(buttonVariants(), "h-11 gap-1.5 lg:h-9")} data-testid="new-feed">
            <Plus className="size-4" aria-hidden /> ملف جديد
          </Link>
        }
      />
      <DropshippingNav active="feeds" />
      {q.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title="لا ملفات بعد" action={<Link href={`${DROP_ROOT}/feeds/new`} className={cn(buttonVariants(), "h-11 lg:h-9")}>ملف جديد</Link>} />
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="feeds-list">
          {q.data.map((f) => (
            <li key={f.id}>
              <Link href={`${DROP_ROOT}/feeds/${f.id}`} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm hover:bg-muted">
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {f.filename ?? f.url}
                </span>
                <StatusText tone={feedTone(f.status)} label={FEED_STATUS_LABELS[f.status]} pulse={f.status === "running"} />
                {f.schedule_interval ? (
                  <span className="text-xs text-muted-foreground">
                    يتكرر كل <Mono>{f.schedule_interval}</Mono> دقيقة
                  </span>
                ) : null}
                <span className="ms-auto text-xs text-muted-foreground">{formatRelative(f.created_at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── wizard ──────────────────────────────────────────────────────────────────────────

const STEP_LABELS = ["المصدر", "الربط", "المعاينة", "التشغيل"] as const;

/** `/dashboard/channels/dropshipping/feeds/new?step=1..4&feed=<id>` (FR-29.06). */
export function FeedWizardScreen() {
  return (
    <DropshippingGate>
      <WizardInner />
    </DropshippingGate>
  );
}

function WizardInner() {
  const [{ step, feed }, setQ] = useQueryStates({ step: parseAsInteger.withDefault(1), feed: parseAsInteger }, { history: "push" });
  const feedQ = useFeed(feed);
  // A step past 1 without a feed falls back to the source step.
  const current = feed ? Math.min(4, Math.max(1, step)) : 1;
  const f = feedQ.data;
  const reachable = (s: number) => s === 1 || (f ? (s === 2 ? true : s === 3 ? f.missing_required.length === 0 : ["approved", "running", "completed", "completed_with_errors", "failed"].includes(f.status)) : false);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ملف جديد" description="أربع خطوات: المصدر · الربط · المعاينة · التشغيل." />
      <DropshippingNav active="feeds" />
      <ol className="flex items-center gap-2 text-sm" aria-label="خطوات المعالج" data-testid="wizard-steps">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} className={cn("hidden items-center gap-2 md:flex", n === current ? "font-medium" : "text-muted-foreground")} aria-current={n === current ? "step" : undefined}>
              <button type="button" disabled={!reachable(n)} onClick={() => void setQ({ step: n })} className="flex min-h-11 items-center gap-1.5 disabled:opacity-50 lg:min-h-8">
                <Mono>{n}</Mono> {label}
              </button>
              {n < 4 ? <span aria-hidden className="h-px w-6 bg-border" /> : null}
            </li>
          );
        })}
        <li className="text-sm md:hidden" data-testid="wizard-step-text">
          <Mono>{current}</Mono> من <Mono>4</Mono> — {STEP_LABELS[current - 1]}
        </li>
      </ol>
      {current === 1 ? (
        <SourceStep onCreated={(id) => void setQ({ feed: id, step: 2 })} />
      ) : feedQ.isLoading || !f ? (
        feedQ.error ? <ErrorState error={feedQ.error} /> : <Skeleton className="h-64 w-full" />
      ) : current === 2 ? (
        <MappingStep feed={f} onNext={() => void setQ({ step: 3 })} />
      ) : current === 3 ? (
        <PreviewStep feed={f} onBack={() => void setQ({ step: 2 })} onNext={() => void setQ({ step: 4 })} />
      ) : (
        <RunStep feed={f} />
      )}
    </div>
  );
}

function SourceStep({ onCreated }: { onCreated: (id: number) => void }) {
  const id = useId();
  const create = useCreateFeed();
  const [kind, setKind] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      data-testid="step-source"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (kind === "file" && !file) return setError("اختر ملفاً.");
        try {
          const feed = await create.mutateAsync(kind === "file" ? { file: file!, name: name || undefined } : { url: url.trim(), name: name || undefined });
          toast.success("قُرئت أعمدة الملف", { description: `${feed.columns.length} عموداً` });
          onCreated(feed.id);
        } catch (err) {
          setError(isApiError(err) ? (err.fields ? Object.values(err.fields)[0]?.[0] ?? err.userMessage : err.userMessage) : "تعذّرت القراءة");
        }
      }}
    >
      <div role="radiogroup" aria-label="نوع المصدر" className="flex gap-1">
        {(["file", "url"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("h-11 rounded-md px-3 text-sm lg:h-8", kind === k ? "bg-muted font-medium" : "text-muted-foreground")}>
            {k === "file" ? "رفع ملف" : "رابط"}
          </button>
        ))}
      </div>
      {kind === "file" ? (
        <Field label="الملف" htmlFor={`${id}-f`} error={error ?? undefined} hint={`المسموح: ${FEED_EXTENSIONS.join(", ")}`}>
          <FilePicker
            id={`${id}-f`}
            accept={FEED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            aria-invalid={!!error || undefined}
            data-testid="feed-file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && !feedExtensionOk(f.name)) {
                setFile(null);
                e.target.value = "";
                setError(`امتداد غير مدعوم. المسموح: ${FEED_EXTENSIONS.join(", ")}`);
                return;
              }
              setError(null);
              setFile(f);
            }}
          />
        </Field>
      ) : (
        <Field label="رابط الملف" htmlFor={`${id}-u`} error={error ?? undefined} hint="رابط عام يُقرأ دون تسجيل دخول.">
          <input id={`${id}-u`} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputClass} data-testid="feed-url" />
        </Field>
      )}
      <Field label="اسم الملف في المتجر (اختياري)" htmlFor={`${id}-n`}>
        <input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <div>
        <Button type="submit" className="h-11 lg:h-9" disabled={create.isPending} data-testid="source-next">
          {create.isPending ? "جارٍ القراءة…" : "التالي: ربط الأعمدة"}
        </Button>
      </div>
    </form>
  );
}

function MappingStep({ feed, onNext }: { feed: Feed; onNext: () => void }) {
  const meta = useDropMeta();
  const action = useFeedAction();
  const [mapping, setMapping] = useState<Record<string, string>>(feed.mapping);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const fields = useMemo(() => meta.data?.feed_fields ?? [], [meta.data]);
  const duplicates = useMemo(() => {
    const seen = new Map<string, string>();
    const dup: Record<string, string> = {};
    for (const f of fields) {
      const col = mapping[f.key];
      if (!col) continue;
      if (seen.has(col)) dup[f.key] = "العمود مستخدم في حقل آخر";
      else seen.set(col, f.key);
    }
    return dup;
  }, [fields, mapping]);
  const missing = fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.key);
  const canNext = fields.length > 0 && missing.length === 0 && Object.keys(duplicates).length === 0;

  return (
    <div className="flex max-w-3xl flex-col gap-4" data-testid="step-mapping">
      <p className="text-sm text-muted-foreground">
        {feed.sheet_name ? (
          <>
            الورقة: <Mono>{feed.sheet_name}</Mono> ·{" "}
          </>
        ) : null}
        <Mono>{feed.columns.length}</Mono> عموداً في الملف. اكتُشف بعض الربط تلقائياً بالاسم.
      </p>
      <ul className="divide-y divide-border/60 surface-card overflow-hidden">
        {fields.map((f) => {
          const error = duplicates[f.key] ?? serverErrors[f.key];
          return (
            <li key={f.key} className="grid gap-2 p-3 sm:grid-cols-[12rem_1fr] sm:items-center" data-testid="map-row" data-field={f.key}>
              <label htmlFor={`map-${f.key}`} className="text-sm">
                {FEED_FIELD_LABELS[f.key] ?? f.key} <Mono className="text-xs text-muted-foreground">{f.key}</Mono>
                {f.required ? <span className="ms-1 text-muted-foreground">* إلزامي</span> : null}
              </label>
              <div className="flex flex-col gap-1">
                <NativeSelect id={`map-${f.key}`} value={mapping[f.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))} aria-invalid={Boolean(error)} className="h-11 md:h-8">
                  <option value="">— بلا ربط —</option>
                  {feed.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
                {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length ? (
        <p className="text-sm text-muted-foreground" data-testid="missing-required">
          اربط الإلزامية: {missing.map((k) => FEED_FIELD_LABELS[k] ?? k).join("، ")}
        </p>
      ) : null}
      <div>
        <Button
          className="h-11 lg:h-9"
          disabled={!canNext || action.isPending}
          data-testid="mapping-next"
          onClick={async () => {
            try {
              await action.mutateAsync({ id: feed.id, action: "mapping", json: { mapping: Object.fromEntries(Object.entries(mapping).filter(([, v]) => v)) } });
              setServerErrors({});
              onNext();
            } catch (e) {
              if (isApiError(e) && e.fields) setServerErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k.replace("mapping.", ""), v[0] ?? ""])));
              else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ");
            }
          }}
        >
          التالي: المعاينة
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({ feed, onBack, onNext }: { feed: Feed; onBack: () => void; onNext: () => void }) {
  const preview = useFeedPreview(feed.id, true);
  const action = useFeedAction();
  if (preview.isLoading) return <Skeleton className="h-64 w-full" />;
  if (preview.error || !preview.data) return <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />;
  const p = preview.data;
  return (
    <div className="flex flex-col gap-4" data-testid="step-preview">
      <p className="text-sm">
        أول <Mono>{p.rows.length}</Mono> صفوف بعد التحويل من <Mono>{p.total_rows}</Mono> · الأخطاء{" "}
        <Mono className={p.errors_count ? "text-destructive" : undefined} data-testid="preview-errors">
          {p.errors_count}
        </Mono>
      </p>
      <div className="overflow-x-auto surface-card">
        <table className="w-full min-w-[720px] text-sm" data-testid="preview-table">
          <caption className="sr-only">معاينة الصفوف</caption>
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-normal">الصف</th>
              {p.fields.map((k) => (
                <th key={k} className="px-3 py-2 text-start font-normal">
                  {FEED_FIELD_LABELS[k] ?? k}
                </th>
              ))}
              <th className="px-3 py-2 text-start font-normal">الأخطاء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {p.rows.map((r) => (
              <tr key={r.row} className="h-11 align-top">
                <td className="px-3 py-2">
                  <Mono className="text-muted-foreground">{r.row}</Mono>
                </td>
                {p.fields.map((k) => (
                  <td key={k} className="max-w-48 truncate px-3 py-2">
                    {["sku", "cost", "stock", "price", "barcode", "gtin", "weight"].includes(k) ? <Mono>{r.values[k] ?? ""}</Mono> : (r.values[k] ?? "")}
                  </td>
                ))}
                <td className="px-3 py-2 text-xs text-destructive">{r.errors.join("؛ ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" className="h-11 lg:h-9" onClick={onBack}>
          السابق
        </Button>
        <Button
          className="h-11 lg:h-9"
          disabled={action.isPending}
          data-testid="preview-approve"
          onClick={async () => {
            try {
              await action.mutateAsync({ id: feed.id, action: "approve" });
              toast.success("اعتُمد الملف");
              onNext();
            } catch (e) {
              toast.error(isApiError(e) ? e.userMessage : "تعذّر الاعتماد");
            }
          }}
        >
          اعتماد والمتابعة
        </Button>
      </div>
    </div>
  );
}

const SCHEDULES = [
  { value: "", label: "بلا تكرار" },
  { value: "60", label: "كل ساعة" },
  { value: "360", label: "كل 6 ساعات" },
  { value: "720", label: "كل 12 ساعة" },
  { value: "1440", label: "يومياً" },
];

/** Step 4 and the feed detail share this: run, watch the job, errors CSV, schedule. */
export function RunStep({ feed }: { feed: Feed }) {
  const action = useFeedAction();
  const job = feed.last_job;
  const live = feed.status === "running" || (job ? isLive(job.status) : false);
  return (
    <div className="flex max-w-2xl flex-col gap-4" data-testid="step-run">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="h-11 lg:h-9"
          disabled={live || action.isPending || !["approved", "completed", "completed_with_errors", "failed"].includes(feed.status)}
          data-testid="feed-run"
          onClick={async () => {
            try {
              const r = await action.mutateAsync({ id: feed.id, action: "run" });
              toast.success(`بدأ التشغيل — المهمة #${"job_id" in r ? r.job_id : ""}`);
            } catch (e) {
              toast.error(isApiError(e) ? e.userMessage : "تعذّر التشغيل");
            }
          }}
        >
          {job ? "تشغيل مجدداً" : "تشغيل"}
        </Button>
        {job ? (
          <span className="flex items-center gap-2 text-sm">
            المهمة <Mono>#{job.id}</Mono> <DropJobStatus status={job.status} />
          </span>
        ) : null}
      </div>
      {job && !isLive(job.status) ? (
        <p className="text-sm">
          عولج <Mono>{job.processed}</Mono> صفاً · أخطاء <Mono className={job.errors_count ? "text-destructive" : undefined}>{job.errors_count}</Mono>
        </p>
      ) : null}
      {job?.errors_csv_url ? (
        <a href={`/api/bff/dropshipping/feeds/${feed.id}/errors.csv`} download className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start lg:h-9")} data-testid="feed-errors-csv">
          تنزيل أخطاء CSV
        </a>
      ) : null}
      <Field label="الجدولة" htmlFor="feed-schedule" hint="يُعاد تشغيل الملف تلقائياً بهذا الفاصل.">
        <NativeSelect
          id="feed-schedule"
          value={feed.schedule_interval ? String(feed.schedule_interval) : ""}
          onChange={async (e) => {
            try {
              await action.mutateAsync({ id: feed.id, action: "patch", json: { schedule_interval: e.target.value ? Number(e.target.value) : null } });
              toast.success("حُفظت الجدولة");
            } catch (err) {
              toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ");
            }
          }}
          className="h-11 max-w-xs md:h-8"
          data-testid="feed-schedule"
        >
          {SCHEDULES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

/** `/dashboard/channels/dropshipping/feeds/[id]`. */
export function FeedDetailScreen({ feedId }: { feedId: number }) {
  return (
    <DropshippingGate>
      <FeedDetailInner feedId={feedId} />
    </DropshippingGate>
  );
}

function FeedDetailInner({ feedId }: { feedId: number }) {
  const q = useFeed(feedId);
  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const f = q.data;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`FEED-${f.id}`}
        title={f.name}
        description={f.filename ?? f.url ?? undefined}
        actions={
          <Link href={`${DROP_ROOT}/feeds/new?feed=${f.id}&step=2`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            تعديل الربط
          </Link>
        }
      />
      <DropshippingNav active="feeds" />
      <StatusText tone={feedTone(f.status)} label={FEED_STATUS_LABELS[f.status]} pulse={f.status === "running"} />
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-medium">الربط</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {Object.entries(f.mapping).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-border py-1">
              <dt className="text-muted-foreground">{FEED_FIELD_LABELS[k] ?? k}</dt>
              <dd>
                <Mono>{v}</Mono>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <RunStep feed={f} />
    </div>
  );
}
