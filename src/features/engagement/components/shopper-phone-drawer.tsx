"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, prettyPhone } from "@/lib/format";
import { useSetShopperPhone, useToggleWishlist } from "@/features/engagement/api";
import { useShopperUi } from "@/features/engagement/shopper-ui";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * «رقم هاتفك» — the one-time bottom panel of M42 US-42.1.2: a local number (`07…`), no OTP,
 * normalised by the server and shown back as it returned it. Once saved, the pending
 * wishlist toggle that opened the panel is replayed.
 */
export function ShopperPhoneDrawer() {
  const { store } = useStorefront();
  const open = useShopperUi((s) => s.open);
  const pending = useShopperUi((s) => s.pending);
  const close = useShopperUi((s) => s.close);
  const save = useSetShopperPhone(store);
  const toggle = useToggleWishlist(store);
  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()}>
      <DrawerContent data-testid="shopper-phone">
        <DrawerHeader className="border-b border-border text-start">
          <DrawerTitle>رقم هاتفك</DrawerTitle>
          <DrawerDescription>مرة واحدة فقط — نحفظ قائمتك على رقمك لتجدها على أي جهاز.</DrawerDescription>
        </DrawerHeader>
        <div className="px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <ShopperPhoneForm
            busy={save.isPending}
            onSubmit={async (phone) => {
              await save.mutateAsync(phone);
              close();
              if (pending !== null) toggle.mutate(pending);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** The same form inline (the wishlist page asks for the number when the session has none). */
export function ShopperPhoneForm({ busy, onSubmit, submitLabel = "حفظ" }: { busy: boolean; onSubmit: (phone: string) => Promise<void>; submitLabel?: string }) {
  const id = useId();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const normalized = phone.trim() ? normalizePhone(phone) : "";
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await onSubmit(normalized);
        } catch (err) {
          setError(isApiError(err) ? (err.fields?.phone?.[0] ?? err.userMessage) : "تعذّر حفظ الرقم.");
        }
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium">
        رقم واتساب
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0770841802"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          className="store-frame h-11 min-w-0 flex-1 rounded-lg border-input bg-background px-3 font-mono text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button type="submit" className="h-11" disabled={!phone.trim() || busy} data-testid="shopper-phone-submit">
          {submitLabel}
        </Button>
      </div>
      {normalized ? (
        <p className="text-xs text-muted-foreground" dir="ltr">
          {prettyPhone(normalized)}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
