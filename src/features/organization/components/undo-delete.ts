"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * FR-05.09: an entity with no products is deleted with a 5-second «تراجع» instead of a
 * dialog. The row disappears from the cache at once; the request is only sent when the
 * window closes without an undo, and a failure puts the row back.
 */
export function deleteWithUndo<T extends { id: number }>({
  qc,
  queryKey,
  item,
  label,
  request,
  onSettled,
}: {
  qc: QueryClient;
  queryKey: QueryKey;
  item: T;
  label: string;
  request: () => Promise<unknown>;
  onSettled?: () => void;
}) {
  const previous = qc.getQueryData<T[]>(queryKey);
  qc.setQueryData<T[]>(queryKey, (old) => old?.filter((x) => x.id !== item.id));
  let undone = false;
  toast(`حُذف «${label}»`, {
    duration: 5000,
    action: {
      label: "تراجع",
      onClick: () => {
        undone = true;
        qc.setQueryData(queryKey, previous);
      },
    },
  });
  window.setTimeout(() => {
    if (undone) return;
    request()
      .catch(() => {
        qc.setQueryData(queryKey, previous);
        toast.error(`تعذّر حذف «${label}».`);
      })
      .finally(() => onSettled?.());
  }, 5000);
}

/** Read an image file as a data URL (mock upload; the real adapter sends multipart). */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
