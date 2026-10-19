"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ForbiddenState } from "@/components/shared/access-gate";
import { Field, inputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBox } from "@/components/shared/data-table/filter-bar";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { CURRENCY_LABELS } from "@/lib/schemas/money";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useProducts } from "@/features/products/api/products";
import { useB2bOptions, useCreateB2bDraft } from "@/features/b2b/api";
import { B2B_CURRENCIES, b2bCustomerSchema, type B2bCreated, type B2bLine } from "@/features/b2b/schemas";

/**
 * `/dashboard/orders/b2b/new` (M36 US-36.1): customer → lines → approver/branch/currency.
 * The payload is the Ready view's body verbatim and carries NO price (FR-36.01): the line
 * prices here are a preview from the catalogue, labelled «السعر النهائي من الخادم»
 * (US-36.1.3). The server's `detail` is shown verbatim (FR-36.02).
 */
export function B2bNewScreen() {
  const { canPermission, session } = useAccess();
  if (!canPermission("orders.create_b2b")) return <ForbiddenState title="إنشاء مسودات الجملة يتطلب صلاحية «إنشاء طلبات الجملة»" />;
  return <DraftForm ownerNotice={session.kind === "merchant"} />;
}

function DraftForm({ ownerNotice }: { ownerNotice: boolean }) {
  const options = useB2bOptions();
  const create = useCreateB2bDraft();
  const [customer, setCustomer] = useState({ customer_name: "", customer_phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<B2bLine[]>([]);
  const [q, setQ] = useState("");
  const results = useProducts({ q, page_size: 6, status: "published" }, { enabled: q.trim().length > 0 });
  const [roleId, setRoleId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<B2bCreated | null>(null);

  const setQty = (pid: number, qty: number) => setLines((ls) => ls.map((l) => (l.product_id === pid ? { ...l, quantity: Math.max(1, Math.floor(qty) || 1) } : l)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = b2bCustomerSchema.safeParse({ ...customer, customer_phone: toWesternDigits(customer.customer_phone).replace(/\D/g, "") });
    const next: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    if (!lines.length) next.items = "أضف منتجاً واحداً على الأقل.";
    if (options.data?.multi_location && !locationId) next.location_id = "اختر الفرع — المتجر متعدد الفروع.";
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) return;
    try {
      const res = await create.mutateAsync({
        ...parsed.data,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        ...(roleId ? { approver_role_id: Number(roleId) } : {}),
        ...(locationId ? { location_id: Number(locationId) } : {}),
        currency,
      });
      setCreated(res);
    } catch (err) {
      setServerError(isApiError(err) ? err.userMessage : "تعذّر إرسال المسودة.");
    }
  }

  const back = (
    <Link href="/dashboard/orders/b2b" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
      <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> مسودات الجملة
    </Link>
  );

  if (created)
    return (
      <div className="flex flex-col gap-5" data-testid="b2b-created">
        {back}
        <PageHeader title="أُرسلت المسودة" description={created.detail} />
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-1.5"><dt className="text-muted-foreground">رقم الطلب</dt><dd><Mono data-testid="created-order">#{created.order_id}</Mono></dd></div>
          <div className="flex gap-1.5"><dt className="text-muted-foreground">طلب الموافقة</dt><dd><Mono data-testid="created-approval">{created.approval_id !== null ? `#${created.approval_id}` : "—"}</Mono></dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/orders/${created.order_id}`} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">فتح الطلب</Link>
          <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => { setCreated(null); setLines([]); setCustomer({ customer_name: "", customer_phone: "", address: "" }); }}>
            مسودة أخرى
          </Button>
        </div>
      </div>
    );

  const inDraft = new Set(lines.map((l) => l.product_id));
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-6" data-testid="b2b-form">
      {back}
      <PageHeader title="مسودة جملة جديدة" description="طلب جملة لعميل تاجر، يُرسل لمعتمد يوافق أو يرفض. السعر يحدّده الخادم من سعر المنتج." />
      {ownerNotice ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground" data-testid="owner-notice">
          إنشاء المسودة يتم بحساب موظف — حساب المالك وحده يُرفض من الخادم.
        </p>
      ) : null}

      <section aria-labelledby="c-h" className="flex max-w-2xl flex-col gap-4">
        <h2 id="c-h" className="text-sm font-medium">العميل</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم العميل" htmlFor="b2b-name" error={errors.customer_name} required>
            <input id="b2b-name" value={customer.customer_name} onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })} className={inputClass} autoComplete="off" aria-invalid={!!errors.customer_name} data-testid="b2b-name" />
          </Field>
          <Field label="الهاتف" htmlFor="b2b-phone" error={errors.customer_phone} required>
            <input id="b2b-phone" value={customer.customer_phone} onChange={(e) => setCustomer({ ...customer, customer_phone: e.target.value })} inputMode="tel" dir="ltr" className={`${inputClass} font-mono`} autoComplete="off" aria-invalid={!!errors.customer_phone} data-testid="b2b-phone" />
          </Field>
        </div>
        <Field label="العنوان" htmlFor="b2b-address" error={errors.address} required>
          <input id="b2b-address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className={inputClass} autoComplete="off" aria-invalid={!!errors.address} data-testid="b2b-address" />
        </Field>
      </section>

      <section aria-labelledby="l-h" className="flex max-w-3xl flex-col gap-3">
        <h2 id="l-h" className="text-sm font-medium">السطور</h2>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث عن منتج بالاسم أو SKU" label="بحث المنتجات" />
        {q.trim() && results.data?.results.length ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="b2b-results">
            {results.data.results
              .filter((p) => !inDraft.has(p.id))
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setLines((ls) => [...ls, { product_id: p.id, name: p.name, sku: p.sku, display_price: p.display_price, quantity: 1 }]);
                      setQ("");
                    }}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-1.5 text-start text-sm hover:bg-muted"
                    data-testid="b2b-result"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
                    <Money value={p.display_price} muted />
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
        {lines.length ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="b2b-lines">
            {lines.map((l) => (
              <li key={l.product_id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm" data-testid="b2b-line">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{l.name}</span>
                  <Mono className="text-[11px] text-muted-foreground">{l.sku}</Mono>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => setQty(l.product_id, l.quantity - 1)} aria-label="إنقاص الكمية" className="flex size-11 items-center justify-center rounded-md border border-border lg:size-8">
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <input value={l.quantity} onChange={(e) => setQty(l.product_id, Number(toWesternDigits(e.target.value)))} inputMode="numeric" dir="ltr" aria-label={`كمية ${l.name}`} className="h-11 w-16 rounded-lg border border-input bg-background text-center font-mono text-sm lg:h-8" data-testid="b2b-qty" />
                  <button type="button" onClick={() => setQty(l.product_id, l.quantity + 1)} aria-label="زيادة الكمية" className="flex size-11 items-center justify-center rounded-md border border-border lg:size-8">
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </span>
                <span className="flex flex-col items-end" title="معاينة — السعر النهائي من الخادم">
                  <Money value={l.display_price} muted />
                  <span className="text-[11px] text-muted-foreground">للقطعة · السعر النهائي من الخادم</span>
                </span>
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.product_id !== l.product_id))} aria-label={`حذف ${l.name}`} className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-8">
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={errors.items ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role={errors.items ? "alert" : undefined}>
            {errors.items ?? "ابحث عن منتج لإضافته."}
          </p>
        )}
      </section>

      <section aria-labelledby="a-h" className="grid max-w-3xl gap-4 md:grid-cols-3">
        <h2 id="a-h" className="sr-only">الموافقة والفرع والعملة</h2>
        <Field label="دور المعتمد" htmlFor="b2b-role" hint="اتركه فارغاً لدور «مدير المتجر».">
          <NativeSelect id="b2b-role" value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-11 lg:h-9" data-testid="b2b-role">
            <option value="">{options.isLoading ? "جارٍ التحميل…" : "الافتراضي"}</option>
            {options.data?.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="الفرع"
          htmlFor="b2b-location"
          required={options.data?.multi_location}
          error={errors.location_id}
          hint={options.data && !options.data.locations.length ? <Link href="/dashboard/locations" className="underline">لا فروع — أنشئ فرعاً</Link> : undefined}
        >
          <NativeSelect id="b2b-location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-11 lg:h-9" aria-invalid={!!errors.location_id} data-testid="b2b-location">
            <option value="">{options.data?.multi_location ? "اختر الفرع" : "الفرع الافتراضي"}</option>
            {options.data?.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="العملة" htmlFor="b2b-currency" hint={CURRENCY_LABELS[currency as keyof typeof CURRENCY_LABELS]}>
          <NativeSelect id="b2b-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 font-mono lg:h-9" data-testid="b2b-currency">
            {B2B_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {serverError ? (
          <p role="alert" className="text-sm text-destructive" data-testid="b2b-server-error">
            {serverError}
            {/فرع/.test(serverError) ? (
              <Link href="/dashboard/locations" className="ms-2 underline">
                الفروع
              </Link>
            ) : null}
          </p>
        ) : null}
        <Button type="submit" className="h-11 self-start lg:h-9" disabled={create.isPending} data-testid="b2b-submit">
          {create.isPending ? "جارٍ الإرسال…" : "إرسال المسودة للموافقة"}
        </Button>
      </div>
    </form>
  );
}
