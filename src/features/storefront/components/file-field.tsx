"use client";

import { PaperclipIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A file input in the store's language. The native control prints the BROWSER's locale
 * («Choose File · No file chosen») whatever the page says, so it is kept for semantics and
 * keyboard access only (visually hidden, still focusable) and a 44px Arabic button stands in
 * for it, showing the picked file's name.
 */
export function FileField({
  id,
  accept,
  onFile,
  invalid,
  className,
}: {
  id: string;
  accept: string;
  /** Return `false` to reject the file (the field is cleared). */
  onFile: (file: File | null) => boolean | void;
  invalid?: boolean;
  className?: string;
}) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <input
        id={id}
        type="file"
        accept={accept}
        aria-invalid={invalid || undefined}
        className="peer sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (onFile(file) === false) {
            e.target.value = "";
            setName(null);
            return;
          }
          setName(file?.name ?? null);
        }}
      />
      <label
        htmlFor={id}
        className="store-frame inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-aria-invalid:border-destructive"
      >
        <PaperclipIcon aria-hidden className="size-4" />
        اختر ملفاً
      </label>
      <span className={cn("min-w-0 truncate text-sm", name ? "text-foreground" : "text-muted-foreground")} dir="auto">
        {name ?? "لم يُختر ملف"}
      </span>
    </div>
  );
}
