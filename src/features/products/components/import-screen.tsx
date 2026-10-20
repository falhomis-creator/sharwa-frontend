"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { IMPORT_TARGET_FIELDS, type ImportUpload } from "@/features/products/schemas";
import { importApi, useInvalidateProducts } from "@/features/products/api/products";
import { useCatalogAccess } from "@/features/products/hooks/use-catalog-access";

/**
 * `/dashboard/products/import` — CSV import in three stages (US-04.7.1, FR-04.13):
 * 1. upload (csv · tsv · txt · xlsx), 2. preview of the first 20 rows with column mapping
 * and the error of EVERY row, 3. run as a pollable job. Nothing is written before the
 * confirmation in stage 2 (SC-04.5). Imported rows arrive as drafts.
 */
const STEPS = ["رفع الملف", "المعاينة والمطابقة", "التنفيذ"] as const;

export function ImportScreen() {
  const store = useStore();
  const access = useCatalogAccess();
  const invalidate = useInvalidateProducts();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<ImportUpload | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const step = running ? 2 : upload ? 1 : 0;

  const status = useQuery({
    queryKey: storeKey(store, "products", "import", upload?.job_id ?? ""),
    queryFn: () => importApi.status(upload!.job_id),
    enabled: running && Boolean(upload),
    refetchInterval: (q) => (q.state.data?.status === "running" || !q.state.data ? 400 : false),
  });

  useEffect(() => {
    if (status.data?.status === "done") void invalidate();
  }, [status.data?.status, invalidate]);

  async function onFile(file: File | undefined) {
    setError("");
    if (!file) return;
    setBusy(true);
    try {
      const res = await importApi.upload(file);
      setUpload(res);
      setMapping(res.suggested_mapping);
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : "تعذّر قراءة الملف.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function run() {
    if (!upload) return;
    setError("");
    setBusy(true);
    try {
      await importApi.run(upload.job_id, mapping);
      setRunning(true);
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : "تعذّر بدء الاستيراد.");
    } finally {
      setBusy(false);
    }
  }

  if (!access.canManage) {
    return <p className="text-sm text-muted-foreground">الاستيراد مقصور على مالك المتجر ومدير المتجر أو الفرع.</p>;
  }

  const mappedFields = new Set(Object.values(mapping));
  const st = status.data;

  return (
    <div className="flex flex-col gap-6" data-testid="import-screen">
      <PageHeader title="استيراد المنتجات" description="من ملف CSV أو TSV أو XLSX — تُراجع الصفوف قبل أي كتابة، وتصل المنتجات كمسودات." />
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="مراحل الاستيراد">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2", i === step ? "text-foreground" : "text-muted-foreground")}>
            <Mono className={cn("text-xs", i === step && "underline underline-offset-4")}>0{i + 1}</Mono>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted"
          >
            <FileUp className="size-6" strokeWidth={1.5} aria-hidden />
            {busy ? "جارٍ قراءة الملف…" : "اختر ملفاً (csv, tsv, txt, xlsx)"}
          </button>
          <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,.xlsx" className="sr-only" aria-label="ملف الاستيراد" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-file" />
          <p className="text-xs text-muted-foreground">الأعمدة المعروفة تُطابَق تلقائياً: الاسم، السعر، المخزون، SKU، الباركود، التصنيف، الوصف. يجب أن يكون الملف بترميز UTF-8.</p>
        </div>
      ) : null}

      {step === 1 && upload ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <Mono>{formatNumber(upload.total_rows)}</Mono> صفاً · أول <Mono>{Math.min(20, upload.total_rows)}</Mono> معروضة
            {upload.row_errors.length ? (
              <>
                {" "}
                · <Mono className="text-destructive">{upload.row_errors.length}</Mono> صفوف فيها أخطاء ولن تُستورد
              </>
            ) : null}
          </p>
          <div className="overflow-x-auto surface-card">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">معاينة الملف ومطابقة الأعمدة</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="h-9 px-3 text-start text-xs font-normal text-muted-foreground">
                    #
                  </th>
                  {upload.columns.map((c) => (
                    <th key={c} scope="col" className="px-2 py-2 text-start align-top font-normal">
                      <span className="mb-1 block text-xs text-muted-foreground" dir="auto">
                        {c}
                      </span>
                      <NativeSelect
                        value={mapping[c] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [c]: e.target.value }))}
                        className={cn("h-11 min-w-28 lg:h-8", !mapping[c] && "border-warning")}
                        aria-label={`مطابقة العمود ${c}`}
                      >
                        <option value="">تجاهل العمود</option>
                        {IMPORT_TARGET_FIELDS.map((f) => (
                          <option key={f.key} value={f.key} disabled={mappedFields.has(f.key) && mapping[c] !== f.key}>
                            {f.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </th>
                  ))}
                  <th scope="col" className="h-9 px-3 text-start text-xs font-normal text-muted-foreground">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody>
                {upload.preview.map((row, i) => {
                  const rowError = upload.row_errors.find((e) => e.row === i + 2);
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="h-10 px-3">
                        <Mono className="text-xs text-muted-foreground">{i + 2}</Mono>
                      </td>
                      {upload.columns.map((c) => (
                        <td key={c} className="h-10 max-w-48 truncate px-3" dir="auto">
                          {row[c]}
                        </td>
                      ))}
                      <td className={cn("h-10 px-3 text-xs", rowError ? "text-destructive" : "text-success")}>{rowError ? rowError.msg : "سليم"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {upload.row_errors.some((e) => e.row > 21) ? (
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer text-muted-foreground">أخطاء بقية الصفوف</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {upload.row_errors
                  .filter((e) => e.row > 21)
                  .map((e) => (
                    <li key={e.row}>
                      الصف <Mono>{e.row}</Mono>: {e.msg}
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-11 lg:h-9" disabled={busy || !mappedFields.has("name") || !mappedFields.has("price")} onClick={() => void run()} data-testid="import-run">
              استيراد {formatNumber(upload.total_rows - upload.row_errors.length)} منتجاً
            </Button>
            <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={() => setUpload(null)}>
              ملف آخر
            </Button>
          </div>
          {!mappedFields.has("name") || !mappedFields.has("price") ? <p className="text-xs text-warning">طابِق عمودَي الاسم والسعر على الأقل.</p> : null}
        </div>
      ) : null}

      {step === 2 && upload ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${st ? Math.round((st.done / Math.max(1, st.total)) * 100) : 0}%` }} />
          </div>
          <p className="text-sm">
            {st?.status === "done" ? "اكتمل الاستيراد" : "جارٍ الاستيراد…"} <Mono>{formatNumber(st?.done ?? 0)}</Mono>/<Mono>{formatNumber(st?.total ?? upload.total_rows)}</Mono>
            {st?.failed.length ? (
              <>
                {" "}
                · <Mono className="text-destructive">{st.failed.length}</Mono> مرفوضة
              </>
            ) : null}
          </p>
          {st?.failed.length ? (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
              {st.failed.map((f) => (
                <li key={f.row}>
                  الصف <Mono>{f.row}</Mono>: <span className="text-muted-foreground">{f.msg}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {st?.status === "done" ? (
            <Link href="/dashboard/products?status=draft" className="inline-flex h-11 items-center self-start rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted lg:h-9">
              عرض المسودات المستوردة
            </Link>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
