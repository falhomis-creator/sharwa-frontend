"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { normalizeArabic } from "@/lib/i18n/normalize";

/** A radio group drawn as a 1px segmented control (zinc; checked = foreground border). */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border p-1">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex h-9 cursor-pointer items-center justify-center rounded-md text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            value === o.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={disabled}
            onChange={() => onChange(o.value)}
            className="sr-only"
            id={value === o.value ? name : undefined}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** «الوقت الآن بالمنطقة …» — re-rendered every 30s (FR-34.13). */
function useClock(timeZone: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).format(now);
  } catch {
    return "—";
  }
}

/**
 * Searchable IANA time-zone picker (FR-34.13): the list comes from
 * `Intl.supportedValuesOf('timeZone')` — no server row exists for it (M34 §7).
 */
export function TimezonePicker({ id, value, onChange, disabled }: { id: string; value: string; onChange: (tz: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["Asia/Aden", "Asia/Riyadh", "UTC"];
    }
  }, []);
  const filtered = useMemo(() => {
    const needle = normalizeArabic(q).replace(/\s+/g, "_");
    return (needle ? zones.filter((z) => z.toLowerCase().includes(needle)) : zones).slice(0, 80);
  }, [q, zones]);
  const clock = useClock(value);

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 dark:bg-input/30"
          data-testid="timezone-trigger"
        >
          <Mono dir="ltr">{value}</Mono>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="end">
          <Command shouldFilter={false} label="المنطقة الزمنية">
            <CommandInput value={q} onValueChange={setQ} placeholder="ابحث: Aden، Riyadh…" className="text-sm" />
            <CommandList className="max-h-64">
              <CommandEmpty>لا منطقة تطابق</CommandEmpty>
              {filtered.map((z) => (
                <CommandItem
                  key={z}
                  value={z}
                  onSelect={() => {
                    onChange(z);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <Mono dir="ltr" className="flex-1 text-start text-xs">
                    {z}
                  </Mono>
                  {z === value ? <Check className="size-3.5" aria-hidden /> : null}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        الوقت الآن هناك: <Mono dir="ltr">{clock}</Mono>
      </p>
    </div>
  );
}

/** Hex colour: native picker + Mono hex input + 16px swatch with a 1px border. */
export function ColorInput({ id, value, onChange, disabled, fallback }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean; fallback: string }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="size-4 shrink-0 rounded-sm border border-border" style={{ backgroundColor: valid ? value : fallback }} />
      <input
        type="color"
        value={valid ? value : fallback}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="منتقي اللون"
        className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1 md:h-8"
      />
      <input
        id={id}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        disabled={disabled}
        aria-invalid={!valid}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:h-8 dark:bg-input/30"
      />
    </div>
  );
}
