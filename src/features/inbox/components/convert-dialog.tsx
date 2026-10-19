"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { isApiError } from "@/lib/api-error";
import { useConvertToOrder } from "@/features/inbox/api";
import { convertFormSchema, type ConversationDetail } from "@/features/inbox/schemas";
import { ProductPicker } from "@/features/inbox/components/reply-box";

/**
 * US-27.3 acceptance 1 / SC-27.3: the M06 manual order, prefilled from the context (name,
 * phone, city as the start of the address). On save the order number lands in the context
 * column (`ChannelOrderLink`).
 */
export function ConvertDialog({ open, onOpenChange, detail }: { open: boolean; onOpenChange: (o: boolean) => void; detail: ConversationDetail }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="convert-dialog">
        {open ? <ConvertBody onOpenChange={onOpenChange} detail={detail} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted per opening: the prefill is read once from the context at that moment. */
function ConvertBody({ onOpenChange, detail }: { onOpenChange: (o: boolean) => void; detail: ConversationDetail }) {
  const convert = useConvertToOrder(detail.id);
  const [name, setName] = useState(detail.contact.name);
  const [phone, setPhone] = useState(detail.contact.phone ?? "");
  const [address, setAddress] = useState(detail.contact.city ? `${detail.contact.city} — ` : "");
  const [items, setItems] = useState<Array<{ product_id: number; name: string; quantity: number }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);

  async function save() {
    const parsed = convertFormSchema.safeParse({ customer_name: name, customer_phone: phone, address, items });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) e[String(issue.path[0])] ??= issue.message;
      setErrors(e);
      return;
    }
    setErrors({});
    try {
      const res = await convert.mutateAsync({ ...parsed.data, delivery: "delivery", items: parsed.data.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) });
      toast.success(`أُنشئ الطلب #${res.order_id} وربط بالمحادثة.`);
      onOpenChange(false);
    } catch (err) {
      if (isApiError(err) && err.fields) {
        const e: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) e[k.split(".")[0]!] ??= v[0] ?? "";
        setErrors(e);
      } else toast.error(isApiError(err) ? err.userMessage : "تعذّر إنشاء الطلب.");
    }
  }

  return (
    <>
        <DialogTitle>تحويل المحادثة إلى طلب</DialogTitle>
        <DialogDescription>طلب هاتفي بيانات عميله من المحادثة — راجعها قبل الحفظ.</DialogDescription>
        <div className="flex flex-col gap-3">
          <Field label="اسم العميل" htmlFor="cv-name" error={errors.customer_name} required>
            <input id="cv-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.customer_name)} />
          </Field>
          <Field label="الهاتف" htmlFor="cv-phone" error={errors.customer_phone} hint="بصيغة دولية، مثل 967771234567" required>
            <input id="cv-phone" dir="ltr" inputMode="tel" className={numericInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.customer_phone)} />
          </Field>
          <Field label="عنوان التوصيل" htmlFor="cv-address" error={errors.address} required>
            <input id="cv-address" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={Boolean(errors.address)} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">المنتجات</span>
              <button type="button" onClick={() => setPicker(true)} className="h-11 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8" data-testid="convert-add-product">
                إضافة منتج
              </button>
            </div>
            {items.length === 0 ? <p className="text-xs text-muted-foreground">لم تُضف منتجات بعد.</p> : null}
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border empty:hidden">
              {items.map((it, idx) => (
                <li key={it.product_id} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{it.name}</span>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    aria-label={`كمية ${it.name}`}
                    onChange={(e) => setItems((all) => all.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))}
                    className={`${numericInputClass} w-20`}
                  />
                  <button type="button" aria-label={`إزالة ${it.name}`} onClick={() => setItems((all) => all.filter((_, i) => i !== idx))} className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:size-8">
                    <X className="size-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {errors.items ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.items}
              </p>
            ) : null}
            {items.length ? (
              <p className="text-xs text-muted-foreground">
                <Mono>{items.reduce((n, i) => n + i.quantity, 0)}</Mono> قطعة — يحسب الخادم الإجمالي ورسوم التوصيل.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button className="h-11 lg:h-9" onClick={() => void save()} disabled={convert.isPending} data-testid="convert-save">
            {convert.isPending ? "جارٍ الحفظ…" : "إنشاء الطلب"}
          </Button>
        </DialogFooter>
        <ProductPicker
          open={picker}
          onOpenChange={setPicker}
          title="إضافة منتج إلى الطلب"
          onPick={(p) => {
            setPicker(false);
            setItems((all) => (all.some((x) => x.product_id === p.id) ? all.map((x) => (x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x)) : [...all, { product_id: p.id, name: p.name, quantity: 1 }]));
          }}
        />
    </>
  );
}
