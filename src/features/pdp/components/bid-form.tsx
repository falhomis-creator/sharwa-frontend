"use client";

import { useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, prettyPhone } from "@/lib/format";

/**
 * Bidder identity (M37 §10 assumption, adopted 2026-10-19 — Phase 7 decision 4): NAME + PHONE
 * only, no WhatsApp OTP — buyers have no accounts in the first release. The body is the M37
 * contract `{bidder_name, bidder_phone, amount}`. A bottom drawer on phones (M37 §6 «نموذج
 * المزايدة في drawer سفلي»), a dialog from `sm` up. 409 (outbid / ended) is shown verbatim.
 */
const SM = "(min-width: 640px)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(SM);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(SM).matches, () => false);
}

/** Yemen/KSA mobile after normalisation: 967 7xxxxxxxx or 966 5xxxxxxxx. */
const PHONE_RE = /^(9677\d{8}|9665\d{8})$/;

export interface Bidder {
  bidder_name: string;
  bidder_phone: string;
}

export function BidForm({
  open,
  onOpenChange,
  amount,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The server's suggested next bid (`display_next_bid`) — never computed locally. */
  amount: string;
  /** Place the bid; throw an `ApiError` to show its message (409 outbid, 400 field errors). */
  onSubmit: (bidder: Bidder) => Promise<void>;
}) {
  const desktop = useIsDesktop();
  const title = "تأكيد المزايدة";
  const description = "اكتب اسمك ورقم جوالك ليتواصل معك المتجر إن فزت بالمزاد.";
  const body = <BidFields amount={amount} onDone={() => onOpenChange(false)} onSubmit={onSubmit} />;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="bid-form">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid="bid-form">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pt-0">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}

function BidFields({ amount, onSubmit, onDone }: { amount: string; onSubmit: (b: Bidder) => Promise<void>; onDone: () => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const normalized = phone.trim() ? normalizePhone(phone) : "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "اكتب اسمك.";
    if (!PHONE_RE.test(normalized)) next.phone = "أدخل رقم جوال صحيحاً، مثل 777123456.";
    setErrors(next);
    if (next.name || next.phone) return;
    setBusy(true);
    try {
      await onSubmit({ bidder_name: name.trim(), bidder_phone: normalized });
      setName("");
      setPhone("");
      onDone();
    } catch (err) {
      const fields = isApiError(err) ? (err.body as Record<string, unknown> | undefined) : undefined;
      const first = (k: string) => (Array.isArray(fields?.[k]) ? String((fields[k] as unknown[])[0]) : undefined);
      setErrors({
        name: first("bidder_name"),
        phone: first("bidder_phone"),
        form: first("bidder_name") || first("bidder_phone") ? undefined : isApiError(err) ? err.userMessage : "تعذّر تسجيل المزايدة.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)} noValidate>
      <Field id={`${id}-name`} label="الاسم" error={errors.name}>
        <input
          id={`${id}-name`}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          data-testid="bid-name"
        />
      </Field>
      <Field id={`${id}-phone`} label="رقم الجوال" error={errors.phone}>
        <input
          id={`${id}-phone`}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(errors.phone)}
          className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 font-mono text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          data-testid="bid-phone"
        />
        {normalized ? (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {prettyPhone(normalized)}
          </p>
        ) : null}
      </Field>
      {errors.form ? (
        <p className="text-sm text-destructive" role="alert" data-testid="bid-error">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" className="h-12 w-full text-base" disabled={busy} data-testid="bid-submit">
        زايد بـ <Money value={amount} />
      </Button>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
