"use client";

import { useDeferredValue, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { useClients } from "@/features/platform-admin/api/hooks";
import type { ClientOption } from "@/features/platform-admin/schemas";

/**
 * M46 table + form primitives shared by the billing and catalog screens. Dense tables per
 * the constitution: 44px rows, horizontal hairlines only, sticky header, numeric cells
 * end-aligned Mono. Lists here are short (≤ 40 rows), so no server pagination.
 */
export function Table({ children, caption, testId, className }: { children: ReactNode; caption: string; testId?: string; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table data-testid={testId} className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, numeric, className }: { children?: ReactNode; numeric?: boolean; className?: string }) {
  return (
    <th scope="col" className={cn("sticky top-0 z-[1] h-10 whitespace-nowrap border-b border-border bg-background px-3 text-start text-xs font-normal text-muted-foreground", numeric && "text-end", className)}>
      {children}
    </th>
  );
}

export function Td({ children, numeric, className, colSpan }: { children?: ReactNode; numeric?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("h-11 border-b border-border px-3 align-middle [tr:last-child_&]:border-b-0", numeric && "text-end", className)}>
      {children}
    </td>
  );
}

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }, (_, j) => (
            <Td key={j}>
              <Skeleton className="h-4 w-full max-w-24" />
            </Td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function YesNo({ value, yes = "نعم", no = "لا" }: { value: boolean; yes?: string; no?: string }) {
  return <span className={value ? "text-foreground" : "text-muted-foreground"}>{value ? yes : no}</span>;
}

export function Limit({ value }: { value: number | null }) {
  return value === null ? <span className="text-xs text-muted-foreground">بلا حد</span> : <Mono>{value.toLocaleString("en-US")}</Mono>;
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" data-testid={`error-${htmlFor ?? label}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const INPUT = "h-11 lg:h-8";
export const BTN = "h-11 lg:h-8";

/** Server-searched store picker (`GET /platform/clients/?q`); single or multi with chips. */
export function StorePicker({
  value,
  onChange,
  multiple = false,
  disabled,
  id,
  testId = "store-picker",
}: {
  value: ClientOption[];
  onChange: (next: ClientOption[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  id?: string;
  testId?: string;
}) {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q.trim());
  const clients = useClients(deferred, deferred.length >= 1);
  const chosen = new Set(value.map((v) => v.schema_name));
  const options = (clients.data ?? []).filter((c) => !chosen.has(c.schema_name)).slice(0, 8);

  const pick = (c: ClientOption) => {
    onChange(multiple ? [...value, c] : [c]);
    setQ("");
  };

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <li key={c.schema_name} className="flex items-center gap-1 rounded-md border border-border ps-2 text-xs" data-testid="picked-store">
              <span>{c.name}</span>
              <Mono className="text-muted-foreground">{c.schema_name}</Mono>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((v) => v.schema_name !== c.schema_name))}
                aria-label={`إزالة ${c.name}`}
                className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground lg:size-7"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {multiple || value.length === 0 ? (
        <div className="relative">
          <Input
            id={id}
            value={q}
            disabled={disabled}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو المخطط أو الهاتف"
            className={INPUT}
            autoComplete="off"
            data-testid={`${testId}-input`}
          />
          {deferred && options.length ? (
            <ul role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1">
              {options.map((c) => (
                <li key={c.schema_name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pick(c)}
                    className="flex h-11 w-full items-center gap-2 rounded-sm px-2 text-start text-sm hover:bg-muted lg:h-8"
                    data-testid="store-option"
                  >
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <Mono className="text-xs text-muted-foreground">{c.schema_name}</Mono>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <button type="button" disabled={disabled} onClick={() => onChange([])} className="self-start text-xs text-muted-foreground underline underline-offset-4">
          تغيير المتجر
        </button>
      )}
    </div>
  );
}

export function clientFromSchema(schema: string): ClientOption {
  return { schema_name: schema, name: schema, merchant_phone: null, primary_domain: "", current_plan: null };
}
