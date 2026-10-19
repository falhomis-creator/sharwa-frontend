"use client";

import { useMemo, useRef, useState } from "react";
import { Package, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { UseMutationResult } from "@tanstack/react-query";
import { Mono } from "@/components/shared/mono";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { usePickProducts } from "@/features/inbox/api";
import type { Message, PickProduct } from "@/features/inbox/schemas";
import { useTemplates } from "@/features/channels/api";
import { newClientId } from "@/features/inbox/components/bits";

type Send = UseMutationResult<Message, Error, { text?: string; template_id?: number; product_id?: number; client_id: string }, unknown>;

/**
 * FR-27.07: multi-line text (`Enter` sends, `Shift+Enter` new line), `/` inserts a reply
 * template (editable before sending), a product attaches as a `product_card`. FR-27.06:
 * the bubble appears optimistically; on failure the text stays here for another try.
 */
export function ReplyBox({ conversationId, disabledReason, send }: { conversationId: number; disabledReason: string | null; send: Send }) {
  const [text, setText] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [active, setActive] = useState(0);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const slash = text.startsWith("/") ? text.slice(1).trim() : null;
  const templates = useTemplates(slash !== null && !disabledReason);
  const matches = useMemo(() => (slash === null ? [] : (templates.data ?? []).filter((t) => !slash || t.title.includes(slash) || t.body.includes(slash)).slice(0, 6)), [slash, templates.data]);
  const disabled = Boolean(disabledReason);

  function submit(extra: { product_id?: number } = {}) {
    const body = text.trim();
    if (!body && !extra.product_id) return;
    const payload = { text: body || undefined, template_id: templateId ?? undefined, ...extra, client_id: newClientId() };
    setText("");
    setTemplateId(null);
    send.mutate(payload, {
      onError: (e) => {
        setText(body); // keep the text for another try (FR-27.06)
        toast.error(isApiError(e) ? e.userMessage : "تعذّر الإرسال — النص محفوظ لإعادة المحاولة.");
      },
    });
  }

  function insertTemplate(id: number) {
    const t = templates.data?.find((x) => x.id === id);
    if (!t) return;
    setText(t.body);
    setTemplateId(t.id);
    setActive(0);
    requestAnimationFrame(() => area.current?.focus());
  }

  return (
    <div className="relative border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" data-testid="reply-box" data-conversation={conversationId}>
      {slash !== null && matches.length > 0 ? (
        <ul role="listbox" aria-label="قوالب الردّ" className="absolute inset-x-2 bottom-full mb-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-sm" data-testid="template-picker">
          {matches.map((t, i) => (
            <li key={t.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertTemplate(t.id)}
                className={cn("flex w-full min-h-11 flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-start lg:min-h-8", i === active && "bg-muted")}
              >
                <span className="text-sm font-medium">{t.title}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{t.body}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {disabledReason ? (
        <p className="px-1 pb-1.5 text-xs text-muted-foreground" data-testid="reply-disabled">
          {disabledReason}
        </p>
      ) : null}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
          aria-label="إرفاق منتج"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 lg:size-9"
          data-testid="attach-product"
        >
          <Package className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <textarea
          ref={area}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value) setTemplateId(null);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (slash !== null && matches.length > 0) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                insertTemplate(matches[active]!.id);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          dir="auto"
          placeholder={disabled ? "الردّ غير متاح" : "اكتب ردّاً… (/ للقوالب، Shift+Enter لسطر جديد)"}
          aria-label="نص الردّ"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-2.5 py-2.5 text-base outline-none field-sizing-content focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm lg:min-h-9 lg:py-1.5"
          data-testid="reply-input"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={disabled || !text.trim()}
          aria-label="إرسال"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 lg:size-9"
          data-testid="reply-send"
        >
          <SendHorizontal className="size-4 rtl:-scale-x-100" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <ProductPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(p) => {
          setPickerOpen(false);
          submit({ product_id: p.id });
        }}
      />
    </div>
  );
}

export function ProductPicker({ open, onOpenChange, onPick, title = "إرفاق منتج" }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (p: PickProduct) => void; title?: string }) {
  const [q, setQ] = useState("");
  const products = usePickProducts(q.trim(), open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="product-picker">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>ابحث بالاسم أو رمز SKU.</DialogDescription>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          aria-label="بحث عن منتج"
          className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring lg:h-9"
        />
        <ul className="max-h-72 overflow-y-auto">
          {(products.data ?? []).map((p) => (
            <li key={p.id} className="border-b border-border last:border-0">
              <button type="button" onClick={() => onPick(p)} className="flex w-full min-h-11 items-center gap-2 px-1 py-2 text-start hover:bg-muted" data-testid="pick-product">
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
                <Mono className="text-xs">{p.display_price}</Mono>
              </button>
            </li>
          ))}
          {products.data && products.data.length === 0 ? <li className="py-4 text-sm text-muted-foreground">لا منتجات تطابق البحث.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
