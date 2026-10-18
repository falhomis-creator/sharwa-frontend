"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { contrast } from "@/lib/color";
import { cn } from "@/lib/utils";
import { ColorInput } from "@/features/settings/components/controls";
import { DESIGN_STYLES } from "@/features/storefront/theme/presets";
import { usePresets } from "@/features/design/api";
import { FontPicker } from "@/features/design/components/font-picker";
import { checkImage, formatBytes } from "@/features/design/image-file";
import {
  ALLOWED_FORMATS_MESSAGE,
  COLOR_LABELS,
  COLOR_TOKENS,
  DESIGN_STYLE_LABELS,
  HEX_RE,
  type Preset,
} from "@/features/design/schemas";
import { useDesignStore } from "@/features/design/store";
import { Skeleton } from "@/components/ui/skeleton";

/** «الهوية» tab: presets as dense rows drawn from their tokens, 5 colours, 2 fonts, style, logo. */
export function IdentityPanel() {
  return (
    <div className="flex flex-col gap-6" data-testid="identity-panel">
      <PresetList />
      <ColorFields />
      <FontFields />
      <StyleField />
      <LogoField />
    </div>
  );
}

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-medium">{children}</h3>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dots({ preset }: { preset: Pick<Preset, "tokens"> }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden>
      {COLOR_TOKENS.map((k) => (
        <span key={k} className="size-3.5 rounded-full border border-border" style={{ backgroundColor: preset.tokens[k] }} />
      ))}
    </span>
  );
}

function PresetList() {
  const presets = usePresets();
  const selected = useDesignStore((s) => s.theme.theme_preset);
  const published = useDesignStore((s) => s.base?.theme.theme_preset);
  const choose = useDesignStore((s) => s.choosePreset);
  return (
    <section className="flex flex-col gap-2" aria-labelledby="presets-title">
      <h3 id="presets-title" className="text-sm font-medium">
        القوالب الجاهزة
      </h3>
      {selected === "custom" ? (
        <p className="text-xs text-muted-foreground" data-testid="preset-custom">
          القالب الحالي: <span className="text-foreground">مخصّص</span> — عدّلت الرموز يدوياً.
        </p>
      ) : null}
      {presets.isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : presets.isError ? (
        <p className="text-xs text-destructive">
          تعذّر تحميل القوالب.{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => void presets.refetch()}>
            إعادة المحاولة
          </button>
        </p>
      ) : (
        <div role="radiogroup" aria-labelledby="presets-title" className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(presets.data ?? []).map((p) => {
            const active = p.code === selected;
            return (
              <button
                key={p.code}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`preset-row-${p.code}`}
                onClick={() => choose(p)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-start transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none",
                  active && "bg-muted",
                )}
              >
                <Dots preset={p} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {p.name}
                    {p.code === published ? <span className="text-[11px] font-normal text-muted-foreground">المنشور</span> : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {p.heading_font === p.body_font ? p.heading_font : `${p.heading_font} · ${p.body_font}`}
                  </span>
                </span>
                {active ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ColorFields() {
  const theme = useDesignStore((s) => s.theme);
  const base = useDesignStore((s) => s.base?.theme);
  const set = useDesignStore((s) => s.setThemeField);
  const errors = useDesignStore((s) => s.serverErrors.theme);
  const valid = HEX_RE.test(theme.text_color) && HEX_RE.test(theme.background_color);
  const ratio = valid ? contrast(theme.text_color, theme.background_color) : null;
  return (
    <section className="flex flex-col gap-3" aria-label="الألوان">
      <SectionTitle hint="تُطبَّق على المتجر فقط؛ لوحة التحكم تبقى رمادية.">الألوان</SectionTitle>
      {COLOR_TOKENS.map((k) => {
        const v = theme[k];
        const local = HEX_RE.test(v) ? undefined : "لون بصيغة #RRGGBB.";
        return (
          <Field
            key={k}
            label={COLOR_LABELS[k]}
            htmlFor={k}
            error={local ?? errors[k]}
            hint={
              k === "text_color" && ratio !== null ? (
                ratio < 4.5 ? (
                  <span className="text-warning" data-testid="contrast-warning">
                    تباين منخفض بين النص والخلفية (<Mono>{ratio.toFixed(1)}:1</Mono>) — أقل من 4.5:1، قد يصعب القراءة.
                  </span>
                ) : (
                  <>
                    التباين مع الخلفية <Mono>{ratio.toFixed(1)}:1</Mono>
                  </>
                )
              ) : undefined
            }
          >
            <ColorInput id={k} value={v} onChange={(nv) => set(k, nv.startsWith("#") ? nv.toUpperCase() : nv)} fallback={base ? base[k] : v} />
          </Field>
        );
      })}
    </section>
  );
}

function FontFields() {
  const heading = useDesignStore((s) => s.theme.heading_font);
  const body = useDesignStore((s) => s.theme.body_font);
  const set = useDesignStore((s) => s.setThemeField);
  return (
    <section className="flex flex-col gap-3" aria-label="الخطوط">
      <SectionTitle>الخطوط</SectionTitle>
      <Field label="خط العناوين" htmlFor="heading_font">
        <FontPicker id="heading_font" label="خط العناوين" value={heading} onChange={(f) => set("heading_font", f)} />
      </Field>
      <Field label="خط النص" htmlFor="body_font">
        <FontPicker id="body_font" label="خط النص" value={body} onChange={(f) => set("body_font", f)} />
      </Field>
    </section>
  );
}

function StyleField() {
  const value = useDesignStore((s) => s.theme.design_style);
  const set = useDesignStore((s) => s.setThemeField);
  return (
    <section className="flex flex-col gap-2" aria-labelledby="style-title">
      <h3 id="style-title" className="text-sm font-medium">
        نمط التصميم
      </h3>
      <div role="radiogroup" aria-labelledby="style-title" className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {DESIGN_STYLES.map((s) => (
          <label key={s} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm has-focus-visible:bg-muted md:min-h-9">
            <span>
              {DESIGN_STYLE_LABELS[s]} <Mono className="text-[11px] text-muted-foreground">{s}</Mono>
            </span>
            <input type="radio" name="design_style" value={s} checked={value === s} onChange={() => set("design_style", s)} className="size-4 accent-foreground" />
          </label>
        ))}
      </div>
    </section>
  );
}

function LogoField() {
  const current = useDesignStore((s) => s.base?.theme.logo ?? null);
  const logo = useDesignStore((s) => s.logo);
  const setLogo = useDesignStore((s) => s.setLogo);
  const serverError = useDesignStore((s) => s.serverErrors.theme.logo);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const shown = logo?.url ?? current;

  return (
    <section className="flex flex-col gap-2" aria-label="الشعار">
      <SectionTitle hint={`${ALLOWED_FORMATS_MESSAGE} · حتى 5MB`}>الشعار</SectionTitle>
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <span className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL / data URL preview
            <img src={shown} alt="الشعار" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">بلا شعار</span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
          {logo ? (
            <span className="truncate" data-testid="logo-picked">
              {logo.file.name} · <Mono>{formatBytes(logo.size)}</Mono> — يُرفع عند النشر
            </span>
          ) : (
            <span>{current ? "الشعار المنشور." : "يظهر اسم المتجر نصاً حتى ترفع شعاراً."}</span>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif"
        className="sr-only"
        data-testid="logo-input"
        aria-label="رفع شعار"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const r = checkImage(file);
          if (!r.ok) {
            setError(r.message);
            return;
          }
          setError(null);
          setLogo({ file: r.file, size: r.size, url: URL.createObjectURL(r.file) });
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={() => input.current?.click()}>
          {shown ? "تغيير الشعار" : "رفع شعار"}
        </Button>
        {logo ? (
          <Button type="button" variant="ghost" className="h-11 md:h-8" onClick={() => setLogo(null)}>
            إلغاء الملف المختار
          </Button>
        ) : null}
      </div>
      {error || serverError ? (
        <p role="alert" className="text-xs text-destructive" data-testid="logo-error">
          {error ?? serverError}
        </p>
      ) : null}
    </section>
  );
}
