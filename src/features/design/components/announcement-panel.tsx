"use client";

import { Switch } from "@/components/ui/switch";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { contrast } from "@/lib/color";
import { ColorInput, Segmented } from "@/features/settings/components/controls";
import { ANNOUNCEMENT_MAX, ANNOUNCEMENT_SOFT_MAX, DEFAULT_ANNOUNCEMENT_COLORS, SCROLL_SPEEDS, SCROLL_SPEED_LABELS } from "@/features/settings/schemas";
import { HEX_RE } from "@/features/design/schemas";
import { useDesignStore } from "@/features/design/store";

/**
 * «شريط الإعلانات» tab (US-08.4): the M34 fields — the same `StoreSetting` row and the same
 * controls (`ColorInput`, `Segmented`) as «الإعدادات › شريط الإعلانات» — but bound to the
 * draft: every change shows in the preview at once and is sent only by «نشر».
 */
const PLACEMENTS = [
  { key: "show_banner_on_home", label: "الصفحة الرئيسية" },
  { key: "show_banner_on_products", label: "صفحات المنتجات" },
  { key: "show_banner_on_product_detail", label: "صفحة المنتج" },
  { key: "show_banner_on_checkout", label: "صفحة الدفع" },
] as const;

export function AnnouncementPanel() {
  const a = useDesignStore((s) => s.announcement);
  const set = useDesignStore((s) => s.setAnnouncement);
  const server = useDesignStore((s) => s.serverErrors.announcement);
  const bgOk = HEX_RE.test(a.announcement_bg_color);
  const fgOk = HEX_RE.test(a.announcement_text_color);
  const ratio = bgOk && fgOk ? contrast(a.announcement_bg_color, a.announcement_text_color) : null;
  const textError =
    a.announcement_text.length > ANNOUNCEMENT_MAX
      ? `${ANNOUNCEMENT_MAX} حرفاً على الأكثر.`
      : a.enable_announcement_bar && !a.announcement_text.trim()
        ? "اكتب نص الشريط قبل تفعيله، أو أوقفه."
        : server.announcement_text;

  return (
    <div className="flex flex-col gap-5" data-testid="announcement-panel">
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm">
        <span className="flex flex-col">
          تفعيل الشريط
          <span className="text-xs text-muted-foreground">يظهر أعلى الصفحات المختارة أدناه.</span>
        </span>
        <Switch checked={a.enable_announcement_bar} onCheckedChange={(v) => set({ enable_announcement_bar: v })} data-testid="announcement-enable" />
      </label>
      <Field
        label="النص"
        htmlFor="announcement_text"
        error={textError}
        counter={{ value: a.announcement_text.length, max: ANNOUNCEMENT_SOFT_MAX }}
        hint={a.announcement_text.length > ANNOUNCEMENT_SOFT_MAX ? <span className="text-warning">نص طويل — قد يمر ببطء على الجوال.</span> : "جملة واحدة قصيرة تُقرأ أثناء الحركة."}
      >
        <input id="announcement_text" className={inputClass} value={a.announcement_text} onChange={(e) => set({ announcement_text: e.target.value })} aria-invalid={Boolean(textError)} />
      </Field>
      <Field label="لون الخلفية" htmlFor="announcement_bg_color" error={bgOk ? server.announcement_bg_color : "لون بصيغة #RRGGBB."}>
        <ColorInput id="announcement_bg_color" value={a.announcement_bg_color} onChange={(v) => set({ announcement_bg_color: v })} fallback={DEFAULT_ANNOUNCEMENT_COLORS.bg} />
      </Field>
      <Field
        label="لون النص"
        htmlFor="announcement_text_color"
        error={fgOk ? server.announcement_text_color : "لون بصيغة #RRGGBB."}
        hint={
          ratio === null ? undefined : ratio < 4.5 ? (
            <span className="text-warning">
              تباين أقل من AA (<Mono>{ratio.toFixed(1)}:1</Mono>) — قد يصعب قراءته.
            </span>
          ) : (
            <>
              التباين <Mono>{ratio.toFixed(1)}:1</Mono>
            </>
          )
        }
      >
        <ColorInput id="announcement_text_color" value={a.announcement_text_color} onChange={(v) => set({ announcement_text_color: v })} fallback={DEFAULT_ANNOUNCEMENT_COLORS.text} />
      </Field>
      <Field label="سرعة الحركة" htmlFor="announcement_scroll_speed" hint="تتوقف الحركة لمن فعّل «تقليل الحركة» في جهازه، ولا تتحرك إن اتسع السطر للنص.">
        <Segmented
          name="announcement_scroll_speed"
          label="سرعة الحركة"
          value={a.announcement_scroll_speed}
          onChange={(v) => set({ announcement_scroll_speed: v })}
          options={SCROLL_SPEEDS.map((s) => ({ value: s, label: SCROLL_SPEED_LABELS[s] }))}
        />
      </Field>
      <section className="flex flex-col gap-1" aria-labelledby="placements-title">
        <h3 id="placements-title" className="text-sm font-medium">
          أماكن الظهور
        </h3>
        <p className="text-xs text-muted-foreground">تنقّل داخل المعاينة لترى الشريط في كل صفحة.</p>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {PLACEMENTS.map((p) => (
            <label key={p.key} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm md:min-h-10">
              {p.label}
              <Switch checked={a[p.key]} onCheckedChange={(v) => set({ [p.key]: v })} data-testid={`placement-${p.key}`} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
