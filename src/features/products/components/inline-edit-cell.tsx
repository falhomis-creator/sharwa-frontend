"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Double-click (or Enter on the focused cell) to edit in place; Enter saves, Esc cancels
 * (US-04.1.3, FR-04.11). A blocked cell explains why instead of silently ignoring the
 * gesture (the auction, the variants, the serial numbers, the permission).
 */
export function InlineEditCell({
  value,
  display,
  onSave,
  validate,
  blockedReason,
  label,
  inputMode = "decimal",
  testId,
}: {
  value: string;
  display: ReactNode;
  onSave: (next: string) => Promise<unknown> | void;
  validate?: (next: string) => string | null;
  blockedReason?: string | null;
  label: string;
  inputMode?: "decimal" | "numeric";
  testId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (blockedReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help items-center justify-end gap-1" tabIndex={0} />}>
          {display}
        </TooltipTrigger>
        <TooltipContent side="top">{blockedReason}</TooltipContent>
      </Tooltip>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        data-testid={testId}
        onDoubleClick={() => {
          setDraft(value);
          setError(null);
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            e.stopPropagation();
            setDraft(value);
            setError(null);
            setEditing(true);
          }
        }}
        title="انقر نقرتين للتعديل"
        aria-label={`${label}: انقر نقرتين أو Enter للتعديل`}
        className="inline-flex min-h-8 w-full items-center justify-end rounded-sm px-1 hover:bg-muted focus-visible:outline-1 focus-visible:outline-ring"
      >
        {display}
      </button>
    );
  }

  async function commit() {
    const next = draft.trim();
    const err = validate?.(next) ?? null;
    if (err) {
      setError(err);
      return;
    }
    setEditing(false);
    if (next !== value) await onSave(next);
  }

  return (
    <span className="relative inline-flex w-full flex-col items-end">
      <input
        ref={inputRef}
        dir="ltr"
        inputMode={inputMode}
        value={draft}
        aria-label={label}
        aria-invalid={Boolean(error)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className={cn(
          "h-8 w-24 rounded-md border border-ring bg-background px-2 text-end font-mono text-sm tabular-nums outline-none",
          error && "border-destructive",
        )}
      />
      {error ? <span className="absolute top-full z-10 mt-0.5 whitespace-nowrap text-[11px] text-destructive">{error}</span> : null}
    </span>
  );
}
