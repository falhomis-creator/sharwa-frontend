"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { addDecimal, mulDecimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useCreateReturn, useReturnableItems } from "@/features/returns/api";
import { RETURN_REFUND_METHODS, RETURN_REFUND_METHOD_LABELS, newReturnSchema, type NewReturnInput, type ReturnableItem } from "@/features/returns/schemas";

/**
 * `/dashboard/returns/new?order=` (M24 US-24.2): order number → `items/` → the returnable
 * lines with `remaining`; per line a quantity capped LOCALLY («المتبقي n», SC-24.3) and a
 * `restock` switch; reason; one of the four refund methods; an estimate labelled
 * «تقديري — المبلغ النهائي من الخادم». Sends exactly FR-24.02's body. 201 → the detail;
 * 400 `{line_items:[…]}` → each message under its line.
 */
export function NewReturnScreen() {
  return (
    <AccessGate feature="refunds" permission="orders.process_returns">
      <NewReturnInner />
    </AccessGate>
  );
}

function NewReturnInner() {
  const [order, setOrder] = useQueryState("order", parseAsInteger.withOptions({ history: "replace" }));
  const [draft, setDraft] = useState(order ? String(order) : "");
  const [draftError, setDraftError] = useState<string | null>(null);
  const items = useReturnableItems(order);

  function load() {
    const n = Number(draft.trim().replace(/^#/, ""));
    if (!Number.isInteger(n) || n <= 0) {
      setDraftError("أدخل رقم طلب صحيحاً.");
      return;
    }
    setDraftError(null);
    void setOrder(n);
  }

  const notFound = isApiError(items.error) && items.error.status === 404;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/returns" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المرتجعات
      </Link>
      <PageHeader title="إرجاع جديد" description="من طلب مُنفَّذ: اختر السطور والكميات، وحدد إعادة المخزون لكل سطر." />

      <form
        className="flex max-w-md flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Field label="رقم الطلب" htmlFor="return-order" error={draftError ?? (notFound ? "الطلب غير موجود." : undefined)}>
          <div className="flex gap-2">
            <input
              id="return-order"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={cn(numericInputClass, "text-start")}
              placeholder="10480"
              aria-invalid={Boolean(draftError || notFound)}
              data-testid="return-order-input"
            />
            <Button type="submit" variant="outline" className="h-11 shrink-0 md:h-8" data-testid="return-order-load">
              تحميل العناصر
            </Button>
          </div>
        </Field>
      </form>

      {order === null ? null : items.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : notFound ? null : items.error ? (
        <ErrorState error={items.error} onRetry={() => void items.refetch()} />
      ) : !items.data?.length ? (
        <EmptyState
          title="لا عناصر قابلة للإرجاع — استخدم استرجاع المبلغ من الطلب"
          description="هذا الطلب بلا عناصر تنفيذ (لم يُسلَّم بعد أو أقدم من نظام التنفيذ)."
          action={
            <Link href={`/dashboard/orders?order=${order}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              فتح الطلب <Mono className="ms-1">#{order}</Mono>
            </Link>
          }
        />
      ) : (
        <ReturnForm key={order} orderId={order} items={items.data} />
      )}
    </div>
  );
}

function makeSchema(items: ReturnableItem[]) {
  return newReturnSchema.superRefine((v, ctx) => {
    let any = false;
    v.lines.forEach((l, i) => {
      if (!l.selected) return;
      any = true;
      const item = items[i];
      const n = Number(l.quantity);
      if (!/^\d+$/.test(l.quantity.trim()) || n < 1) ctx.addIssue({ code: "custom", path: ["lines", i, "quantity"], message: "أدخل كمية صحيحة (1 أو أكثر)." });
      else if (item && n > item.remaining) ctx.addIssue({ code: "custom", path: ["lines", i, "quantity"], message: `المتبقي ${item.remaining}` });
    });
    if (!any) ctx.addIssue({ code: "custom", path: ["lines"], message: "حدد سطراً واحداً على الأقل." });
  });
}

function ReturnForm({ orderId, items }: { orderId: number; items: ReturnableItem[] }) {
  const router = useRouter();
  const create = useCreateReturn();
  const schema = useMemo(() => makeSchema(items), [items]);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<NewReturnInput>({
    resolver: zodResolver(schema),
    shouldFocusError: true,
    defaultValues: {
      reason: "",
      refund_method: undefined,
      lines: items.map((it) => ({ fulfillment_item_id: it.fulfillment_item_id, selected: false, quantity: it.remaining > 0 ? "1" : "0", restock: true })),
    },
  });
  const { register, handleSubmit, formState, setError, control } = form;
  const lines = useWatch({ control, name: "lines" });

  const estimate = useMemo(() => {
    let total = "0";
    let count = 0;
    (lines ?? []).forEach((l, i) => {
      const it = items[i];
      if (!l?.selected || !it || !/^\d+$/.test(l.quantity ?? "")) return;
      const q = Math.min(Number(l.quantity), it.remaining);
      if (q < 1) return;
      count++;
      total = addDecimal(total, mulDecimal(it.unit_refund_amount, String(q)));
    });
    return { total, count };
  }, [lines, items]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const picked = values.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.selected);
    try {
      const res = await create.mutateAsync({
        order_id: orderId,
        reason: values.reason.trim(),
        refund_method: values.refund_method,
        line_items: picked.map(({ l }) => ({ fulfillment_item_id: l.fulfillment_item_id, quantity_returned: Number(l.quantity), restock: l.restock })),
      });
      toast.success(`أُنشئ الإرجاع #${res.id}`);
      router.push(`/dashboard/returns/${res.id}`);
    } catch (e) {
      if (!isApiError(e)) return setFormError("تعذّر الاتصال — تحقق من قائمة المرتجعات قبل إعادة الإرسال.");
      const body = (e.body ?? {}) as Record<string, unknown>;
      let focused = false;
      const focus = { shouldFocus: true };
      if (Array.isArray(body.line_items)) {
        (body.line_items as unknown[]).forEach((entry, k) => {
          if (typeof entry === "string") return setFormError(entry);
          const errs = (entry ?? {}) as Record<string, string[]>;
          const target = picked[k];
          const msg = errs.quantity_returned?.[0] ?? errs.fulfillment_item_id?.[0];
          if (target && msg) {
            setError(`lines.${target.i}.quantity`, { message: msg }, focused ? undefined : focus);
            focused = true;
          }
        });
      }
      for (const key of ["reason", "refund_method"] as const) {
        const msg = (body[key] as string[] | undefined)?.[0];
        if (msg) {
          setError(key, { message: msg }, focused ? undefined : focus);
          focused = true;
        }
      }
      if (!focused) setFormError(e.userMessage);
    }
  });

  const linesError = (formState.errors.lines as { message?: string; root?: { message?: string } } | undefined)?.message ?? (formState.errors.lines as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => void onSubmit(e)} noValidate data-testid="return-form">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          عناصر الطلب <Mono>#{orderId}</Mono>
        </h2>
        <ul className="rounded-lg border border-border" data-testid="returnable-items">
          {items.map((it, i) => {
            const full = it.remaining <= 0;
            const selected = Boolean(lines?.[i]?.selected);
            const err = formState.errors.lines?.[i]?.quantity?.message;
            return (
              <li key={it.fulfillment_item_id} className={cn("flex flex-col gap-3 border-b border-border p-3 last:border-0 md:flex-row md:items-center", full && "opacity-60")} data-testid="returnable-item" data-remaining={it.remaining}>
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" className="size-4 shrink-0 accent-foreground" disabled={full} {...register(`lines.${i}.selected`)} data-testid="item-select" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="truncate">{it.product_name}</span>
                      {it.product_deleted ? <span className="rounded border border-border px-1 text-[11px] text-muted-foreground">محذوف</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {it.sku ? (
                        <>
                          <Mono>{it.sku}</Mono> ·{" "}
                        </>
                      ) : null}
                      {it.location_name ?? "—"} · الكمية <Mono>{it.quantity}</Mono> ·{" "}
                      {full ? <span>أُرجع بالكامل</span> : <span>المتبقي <Mono>{it.remaining}</Mono></span>}
                    </span>
                  </span>
                </label>
                <span className="flex items-center gap-3 ps-7 md:ps-0">
                  <Money value={it.display_unit_refund_amount ?? it.unit_refund_amount} className="text-sm text-muted-foreground" />
                  <label className="flex flex-col gap-1">
                    <span className="sr-only">الكمية المرتجعة لـ {it.product_name}</span>
                    <input
                      inputMode="numeric"
                      dir="ltr"
                      className={cn(numericInputClass, "w-20")}
                      disabled={full || !selected}
                      aria-invalid={Boolean(err)}
                      {...register(`lines.${i}.quantity`)}
                      data-testid="item-qty"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm whitespace-nowrap">
                    <input type="checkbox" className="size-4 accent-foreground" disabled={full || !selected} {...register(`lines.${i}.restock`)} data-testid="item-restock" />
                    إعادة للمخزون
                  </label>
                </span>
                {err ? (
                  <p role="alert" className="text-xs text-destructive md:basis-full" data-testid="item-error">
                    {err}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {linesError ? (
          <p role="alert" className="text-xs text-destructive">
            {linesError}
          </p>
        ) : null}
        <p className="flex flex-wrap items-baseline gap-2 text-sm" data-testid="return-estimate">
          <span className="text-muted-foreground">المجموع المتوقع</span>
          <Mono className="text-base font-medium">{estimate.total}</Mono>
          <span className="text-xs text-muted-foreground">تقديري — المبلغ النهائي من الخادم</span>
        </p>
      </section>

      <div className="grid max-w-2xl gap-4 md:grid-cols-2">
        <Field label="السبب" htmlFor="return-reason" required error={formState.errors.reason?.message}>
          <input id="return-reason" className={inputClass} {...register("reason")} aria-invalid={Boolean(formState.errors.reason)} data-testid="return-reason" />
        </Field>
        <Field label="طريقة الاسترجاع" htmlFor="return-method" required error={formState.errors.refund_method?.message} hint="محفظة العميل تتطلب محفظة قائمة؛ وإلا فاختر «رصيد متجر».">
          <NativeSelect id="return-method" className="h-11 md:h-8" {...register("refund_method")} aria-invalid={Boolean(formState.errors.refund_method)} data-testid="return-method">
            <option value="">اختر</option>
            {RETURN_REFUND_METHODS.map((m) => (
              <option key={m} value={m}>
                {RETURN_REFUND_METHOD_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="return-form-error">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 lg:h-9" disabled={create.isPending} data-testid="return-submit">
          {create.isPending ? "جارٍ الإنشاء…" : `إنشاء الإرجاع${estimate.count ? ` (${estimate.count})` : ""}`}
        </Button>
        <Link href="/dashboard/returns" className={cn(buttonVariants({ variant: "ghost" }), "h-11 lg:h-9")}>
          إلغاء
        </Link>
      </div>
    </form>
  );
}
