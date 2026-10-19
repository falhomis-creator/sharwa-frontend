"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Arabic file picker for the dashboard and Sharwa Pay. The native `<input type=file>` prints
 * the BROWSER's locale («Choose File · No file chosen») whatever the page says, so it stays in
 * the DOM — same `name`, `accept`, `onChange` and `data-testid`, so forms, `FormData` and
 * `setInputFiles` keep working — but visually hidden; a 44px labelled button stands in for
 * it and the picked file's name shows beside it (Mono), or «لم يُختر ملف».
 *
 * Keyboard: the hidden input keeps focus order; Tab lands on it, Space/Enter opens the
 * dialog, and the button shows the focus ring through `peer-focus-visible`.
 *
 * The shown name is read back from `input.files` after the caller's `onChange` runs, so a
 * caller that rejects a file by clearing `e.target.value` also clears the name.
 */
export function FilePicker({
  id,
  className,
  buttonClassName,
  buttonLabel = "اختر ملفاً",
  emptyLabel = "لم يُختر ملف",
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  buttonClassName?: string;
  buttonLabel?: string;
  emptyLabel?: string;
}) {
  const auto = useId();
  const inputId = id ?? `${auto}-file`;
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);

  // A native form reset clears the input without a change event.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => setName(null);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <input
        ref={ref}
        id={inputId}
        type="file"
        className="peer sr-only"
        onChange={(e) => {
          onChange?.(e);
          const files = e.currentTarget.files;
          setName(files && files.length ? Array.from(files, (f) => f.name).join("، ") : null);
        }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-aria-invalid:border-destructive",
          buttonClassName,
        )}
      >
        <Paperclip aria-hidden className="size-4" strokeWidth={1.75} />
        {buttonLabel}
      </label>
      {name ? (
        <span data-mono dir="ltr" className="min-w-0 truncate font-mono text-sm tabular-nums" title={name} data-testid="file-picker-name">
          {name}
        </span>
      ) : (
        <span className="min-w-0 truncate text-sm text-muted-foreground">{emptyLabel}</span>
      )}
    </div>
  );
}
