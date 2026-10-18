"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { isApiError } from "@/lib/api-error";
import type { SettingsSection, StoreSettings } from "@/features/settings/schemas";
import { useSaveSettings } from "@/features/settings/api";
import { clockNow } from "@/features/settings/components/section-frame";
import { useSettingsStore } from "@/stores/settings";

/**
 * Put DRF `{field:[msg]}` errors under their fields and focus the first one (FR-34.06).
 * Returns false when the error was not a field error.
 */
export function applyFieldErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown): boolean {
  if (!isApiError(err) || !err.fields) return false;
  const names = Object.keys(err.fields).filter((k) => k in form.getValues());
  names.forEach((k) => form.setError(k as Path<T>, { type: "server", message: err.fields![k]![0] }));
  if (names[0]) form.setFocus(names[0] as Path<T>);
  return names.length > 0;
}

/**
 * FR-34.03 auto-save: 800ms after the last change (or at once on blur), only the CHANGED
 * fields are sent, after the form's own Zod validation. A network failure keeps the values,
 * says «لم يُحفظ — إعادة المحاولة» and retries ONCE after 5s (M34 §8). A pending save is
 * flushed when the section unmounts, so switching sections never drops an edit (SC-34.2).
 */
export function useAutoSave<T extends FieldValues>({
  section,
  form,
  onSaved,
}: {
  section: SettingsSection;
  form: UseFormReturn<T>;
  onSaved?: (saved: StoreSettings, changed: string[]) => void;
}) {
  const save = useSaveSettings();
  const setAuto = useSettingsStore((s) => s.setAuto);
  const lastSaved = useRef<T | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const retried = useRef(false);

  // The save routine reads the latest form/props; it is kept in a ref (refreshed after each
  // render) so timers, blur handlers and the unmount flush all call the current one.
  const flushRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    flushRef.current = async () => {
      window.clearTimeout(timer.current);
      timer.current = undefined;
      const values = form.getValues();
      const base = lastSaved.current ?? (form.formState.defaultValues as T);
      const changed = Object.keys(values).filter((k) => JSON.stringify(values[k]) !== JSON.stringify(base?.[k]));
      if (changed.length === 0) return;
      const valid = await form.trigger(changed as Path<T>[]);
      if (!valid) {
        setAuto(section, "error", { message: "تحقق من الحقول المعلّمة" });
        return;
      }
      setAuto(section, "saving");
      try {
        const body = Object.fromEntries(changed.map((k) => [k, values[k]]));
        const saved = await save(section, body);
        lastSaved.current = { ...(base as T), ...body } as T;
        retried.current = false;
        setAuto(section, "saved", { at: clockNow() });
        onSaved?.(saved, changed);
      } catch (err) {
        if (applyFieldErrors(form, err)) {
          setAuto(section, "error", { message: "تحقق من الحقول المعلّمة" });
          return;
        }
        setAuto(section, "error", { message: "لم يُحفظ" });
        if (!retried.current) {
          retried.current = true;
          timer.current = window.setTimeout(() => void flushRef.current(), 5000);
        }
      }
    };
  });

  useEffect(() => {
    const sub = form.watch((_values, info) => {
      if (!info.name) return; // resets and programmatic full updates are not edits
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flushRef.current(), 800);
    });
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (timer.current !== undefined) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      sub.unsubscribe();
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current !== undefined) void flushRef.current();
    };
  }, [form]);

  return {
    /** Save now (on blur). */
    flush: () => void flushRef.current(),
    retry: () => {
      retried.current = false;
      void flushRef.current();
    },
  };
}

/**
 * FR-34.04/05 explicit sections: dirty → the shell's «لديك تغييرات غير محفوظة» bar holds
 * section navigation; `⌘S` and the bar's «حفظ» open THIS section's confirmation; after a
 * save or a discard the held navigation (if any) continues. `beforeunload` warns too.
 */
export function useExplicitSection<T extends FieldValues>({
  section,
  form,
  openConfirm,
}: {
  section: SettingsSection;
  form: UseFormReturn<T>;
  openConfirm: () => void;
}) {
  const router = useRouter();
  const dirty = form.formState.isDirty;
  const setExplicit = useSettingsStore((s) => s.setExplicit);
  const clearExplicit = useSettingsStore((s) => s.clearExplicit);

  const request = useEffectEvent(() => openConfirm());
  const discard = useEffectEvent(() => {
    form.reset();
    clearExplicit(section);
    const href = useSettingsStore.getState().takePendingHref();
    if (href) router.push(href);
  });

  useEffect(() => {
    if (!dirty) {
      clearExplicit(section);
      return;
    }
    setExplicit({ section, requestSave: () => request(), discard: () => discard() });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") {
        e.preventDefault();
        request();
      }
    };
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, section, setExplicit, clearExplicit]);

  // Leaving the section (route change) drops its handle.
  useEffect(() => () => clearExplicit(section), [section, clearExplicit]);

  /** Call after a confirmed, successful save with the server's values. */
  return {
    afterSave: (values: T) => {
      form.reset(values);
      clearExplicit(section);
      const href = useSettingsStore.getState().takePendingHref();
      if (href) router.push(href);
    },
  };
}
