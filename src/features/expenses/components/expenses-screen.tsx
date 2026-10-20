"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from "react";
import Link from "next/link";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { ScrollX } from "@/components/shared/scroll-x";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { CURRENCY_LABELS } from "@/lib/schemas/money";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCreateExpense, useExpenses } from "@/features/expenses/api";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_CURRENCIES, expenseInputSchema, type Currency, type ExpenseInput, type ExpenseMonth } from "@/features/expenses/schemas";

/**
 * `/dashboard/wallet/expenses` (M33; the spec says `/dashboard/expenses`, the sidebar —
 * the source of truth — puts it under «محفظة المتجر»). Two columns on desktop: the entry
 * form fixed at the start, the ledger grouped by month at the end. Each month header shows
 * the server's total PER CURRENCY (FR-33.03) — the page never adds two amounts. Create only:
 * no edit/delete until the contract exists (FR-33.06). Filters + page in the URL (FR-33.04).
 */
const PAGE_SIZE = 50;
const parsers = {
  category: parseAsStringLiteral(EXPENSE_CATEGORIES),
  currency: parseAsStringLiteral(EXPENSE_CURRENCIES),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

const MD = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(MD).matches, () => true);

const LAST_CURRENCY_KEY = "sharwa.expenses.currency";
function rememberedCurrency(): Currency {
  try {
    const v = window.localStorage.getItem(LAST_CURRENCY_KEY);
    return (EXPENSE_CURRENCIES as readonly string[]).includes(v ?? "") ? (v as Currency) : "SAR";
  } catch {
    return "SAR";
  }
}

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const MONTH_FMT = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", numberingSystem: "latn", timeZone: "UTC" });
const DAY_FMT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", numberingSystem: "latn", timeZone: "UTC" });
const monthLabel = (ym: string) => MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`));
const dayLabel = (ymd: string) => DAY_FMT.format(new Date(`${ymd}T00:00:00Z`));

export function ExpensesScreen() {
  const { session } = useAccess();
  // §10: the backend view needs the merchant session and no permission key exists yet.
  if (session.kind !== "merchant") return <ForbiddenState title="المصروفات التشغيلية لمالك المتجر" description="لا توجد صلاحية مخصصة للمصروفات لدى الموظفين بعد." />;
  return <ExpensesInner />;
}

function ExpensesInner() {
  const { canFeature } = useAccess();
  const desktop = useIsDesktop();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [drawer, setDrawer] = useState(false);
  const amountRef = useRef<HTMLInputElement | null>(null);
  const filterRef = useRef<HTMLSelectElement | null>(null);
  const page = Math.max(1, f.page);
  const query = useExpenses({ category: f.category ?? undefined, currency: f.currency ?? undefined, from: f.from || undefined, to: f.to || undefined, page: page > 1 ? page : undefined });
  const set = (patch: Partial<{ category: (typeof EXPENSE_CATEGORIES)[number] | null; currency: Currency | null; from: string | null; to: string | null }>) => void setF({ ...patch, page: null });
  const filtered = Boolean(f.category || f.currency || f.from || f.to);
  const clear = () => void setF({ category: null, currency: null, from: null, to: null, page: null });

  // `N` → the amount field (or the drawer on the phone) · `/` → the filters (§6, FR-33.05).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (window.matchMedia(MD).matches) amountRef.current?.focus();
        else setDrawer(true);
      } else if (e.key === "/") {
        e.preventDefault();
        filterRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reportHref = `/dashboard/reports/operating_expenses${f.from || f.to ? `?${new URLSearchParams({ ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) }).toString()}` : ""}`;

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-0">
      <PageHeader
        title="المصروفات التشغيلية"
        description="قيود يدوية للتغليف والإيجار والرواتب وغيرها — لا تمسّ الطلبات أو المحافظ."
        actions={
          canFeature("reports") ? (
            <Link href={reportHref} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="report-link">
              عرض في التقارير
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {desktop ? (
          <aside className="self-start md:sticky md:top-4" aria-labelledby="expense-form-h">
            <h2 id="expense-form-h" className="mb-3 text-sm font-medium">مصروف جديد</h2>
            <ExpenseForm amountRef={amountRef} />
          </aside>
        ) : null}
        <section className="flex min-w-0 flex-col gap-3" aria-label="دفتر المصروفات">
          <Filters f={f} set={set} filterRef={filterRef} filtered={filtered} clear={clear} />
          <Ledger months={query.data?.months} isLoading={query.isLoading} isFetching={query.isFetching} error={query.error} onRetry={() => void query.refetch()} filtered={filtered} clear={clear} />
          {query.data && query.data.count > PAGE_SIZE ? <TablePagination page={page} pageSize={PAGE_SIZE} total={query.data.count} onPageChange={(p) => void setF({ page: p <= 1 ? null : p })} /> : null}
        </section>
      </div>
      {!desktop ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button type="button" className="h-11 w-full" onClick={() => setDrawer(true)} data-testid="new-expense-mobile">
              مصروف جديد
            </Button>
          </div>
          <Drawer open={drawer} onOpenChange={setDrawer}>
            <DrawerContent data-testid="expense-drawer">
              <DrawerHeader className="border-b border-border text-start">
                <DrawerTitle>مصروف جديد</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <ExpenseForm amountRef={amountRef} autoFocus onSaved={() => setDrawer(false)} />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : null}
    </div>
  );
}

function ExpenseForm({ amountRef, autoFocus, onSaved }: { amountRef: MutableRefObject<HTMLInputElement | null>; autoFocus?: boolean; onSaved?: () => void }) {
  const create = useCreateExpense();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseInputSchema),
    defaultValues: { category: "other", amount: "", currency: "SAR", expense_date: today(), note: "" },
  });
  const { register, control, formState: { errors, isSubmitting } } = form;
  const date = useWatch({ control, name: "expense_date" });
  const future = Boolean(date) && date > today();
  useEffect(() => {
    form.setValue("currency", rememberedCurrency());
    if (autoFocus) window.setTimeout(() => form.setFocus("amount"), 50);
  }, [form, autoFocus]);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await create.mutateAsync({ ...v, amount: toWesternDigits(v.amount.trim()), note: v.note.trim() });
      toast.success("تم تسجيل المصروف التشغيلي.");
      try {
        window.localStorage.setItem(LAST_CURRENCY_KEY, v.currency);
      } catch {
        // per-viewer convenience only
      }
      // US-33.1.2: empty the form but keep the last date and currency.
      form.reset({ category: v.category, amount: "", currency: v.currency, expense_date: v.expense_date, note: "" });
      window.setTimeout(() => form.setFocus("amount"), 0);
      onSaved?.();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        let any = false;
        for (const [k, msgs] of Object.entries(err.fields)) {
          if (k in v && msgs[0]) {
            form.setError(k as keyof ExpenseInput, { type: "server", message: msgs[0] });
            any = true;
          }
        }
        if (any) return;
      }
      // §8: a network failure keeps the values; no automatic resend (no idempotency key).
      setFormError(isApiError(err) ? err.userMessage : "تعذّر الحفظ — تحقق من الاتصال وأعد المحاولة.");
    }
  });

  const amountReg = register("amount");
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="expense-form">
      <Field label="الفئة" htmlFor="expense-category" error={errors.category?.message} required>
        <NativeSelect id="expense-category" {...register("category")} className="h-11 lg:h-9" data-testid="expense-category">
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-3">
        <Field label="المبلغ" htmlFor="expense-amount" error={errors.amount?.message} required>
          <input
            id="expense-amount"
            {...amountReg}
            ref={(el) => {
              amountReg.ref(el);
              amountRef.current = el;
            }}
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            className={numericInputClass}
            aria-invalid={!!errors.amount}
            data-testid="expense-amount"
          />
        </Field>
        <Field label="العملة" htmlFor="expense-currency" error={errors.currency?.message} required>
          <NativeSelect id="expense-currency" {...register("currency")} className="h-11 font-mono lg:h-9" data-testid="expense-currency">
            {EXPENSE_CURRENCIES.map((c) => (
              <option key={c} value={c} title={CURRENCY_LABELS[c]}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field
        label="التاريخ"
        htmlFor="expense-date"
        error={errors.expense_date?.message}
        required
        hint={future ? <span className="text-warning" data-testid="future-date">تاريخ في المستقبل — سيُقبل كما هو.</span> : undefined}
      >
        <input id="expense-date" type="date" {...register("expense_date")} dir="ltr" className={`${inputClass} font-mono`} aria-invalid={!!errors.expense_date} data-testid="expense-date" />
      </Field>
      <Field label="ملاحظة" htmlFor="expense-note" error={errors.note?.message} hint="اختيارية. Enter يحفظ.">
        <input id="expense-note" {...register("note")} className={inputClass} autoComplete="off" data-testid="expense-note" />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive" data-testid="expense-form-error">
          {formError}
        </p>
      ) : null}
      <Button type="submit" className="h-11 lg:h-9" disabled={isSubmitting} data-testid="expense-save">
        {isSubmitting ? "جارٍ الحفظ…" : "حفظ المصروف"}
      </Button>
    </form>
  );
}

type FilterState = { category: (typeof EXPENSE_CATEGORIES)[number] | null; currency: Currency | null; from: string; to: string };

function Filters({ f, set, filterRef, filtered, clear }: { f: FilterState; set: (p: Partial<{ category: FilterState["category"]; currency: Currency | null; from: string | null; to: string | null }>) => void; filterRef: MutableRefObject<HTMLSelectElement | null>; filtered: boolean; clear: () => void }) {
  const dateInput = "h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8";
  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="expense-filters">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">الفئة</span>
        <NativeSelect ref={filterRef} value={f.category ?? ""} onChange={(e) => set({ category: (e.target.value || null) as FilterState["category"] })} className="h-11 md:h-8" data-testid="filter-category">
          <option value="">كل الفئات</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">العملة</span>
        <NativeSelect value={f.currency ?? ""} onChange={(e) => set({ currency: (e.target.value || null) as Currency | null })} className="h-11 font-mono md:h-8" data-testid="filter-currency">
          <option value="">الكل</option>
          {EXPENSE_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">من</span>
        <input type="date" dir="ltr" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value || null })} className={dateInput} aria-label="من تاريخ" data-testid="filter-from" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">إلى</span>
        <input type="date" dir="ltr" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value || null })} className={dateInput} aria-label="إلى تاريخ" data-testid="filter-to" />
      </label>
      {filtered ? (
        <button type="button" onClick={clear} className="inline-flex h-11 items-center rounded-md px-2 text-sm text-muted-foreground hover:text-foreground md:h-8">
          مسح الفلاتر
        </button>
      ) : null}
    </div>
  );
}

function Ledger({ months, isLoading, isFetching, error, onRetry, filtered, clear }: { months?: ExpenseMonth[]; isLoading: boolean; isFetching: boolean; error: unknown; onRetry: () => void; filtered: boolean; clear: () => void }) {
  if (isLoading)
    return (
      <div className="flex flex-col gap-0 surface-card" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-11 items-center border-b border-border px-3 last:border-0">
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        ))}
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!months || months.length === 0)
    return filtered ? (
      <EmptyState
        title="لا مصروفات تطابق الفلاتر"
        action={
          <button type="button" onClick={clear} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
            مسح الفلاتر
          </button>
        }
      />
    ) : (
      <EmptyState title="لا مصروفات مسجَّلة بعد — سجّل أول مصروف من النموذج أعلاه" />
    );
  return (
    <div className={cn("flex flex-col gap-4", isFetching && "opacity-70 transition-opacity")} data-testid="expense-ledger">
      {months.map((m) => (
        <section key={m.month} aria-labelledby={`m-${m.month}`} className="surface-card" data-testid="expense-month" data-month={m.month}>
          <header className="sticky top-0 z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-t-lg border-b border-border bg-card px-3 py-2 md:static">
            <h3 id={`m-${m.month}`} className="text-sm font-medium">
              {monthLabel(m.month)}
            </h3>
            {/* One total per currency, as sent — never a combined figure (US-33.2.1). */}
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm" data-testid="month-totals">
              {m.totals.map((t) => (
                <span key={t.currency} className="flex items-baseline gap-1" data-testid="month-total" data-currency={t.currency}>
                  <Money value={t.display_total} />
                  <Mono className="text-[11px] text-muted-foreground">{t.currency}</Mono>
                </span>
              ))}
            </span>
          </header>
          {/* The table needs ~36rem; the ledger column is narrower until xl (the sidebar
              takes its share from lg), so the list layout covers md–lg. */}
          <ScrollX className="hidden xl:block">
            <table className="w-full border-collapse text-sm">
            <caption className="sr-only">مصروفات {monthLabel(m.month)}</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="h-9 px-3 text-start font-normal">التاريخ</th>
                <th scope="col" className="h-9 px-3 text-start font-normal">الفئة</th>
                <th scope="col" className="h-9 px-3 text-end font-normal">المبلغ</th>
                <th scope="col" className="h-9 px-3 text-start font-normal">الملاحظة</th>
                <th scope="col" className="h-9 px-3 text-start font-normal">أدخله</th>
              </tr>
            </thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.id} className="h-11 border-b border-border last:border-0" data-testid="expense-row">
                  <td className="whitespace-nowrap px-3">
                    <time dateTime={r.expense_date}>
                      <Mono>{r.expense_date}</Mono>
                    </time>
                  </td>
                  <td className="whitespace-nowrap px-3">{EXPENSE_CATEGORY_LABELS[r.category]}</td>
                  <td className="whitespace-nowrap px-3 text-end">
                    <Money value={r.display_amount} />
                  </td>
                  <td className="max-w-64 px-3">
                    <span className="block truncate text-muted-foreground" title={r.note || undefined}>
                      {r.note || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 text-muted-foreground">{r.created_by_name ?? "المالك"}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </ScrollX>
          <ul className="divide-y divide-border xl:hidden">
            {m.rows.map((r) => (
              <li key={r.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm" data-testid="expense-item">
                <time dateTime={r.expense_date} className="w-14 shrink-0 text-xs text-muted-foreground">
                  {dayLabel(r.expense_date)}
                </time>
                <span className="min-w-0 flex-1 truncate" title={r.note || undefined}>
                  {EXPENSE_CATEGORY_LABELS[r.category]}
                  {r.note ? <span className="text-muted-foreground"> · {r.note}</span> : null}
                </span>
                <Money value={r.display_amount} className="shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
