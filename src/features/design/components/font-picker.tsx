"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { STORE_FONTS, isStoreFont } from "@/features/storefront/theme/presets";
import { storeFontStack } from "@/features/storefront/theme/fonts";

/**
 * Font select where every option is drawn in its own font (US-08.2.1). The 11 families are
 * the storefront's self-hosted `next/font/local` faces (`preload: false`), so the dashboard
 * only downloads a face when this list is open and renders it — the sample sentence uses the
 * real family through `storeFontStack()`, falling back to IBM Plex Sans Arabic.
 */
const SAMPLE = "متجرك بخطّ عربي واضح ١٢٣";

export function FontPicker({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (font: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = isStoreFont(value) ? value : "IBM Plex Sans Arabic";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={`${label}: ${current}`}
        data-testid={`font-${id}`}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-2.5 text-start text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 dark:bg-input/30"
      >
        <span className="truncate" style={{ fontFamily: storeFontStack(current) }}>
          {current}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="max-h-80 w-(--anchor-width) min-w-64 overflow-y-auto p-1" align="start">
        <div role="listbox" aria-label={label}>
          {STORE_FONTS.map((font) => (
            <button
              key={font}
              type="button"
              role="option"
              aria-selected={font === current}
              data-font={font}
              onClick={() => {
                onChange(font);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                font === current && "bg-muted",
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col" style={{ fontFamily: storeFontStack(font) }}>
                <span className="text-sm font-medium">{font}</span>
                <span className="truncate text-xs text-muted-foreground">{SAMPLE}</span>
              </span>
              {font === current ? <Check className="size-4 shrink-0" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
