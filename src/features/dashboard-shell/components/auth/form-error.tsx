"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api-error";

/**
 * DRF error envelope → the form (contracts/bff-cross-cutting §4):
 * `{field: [msg]}` lands under the field, `{detail}` above the form.
 * Returns the form-level message, if any.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: ReadonlyArray<Path<T>>,
): string {
  if (!isApiError(error)) {
    return error instanceof Error && error.message ? error.message : "حدث خطأ غير متوقع.";
  }
  let handled = false;
  if (error.fields) {
    for (const [field, messages] of Object.entries(error.fields)) {
      if (!messages.length) continue;
      if (knownFields.includes(field as Path<T>)) {
        setError(field as Path<T>, { type: "server", message: messages[0] });
        handled = true;
      }
    }
  }
  if (error.detail) return error.detail;
  return handled ? "" : error.userMessage;
}

/** Form-level message, above the fields (M03 FR-03.07). */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

/** Field-level message, under the field. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
