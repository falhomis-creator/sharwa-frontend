"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { ArrowRight } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { FeatureOffState, ForbiddenState } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useReturnOptions, useScanRma } from "@/features/returns/api";
import { RMA_STATUS_LABELS, type Rma } from "@/features/returns/schemas";
import { QaButtons } from "@/features/returns/components/rma-detail";

/**
 * `/dashboard/returns/rma/scan` (M24 FR-24.07, SC-24.4): one large auto-focused field; a
 * barcode reader (fast keystrokes + Enter) or the keyboard submits `{rma_id, location_id}`;
 * the location is remembered in the URL; the result line answers and the field is cleared
 * and keeps focus, so scan after scan needs no mouse. Received RMAs land in `qa_pending`
 * and get their QA decision buttons in the session log below.
 */
type LogEntry = { key: number; input: string; ok: true; rma: Rma } | { key: number; input: string; ok: false; message: string };

export function RmaScanScreen() {
  const { canFeature, canPermission } = useAccess();
  if (!canFeature("refunds")) return <FeatureOffState />;
  if (!canPermission("orders.process_returns") && !canPermission("inventory.adjust")) return <ForbiddenState />;
  return <ScanInner />;
}

function ScanInner() {
  const [location, setLocation] = useQueryState("location", parseAsString.withDefault("1").withOptions({ history: "replace" }));
  const locations = useReturnOptions().data?.locations ?? [];
  const scan = useScanRma();
  const [value, setValue] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  async function submit() {
    const raw = value.trim();
    if (!raw) return;
    setValue("");
    const key = ++seq.current;
    const id = Number(raw.replace(/^RMA-?/i, ""));
    if (!Number.isInteger(id) || id <= 0) {
      setLog((l) => [{ key, input: raw, ok: false as const, message: "رقم RMA غير صالح." }, ...l].slice(0, 30));
      inputRef.current?.focus();
      return;
    }
    try {
      const rma = await scan.mutateAsync({ rma_id: id, location_id: Number(location) });
      setLog((l) => [{ key, input: raw, ok: true as const, rma }, ...l].slice(0, 30));
    } catch (e) {
      setLog((l) => [{ key, input: raw, ok: false as const, message: isApiError(e) ? e.userMessage : "تعذّر الاتصال — أعِد المسح بعد التحقق من الحالة." }, ...l].slice(0, 30));
    } finally {
      inputRef.current?.focus();
    }
  }

  const last = log[0];
  const received = log.filter((e) => e.ok).length;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
      <Link href="/dashboard/returns/rma" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> مسار RMA
      </Link>
      <PageHeader title="مسح الاستلام" description="امسح ملصق المرتجع أو اكتب رقمه ثم Enter. يبقى الحقل جاهزاً للمسح التالي." />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="flex max-w-sm flex-col gap-1.5 text-sm">
          <span className="font-medium">موقع الاستلام</span>
          <NativeSelect
            value={location}
            onChange={(e) => {
              void setLocation(e.target.value === "1" ? null : e.target.value);
              inputRef.current?.focus();
            }}
            className="h-11"
            data-testid="scan-location"
          >
            {locations.length === 0 ? <option value={location}>الموقع {location}</option> : null}
            {locations.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">رقم RMA</span>
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            dir="ltr"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="RMA-801"
            aria-describedby="scan-result"
            className="h-16 w-full rounded-lg border border-input bg-card px-4 text-start font-mono text-2xl tracking-wide outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-20 md:text-3xl dark:bg-input/30"
            data-testid="scan-input"
          />
        </label>
      </form>

      <p id="scan-result" role="status" aria-live="polite" className="min-h-6 text-base" data-testid="scan-result" data-ok={last ? String(last.ok) : undefined}>
        {!last ? (
          <span className="text-muted-foreground">بانتظار المسح…</span>
        ) : last.ok ? (
          <span className="flex flex-wrap items-center gap-2">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            <Mono>RMA-{last.rma.id}</Mono>
            <span>
              {last.rma.fulfillment_item.product_name} × <Mono>{last.rma.quantity}</Mono>
            </span>
            <span className="text-muted-foreground">← {RMA_STATUS_LABELS[last.rma.status]}</span>
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-destructive">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            <Mono>{last.input}</Mono>
            <span>{last.message}</span>
          </span>
        )}
      </p>

      {log.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">
            هذه الجلسة · <Mono>{received}</Mono> مستلم من <Mono>{log.length}</Mono>
          </h2>
          <ul className="surface-card" data-testid="scan-log">
            {log.map((e) => (
              <li key={e.key} className={cn("flex flex-col gap-2 border-b border-border p-3 last:border-0 md:flex-row md:items-center md:justify-between")} data-testid="scan-log-row" data-ok={String(e.ok)}>
                {e.ok ? (
                  <>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={`/dashboard/returns/rma/${e.rma.id}`} className="inline-flex min-h-11 items-center hover:underline lg:min-h-0">
                        <Mono>RMA-{e.rma.id}</Mono>
                      </Link>
                      <span className="truncate">{e.rma.fulfillment_item.product_name}</span>
                      <span className="text-muted-foreground">{RMA_STATUS_LABELS[e.rma.status]}</span>
                    </span>
                    <QaButtons
                      rma={e.rma}
                      onDone={(rma) => {
                        setLog((l) => l.map((x) => (x.key === e.key && x.ok ? { ...x, rma } : x)));
                        inputRef.current?.focus();
                      }}
                    />
                  </>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <Mono>{e.input}</Mono>
                    <span className="text-destructive">{e.message}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
