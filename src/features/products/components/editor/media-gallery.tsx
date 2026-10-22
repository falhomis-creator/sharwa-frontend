"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { transformToString } from "@/lib/dnd";
import { GripVertical, ImagePlus, Link2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Mono } from "@/components/shared/mono";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { hasImageExtension, IMAGE_EXTENSIONS_MESSAGE } from "@/features/organization/schemas";
import type { ProductDetail, ProductImage } from "@/features/products/schemas";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MESSAGE,
  deleteImage,
  productKeys,
  reorderImages,
  uploadImagesSequential,
} from "@/features/products/api/products";
import { useProductEditorStore } from "@/stores/product-editor";
import { cn } from "@/lib/utils";

/**
 * Media gallery (US-04.4, FR-04.08): drag to reorder with @dnd-kit (the first image is the
 * main one, `sort_order` saved immediately), multi-upload with a local extension check, and
 * delete with a 5-second undo before the request is sent. The external `image_url` and
 * `video_url` appear as items tagged «رابط». Drag handles sit at the START side (II).
 */
const ANNOUNCE = {
  onDragStart: () => "بدأ سحب الصورة.",
  onDragOver: () => "",
  onDragEnd: ({ over }: { over: { id: string | number } | null }) => (over ? "أُفلتت الصورة في موضعها الجديد." : "أُلغي السحب."),
  onDragCancel: () => "أُلغي السحب.",
};

function SortableImage({
  image,
  index,
  onDelete,
  disabled,
}: {
  image: ProductImage;
  index: number;
  onDelete: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: image.id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: transformToString(transform), transition }}
      className={cn("group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted", isDragging && "z-10 ring-2 ring-primary")}
      data-testid="gallery-item"
    >
      <Image src={image.url} alt={`صورة ${index + 1}`} fill sizes="160px" unoptimized className="object-cover" />
      {index === 0 ? (
        <span className="absolute top-1.5 end-1.5 rounded-sm border border-border bg-card px-1.5 text-[11px]">الرئيسية</span>
      ) : null}
      {!disabled ? (
        <>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`اسحب لإعادة ترتيب الصورة ${index + 1}`}
            className="absolute top-1.5 start-1.5 flex size-11 cursor-grab items-center justify-center rounded-md border border-border bg-background/90 lg:size-7"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`حذف الصورة ${index + 1}`}
            className="absolute bottom-1.5 start-1.5 flex size-11 items-center justify-center rounded-md border border-border bg-background/90 text-destructive lg:size-7"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </>
      ) : null}
    </li>
  );
}

export function MediaGallery({ product, readOnly }: { product: ProductDetail; readOnly: boolean }) {
  const store = useStore();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState("");
  const order = useProductEditorStore((s) => s.galleryOrder[product.id]);
  const setOrder = useProductEditorStore((s) => s.setGalleryOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(product.images.map((i) => [i.id, i]));
  const ordered = (order ?? product.images.map((i) => i.id))
    .map((id) => byId.get(id))
    .filter((i): i is ProductImage => Boolean(i) && !hidden.includes(i!.id));

  const writeImages = (images: ProductImage[]) =>
    qc.setQueryData<ProductDetail>(productKeys(store).detail(product.id), (old) => (old ? { ...old, images } : old));

  async function onFiles(files: FileList | File[] | null) {
    setError("");
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const bad = list.find((f) => !hasImageExtension(f.name));
    if (bad) {
      setError(IMAGE_EXTENSIONS_MESSAGE);
      return;
    }
    if (list.some((f) => f.size > MAX_IMAGE_BYTES)) {
      setError(`${MAX_IMAGE_MESSAGE} (${list.filter((f) => f.size > MAX_IMAGE_BYTES).map((f) => f.name).join("، ")})`);
      return;
    }
    // One file per request (Nginx caps a request at 8 MB) — the gallery fills in as each lands.
    setUploading(true);
    try {
      const result = await uploadImagesSequential(product.id, list, (done, total) => setProgress(done < total ? `${done + 1}/${total}` : ""));
      if (result.images) writeImages(result.images);
      setOrder(product.id, undefined);
      if (result.uploaded > 0) toast.success(result.uploaded === 1 ? "رُفعت الصورة وحُفظت مع المنتج" : `رُفعت ${result.uploaded} صور وحُفظت مع المنتج`);
      if (result.failed.length > 0) setError(result.failed.map((f) => `${f.name}: ${f.message}`).join(" · "));
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id)));
    setOrder(product.id, next);
    try {
      writeImages(await reorderImages(product.id, next));
      setOrder(product.id, undefined);
    } catch {
      setOrder(product.id, undefined);
      toast.error("تعذّر حفظ الترتيب؛ أُعيد الترتيب السابق.");
    }
  }

  function onDelete(imageId: number) {
    setHidden((h) => [...h, imageId]);
    let undone = false;
    toast("حُذفت الصورة", {
      duration: 5000,
      action: {
        label: "تراجع",
        onClick: () => {
          undone = true;
          setHidden((h) => h.filter((x) => x !== imageId));
        },
      },
    });
    window.setTimeout(async () => {
      if (undone) return;
      try {
        writeImages(await deleteImage(product.id, imageId));
      } catch {
        toast.error("تعذّر حذف الصورة.");
      } finally {
        setHidden((h) => h.filter((x) => x !== imageId));
      }
    }, 5000);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Files dropped from the desktop upload at once (UI/UX overhaul 2026-10-22). */}
      <div
        onDragOver={(e) => {
          if (readOnly || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (readOnly || e.dataTransfer.files.length === 0) return;
          e.preventDefault();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
        className={cn("rounded-xl border-2 border-dashed p-2 transition-colors", dragOver ? "border-primary bg-primary/5" : "border-transparent")}
        data-testid="gallery-dropzone"
      >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)} accessibility={{ announcements: ANNOUNCE }}>
        <SortableContext items={ordered.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {ordered.map((img, i) => (
              <SortableImage key={img.id} image={img} index={i} disabled={readOnly} onDelete={() => onDelete(img.id)} />
            ))}
            {!readOnly ? (
              <li>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  <ImagePlus className="size-5" strokeWidth={1.5} aria-hidden />
                  {uploading ? `جارٍ الرفع${progress ? ` ${progress}` : ""}…` : "إضافة صور"}
                  {!uploading ? <span className="text-[10px]">أو أفلتها هنا</span> : null}
                </button>
              </li>
            ) : null}
          </ul>
        </SortableContext>
      </DndContext>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif"
        className="sr-only"
        aria-label="رفع صور المنتج"
        onChange={(e) => void onFiles(e.target.files)}
        data-testid="gallery-input"
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">jpg, jpeg, png, webp, gif — اسحب صورة إلى البداية لتصبح الرئيسية.</p>
      )}
      {product.image_url || product.video_url ? (
        <ul className="flex flex-col divide-y divide-border/60 surface-card text-sm overflow-hidden">
          {product.image_url ? (
            <li className="flex items-center gap-2 px-3 py-2">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="rounded-sm border border-border px-1 text-[11px]">رابط</span>
              <Mono className="truncate text-xs">{product.image_url}</Mono>
            </li>
          ) : null}
          {product.video_url ? (
            <li className="flex items-center gap-2 px-3 py-2">
              <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="rounded-sm border border-border px-1 text-[11px]">رابط</span>
              <Mono className="truncate text-xs">{product.video_url}</Mono>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
