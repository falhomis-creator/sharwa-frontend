"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/** «شارك رابط متجرك» for the empty overview (M03 US-03.4.3). */
export function CopyStoreLink({ storeUrl }: { storeUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast("تم نسخ رابط المتجر");
    } catch {
      toast("تعذّر النسخ — انسخ الرابط يدوياً");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted"
    >
      {copied ? (
        <Check className="size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        <Copy className="size-4" strokeWidth={1.75} aria-hidden />
      )}
      نسخ رابط المتجر
    </button>
  );
}
