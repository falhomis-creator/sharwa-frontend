"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_BYTES, MAX_IMAGE_MESSAGE } from "@/features/products/api/products";

/**
 * Images for a product that is not saved yet (UI/UX overhaul 2026-10-22). Files picked or
 * dropped here stay in the browser with a local preview; the editor uploads them with the
 * ordinary `uploadImages` call right after the product is created. The first one is the
 * main image, exactly like the saved gallery.
 */
export type PendingImage = { id: string; file: File; url: string };

export function filesFromDrop(e: DragEvent): File[] {
  return Array.from(e.dataTransfer?.files ?? []);
}

export function PendingMedia({
  images,
  onChange,
  disabled,
}: {
  images: PendingImage[];
  onChange: (next: PendingImage[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  // Release the object URLs when the editor goes away.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function add(files: File[]) {
    setError("");
    if (files.length === 0) return;
    if (files.some((f) => !hasImageExtension(f.name))) {
      setError(IMAGE_EXTENSIONS_MESSAGE);
      return;
    }
    const tooBig = files.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig.length > 0) {
      setError(`${MAX_IMAGE_MESSAGE} (${tooBig.map((f) => f.name).join("، ")})`);
      return;
    }
    onChange([
      ...images,
      ...files.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`, file, url: URL.createObjectURL(file) })),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.url);
    onChange(images.filter((i) => i.id !== id));
  }

  function makeMain(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) onChange([img, ...images.filter((i) => i.id !== id)]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOver(false);
          add(filesFromDrop(e));
        }}
        className={cn(
          "flex flex-col gap-3 rounded-xl border-2 border-dashed p-3 transition-colors",
          over ? "border-primary bg-primary/5" : "border-border",
        )}
        data-testid="pending-media"
      >
        {images.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {images.map((img, i) => (
              <li key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {/* A local blob preview — next/image cannot optimise object URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`صورة ${i + 1}`} className="size-full object-cover" />
                {i === 0 ? (
                  <span className="absolute top-1.5 end-1.5 rounded-sm border border-border bg-card px-1.5 text-[11px]">الرئيسية</span>
                ) : !disabled ? (
                  <button
                    type="button"
                    onClick={() => makeMain(img.id)}
                    className="absolute top-1.5 end-1.5 min-h-11 rounded-sm border border-border bg-card px-1.5 text-[11px] lg:min-h-0"
                  >
                    اجعلها الرئيسية
                  </button>
                ) : null}
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => remove(img.id)}
                    aria-label={`إزالة الصورة ${i + 1}`}
                    className="absolute bottom-1.5 start-1.5 flex size-11 items-center justify-center rounded-md border border-border bg-background/90 text-destructive lg:size-7"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {!disabled ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted",
              images.length > 0 ? "py-3" : "py-10",
            )}
          >
            <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden />
            <span className="font-medium text-foreground">اسحب الصور وأفلتها هنا</span>
            <span className="text-xs">أو اضغط للاختيار من جهازك</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif"
        className="sr-only"
        aria-label="اختيار صور المنتج"
        onChange={(e) => add(Array.from(e.target.files ?? []))}
        data-testid="pending-media-input"
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">jpg, jpeg, png, webp, gif حتى 5MB للصورة — تُرفع مع حفظ المنتج واحدة تلو الأخرى، والأولى هي الرئيسية في المتجر.</p>
      )}
    </div>
  );
}
