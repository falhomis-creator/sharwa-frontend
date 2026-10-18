"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { AccessGate } from "@/components/shared/access-gate";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateWallet } from "@/features/wallets/api";
import { newWalletSchema, type NewWalletInput } from "@/features/wallets/schemas";

/**
 * `/dashboard/customers/wallets/new` (M35 US-35.2.1): the phone (normalised the way the
 * server does it, previewed live), an optional name. An existing wallet → the server's 400
 * «توجد محفظة لهذا الرقم» under the field with a link to open it.
 */
export function NewWalletScreen() {
  return (
    <AccessGate feature="customer_wallets" permission="customers.edit_profile">
      <NewWalletForm />
    </AccessGate>
  );
}

function NewWalletForm() {
  const router = useRouter();
  const prefill = useSearchParams().get("phone") ?? "";
  const create = useCreateWallet();
  const form = useForm<NewWalletInput>({ resolver: zodResolver(newWalletSchema), defaultValues: { customer_phone: prefill, customer_name: "" } });
  const raw = useWatch({ control: form.control, name: "customer_phone" });
  const normalized = raw.trim() ? normalizePhone(raw) : "";

  const submit = form.handleSubmit(async (values) => {
    try {
      const wallet = await create.mutateAsync({ customer_phone: normalizePhone(values.customer_phone), customer_name: values.customer_name || undefined });
      toast.success(`أُنشئت محفظة ${wallet.customer_name}`);
      router.push(`/dashboard/customers/wallets/${wallet.id}`);
    } catch (e) {
      if (isApiError(e) && e.fields?.customer_phone) {
        form.setError("customer_phone", { message: String(e.fields.customer_phone) });
      } else if (isApiError(e) && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) form.setError(k as keyof NewWalletInput, { message: String(msg) });
      } else {
        toast.error(isApiError(e) ? e.userMessage : "تعذّر إنشاء المحفظة.");
      }
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="محفظة جديدة" description="المحفظة بالريال السعودي، مفتاحها رقم هاتف العميل كما يستخدمه في الطلبات." />
      <form onSubmit={(e) => void submit(e)} noValidate className="flex max-w-md flex-col gap-4" data-testid="new-wallet-form">
        <Field
          label="رقم الهاتف"
          htmlFor="wallet-phone"
          required
          error={form.formState.errors.customer_phone?.message}
          hint={normalized ? <span>سيُحفظ كـ <Mono>{prettyPhone(normalized)}</Mono></span> : "مثال: 0770841802 — يُطبَّع إلى الصيغة الدولية تلقائياً"}
        >
          <input id="wallet-phone" dir="ltr" inputMode="tel" autoComplete="off" {...form.register("customer_phone")} className={`${inputClass} font-mono`} aria-invalid={Boolean(form.formState.errors.customer_phone)} />
        </Field>
        {form.formState.errors.customer_phone?.message?.includes("توجد محفظة") ? (
          <Link href={`/dashboard/customers/wallets?q=${encodeURIComponent(normalized)}`} className="text-sm underline-offset-4 hover:underline" data-testid="open-existing">
            فتح المحفظة الموجودة
          </Link>
        ) : null}
        <Field label="اسم العميل (اختياري)" htmlFor="wallet-name" error={form.formState.errors.customer_name?.message} hint="إن تُرك فارغاً يُؤخذ من آخر طلب للرقم.">
          <input id="wallet-name" {...form.register("customer_name")} className={inputClass} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" className="h-11 lg:h-9" disabled={create.isPending} data-testid="create-wallet">
            {create.isPending ? "يُنشئ…" : "إنشاء المحفظة"}
          </Button>
          <Link href="/dashboard/customers/wallets" className={cn(buttonVariants({ variant: "ghost" }), "h-11 lg:h-9")}>
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}
