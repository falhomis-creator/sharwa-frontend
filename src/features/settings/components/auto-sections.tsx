"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heading2, ImagePlus, List, Pilcrow, X } from "lucide-react";
import { AnnouncementBar } from "@/components/ui/announcement-bar";
import { RichText } from "@/components/ui/rich-text";
import { Switch } from "@/components/ui/switch";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { normalizePhone, prettyPhone, toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ABOUT_US_MAX,
  ANNOUNCEMENT_SOFT_MAX,
  DEFAULT_ANNOUNCEMENT_COLORS,
  SCROLL_SPEEDS,
  SCROLL_SPEED_LABELS,
  SCROLL_SPEED_SECONDS,
  SEO_LIMITS,
  STORE_NAME_MAX,
  WEEK_START_DAYS,
  WEEK_START_LABELS,
  announcementInputSchema,
  contactInputSchema,
  contrastRatio,
  identityInputSchema,
  policiesInputSchema,
  seoInputSchema,
  type AnnouncementInput,
  type ContactInput,
  type IdentityInput,
  type PoliciesInput,
  type SeoInput,
  type SettingsSection,
  type StoreSettings,
} from "@/features/settings/schemas";
import { useSettings } from "@/features/settings/api";
import { useAutoSave } from "@/features/settings/hooks/use-section-save";
import { ColorInput, Segmented, TimezonePicker } from "@/features/settings/components/controls";
import {
  SaveIndicator,
  SectionError,
  SectionGate,
  SectionHeader,
  SectionSkeleton,
  SettingBlock,
  SettingRow,
  useFocusHash,
  useSectionAccess,
} from "@/features/settings/components/section-frame";

/**
 * The five auto-saving sections (FR-34.03): identity, contact, policies, SEO and the
 * announcement bar. Each is an RHF + Zod form mounted ONCE with the server row (never
 * re-keyed on save, so typing during a save is never lost); `useAutoSave` sends only the
 * changed fields 800ms after the last edit or on blur.
 */
export function SectionLoader({ section, children }: { section: SettingsSection; children: (s: StoreSettings) => ReactNode }) {
  const query = useSettings();
  return (
    <SectionGate section={section}>
      {query.isLoading ? <SectionSkeleton /> : query.error || !query.data ? <SectionError error={query.error} onRetry={() => void query.refetch()} /> : children(query.data)}
    </SectionGate>
  );
}

function pickValues<K extends keyof StoreSettings>(s: StoreSettings, keys: readonly K[]): Pick<StoreSettings, K> {
  return Object.fromEntries(keys.map((k) => [k, s[k]])) as Pick<StoreSettings, K>;
}

// ── Identity ─────────────────────────────────────────────────────────────────────────
export function IdentitySection() {
  return <SectionLoader section="identity">{(s) => <IdentityForm settings={s} />}</SectionLoader>;
}

function IdentityForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const { canEdit, readOnlyReason } = useSectionAccess("identity");
  const form = useForm<IdentityInput>({
    resolver: zodResolver(identityInputSchema),
    defaultValues: pickValues(settings, ["store_name", "about_us", "timezone", "week_start_day"]),
    mode: "onChange",
  });
  const auto = useAutoSave({
    section: "identity",
    form,
    // US-34.2.2: the shell's store name follows at once (server-rendered → refresh).
    onSaved: (_s, changed) => changed.includes("store_name") && router.refresh(),
  });
  const [name, about, weekStart] = useWatch({ control: form.control, name: ["store_name", "about_us", "week_start_day"] });
  const [initialWeek] = useState(settings.week_start_day);
  const e = form.formState.errors;
  useFocusHash(true);

  return (
    <form onBlur={auto.flush} onSubmit={(ev) => ev.preventDefault()} data-testid="settings-identity">
      <SectionHeader section="identity" indicator={<SaveIndicator section="identity" onRetry={auto.retry} />} readOnlyReason={readOnlyReason} />
      <fieldset disabled={!canEdit} className="min-w-0">
        <SettingRow label="اسم المتجر" description="يظهر في رأس المتجر والفواتير وشريط اللوحة." htmlFor="store_name" error={e.store_name?.message} counter={{ value: name.length, max: STORE_NAME_MAX }}>
          <input id="store_name" {...form.register("store_name")} className={inputClass} aria-invalid={Boolean(e.store_name)} />
        </SettingRow>
        <SettingBlock label="نبذة عن المتجر" description="تظهر في صفحة «من نحن» وفي تذييل المتجر." htmlFor="about_us" error={e.about_us?.message}>
          <textarea
            id="about_us"
            rows={4}
            {...form.register("about_us")}
            className="min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 md:text-sm dark:bg-input/30"
          />
          <Mono className={cn("self-end text-[11px] text-muted-foreground", about.length > ABOUT_US_MAX && "text-destructive")}>
            {about.length}/{ABOUT_US_MAX}
          </Mono>
        </SettingBlock>
        <SettingRow label="المنطقة الزمنية" description="توقيت الطلبات والتقارير. الافتراضية Asia/Aden." htmlFor="timezone" error={e.timezone?.message}>
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => <TimezonePicker id="timezone" value={field.value} onChange={(tz) => field.onChange(tz)} disabled={!canEdit} />}
          />
        </SettingRow>
        <SettingRow
          label="بداية الأسبوع"
          description={weekStart !== initialWeek ? "يؤثر على التقارير الأسبوعية من الأسبوع القادم." : "اليوم الذي تبدأ به التقارير الأسبوعية."}
          htmlFor="week_start_day"
        >
          <Controller
            control={form.control}
            name="week_start_day"
            render={({ field }) => (
              <Segmented
                name="week_start_day"
                label="بداية الأسبوع"
                value={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
                options={WEEK_START_DAYS.map((d) => ({ value: d, label: WEEK_START_LABELS[d] }))}
              />
            )}
          />
        </SettingRow>
      </fieldset>
    </form>
  );
}

// ── Contact ──────────────────────────────────────────────────────────────────────────
export function ContactSection() {
  return <SectionLoader section="contact">{(s) => <ContactForm settings={s} />}</SectionLoader>;
}

const SOCIAL: Array<{ key: "facebook_link" | "instagram_link" | "tiktok_link" | "snapchat_link"; label: string; placeholder: string }> = [
  { key: "facebook_link", label: "فيسبوك", placeholder: "https://facebook.com/…" },
  { key: "instagram_link", label: "إنستغرام", placeholder: "https://instagram.com/…" },
  { key: "tiktok_link", label: "تيك توك", placeholder: "https://tiktok.com/@…" },
  { key: "snapchat_link", label: "سناب شات", placeholder: "https://snapchat.com/add/…" },
];

function ContactForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("contact");
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactInputSchema),
    defaultValues: {
      ...pickValues(settings, ["whatsapp_number", "contact_email", "facebook_link", "instagram_link", "tiktok_link", "snapchat_link"]),
    },
    mode: "onChange",
  });
  const auto = useAutoSave({ section: "contact", form });
  const [rawPhone, setRawPhone] = useState(settings.whatsapp_number ? `+${settings.whatsapp_number}` : "");
  const phone = useWatch({ control: form.control, name: "whatsapp_number" });
  const e = form.formState.errors;
  useFocusHash(true);

  return (
    <form onBlur={auto.flush} onSubmit={(ev) => ev.preventDefault()} data-testid="settings-contact">
      <SectionHeader section="contact" indicator={<SaveIndicator section="contact" onRetry={auto.retry} />} readOnlyReason={readOnlyReason} />
      <fieldset disabled={!canEdit} className="min-w-0">
        <SettingRow
          label="رقم واتساب"
          description={
            phone ? (
              <>
                يُحفظ كـ <Mono dir="ltr">{prettyPhone(phone)}</Mono> — زر واتساب في المتجر يفتح هذا الرقم.
              </>
            ) : (
              <span className="text-warning">زر واتساب في المتجر سيُخفى.</span>
            )
          }
          htmlFor="whatsapp_number"
          error={e.whatsapp_number?.message}
        >
          <input
            id="whatsapp_number"
            type="tel"
            dir="ltr"
            inputMode="tel"
            value={rawPhone}
            onChange={(ev) => {
              setRawPhone(ev.target.value);
              const digits = toWesternDigits(ev.target.value).replace(/\D/g, "");
              const normalized = digits ? normalizePhone(ev.target.value, digits.startsWith("05") || digits.startsWith("5") ? "966" : "967") : "";
              form.setValue("whatsapp_number", normalized, { shouldDirty: true, shouldValidate: true });
            }}
            placeholder="77xxxxxxx أو 05xxxxxxxx"
            className={`${inputClass} font-mono`}
            aria-invalid={Boolean(e.whatsapp_number)}
          />
        </SettingRow>
        <SettingRow label="البريد الإلكتروني" description="يستقبل رسائل نموذج «تواصل معنا»." htmlFor="contact_email" error={e.contact_email?.message}>
          <input id="contact_email" type="email" dir="ltr" {...form.register("contact_email")} className={`${inputClass} font-mono`} aria-invalid={Boolean(e.contact_email)} />
        </SettingRow>
        <SettingRow
          label="النطاق الخاص"
          description={
            <>
              للقراءة هنا؛ يُدار من{" "}
              <Link href="/dashboard/domains" className="text-foreground underline underline-offset-4">
                إدارة النطاقات
              </Link>
              .
            </>
          }
          htmlFor="custom_domain"
        >
          <input id="custom_domain" readOnly dir="ltr" value={settings.custom_domain ?? "—"} className={`${inputClass} font-mono`} />
        </SettingRow>
        {SOCIAL.map((s) => (
          <SettingRow key={s.key} label={s.label} htmlFor={s.key} error={e[s.key]?.message}>
            <input id={s.key} dir="ltr" inputMode="url" placeholder={s.placeholder} {...form.register(s.key)} className={`${inputClass} font-mono`} aria-invalid={Boolean(e[s.key])} />
          </SettingRow>
        ))}
      </fieldset>
    </form>
  );
}

// ── Policies ─────────────────────────────────────────────────────────────────────────
export function PoliciesSection() {
  return <SectionLoader section="policies">{(s) => <PoliciesForm settings={s} />}</SectionLoader>;
}

function PoliciesForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("policies");
  const form = useForm<PoliciesInput>({
    resolver: zodResolver(policiesInputSchema),
    defaultValues: { return_policy: settings.return_policy },
    mode: "onChange",
  });
  const auto = useAutoSave({ section: "policies", form });
  const policy = useWatch({ control: form.control, name: "return_policy" });
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const reg = form.register("return_policy");
  useFocusHash(true);

  /** Toolbar: prefix the caret's line (heading / list) or open a new paragraph. */
  function format(kind: "h" | "li" | "p") {
    const el = ref.current;
    if (!el) return;
    const v = el.value;
    const start = v.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const line = v.slice(start).split("\n")[0] ?? "";
    const bare = line.replace(/^(## |- )/, "");
    const next = kind === "h" ? `## ${bare}` : kind === "li" ? `- ${bare}` : bare;
    const value = kind === "p" ? `${v.slice(0, el.selectionEnd)}\n\n${v.slice(el.selectionEnd)}` : v.slice(0, start) + next + v.slice(start + line.length);
    form.setValue("return_policy", value, { shouldDirty: true });
    el.focus();
  }

  return (
    <form onBlur={auto.flush} onSubmit={(ev) => ev.preventDefault()} data-testid="settings-policies">
      <SectionHeader section="policies" indicator={<SaveIndicator section="policies" onRetry={auto.retry} />} readOnlyReason={readOnlyReason} />
      <fieldset disabled={!canEdit} className="min-w-0">
        <SettingBlock
          label="سياسة الاسترجاع"
          description={
            <>
              سطر يبدأ بـ <Mono dir="ltr">##</Mono> عنوان، وبـ <Mono dir="ltr">-</Mono> عنصر قائمة، وسطر فارغ يفصل الفقرات.
            </>
          }
          htmlFor="return_policy"
          error={form.formState.errors.return_policy?.message}
        >
          <div className="flex gap-1" role="toolbar" aria-label="تنسيق النص">
            {(
              [
                { k: "h", label: "عنوان", Icon: Heading2 },
                { k: "p", label: "فقرة", Icon: Pilcrow },
                { k: "li", label: "قائمة", Icon: List },
              ] as const
            ).map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => format(k)}
                className="inline-flex h-11 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted md:h-8"
              >
                <Icon className="size-3.5" aria-hidden /> {label}
              </button>
            ))}
          </div>
          <textarea
            id="return_policy"
            rows={10}
            {...reg}
            ref={(el) => {
              reg.ref(el);
              ref.current = el;
            }}
            className="min-h-48 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base leading-relaxed md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30"
          />
        </SettingBlock>
        <section className="flex flex-col gap-3 py-5" aria-label="المعاينة">
          <h3 className="text-sm font-medium">كما يراها المشتري</h3>
          <div className="rounded-lg border border-border p-5" data-testid="policy-preview">
            {policy.trim() ? <RichText source={policy} /> : <p className="text-sm text-muted-foreground">لا سياسة بعد — تُخفى الصفحة من المتجر حتى تكتبها.</p>}
          </div>
        </section>
      </fieldset>
    </form>
  );
}

// ── SEO ──────────────────────────────────────────────────────────────────────────────
export function SeoSection() {
  return <SectionLoader section="seo">{(s) => <SeoForm settings={s} />}</SectionLoader>;
}

const OG_EXT = /\.(jpe?g|png|webp|gif)$/i;

function SeoForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("seo");
  const form = useForm<SeoInput>({
    resolver: zodResolver(seoInputSchema),
    defaultValues: pickValues(settings, ["seo_title", "seo_description", "seo_keywords", "seo_og_image"]),
    mode: "onChange",
  });
  const auto = useAutoSave({ section: "seo", form });
  const [title, desc, keywords, og] = useWatch({ control: form.control, name: ["seo_title", "seo_description", "seo_keywords", "seo_og_image"] });
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const e = form.formState.errors;
  useFocusHash(true);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!OG_EXT.test(file.name)) {
      setFileError("الصيغ المسموحة: jpg, jpeg, png, webp, gif");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      form.setValue("seo_og_image", String(reader.result), { shouldDirty: true });
      auto.flush();
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onBlur={auto.flush} onSubmit={(ev) => ev.preventDefault()} data-testid="settings-seo">
      <SectionHeader section="seo" indicator={<SaveIndicator section="seo" onRetry={auto.retry} />} readOnlyReason={readOnlyReason} />
      <fieldset disabled={!canEdit} className="min-w-0">
        <SettingRow label="العنوان" description="عنوان الصفحة الرئيسية في نتائج البحث." htmlFor="seo_title" error={e.seo_title?.message} counter={{ value: title.length, max: SEO_LIMITS.seo_title }}>
          <input id="seo_title" {...form.register("seo_title")} className={inputClass} aria-invalid={Boolean(e.seo_title)} />
        </SettingRow>
        <SettingRow label="الوصف" description="سطران يقرؤهما الباحث تحت العنوان." htmlFor="seo_description" error={e.seo_description?.message} counter={{ value: desc.length, max: SEO_LIMITS.seo_description }}>
          <textarea
            id="seo_description"
            rows={3}
            {...form.register("seo_description")}
            className="min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
        </SettingRow>
        <SettingRow label="الكلمات المفتاحية" description="مفصولة بفواصل." htmlFor="seo_keywords" error={e.seo_keywords?.message} counter={{ value: keywords.length, max: SEO_LIMITS.seo_keywords }}>
          <input id="seo_keywords" {...form.register("seo_keywords")} className={inputClass} aria-invalid={Boolean(e.seo_keywords)} />
        </SettingRow>
        <SettingRow label="صورة المشاركة" description="تظهر عند مشاركة رابط المتجر. jpg, jpeg, png, webp, gif." htmlFor="seo_og_image" error={fileError || e.seo_og_image?.message}>
          <div className="flex items-center gap-2">
            {og ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URL in mock mode; the real adapter serves media URLs
              <img src={og} alt="صورة المشاركة الحالية" className="h-16 w-28 rounded-md border border-border object-cover" />
            ) : (
              <span className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">بلا صورة</span>
            )}
            <button
              id="seo_og_image"
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted md:h-8"
            >
              <ImagePlus className="size-4" aria-hidden /> {og ? "استبدال" : "رفع"}
            </button>
            {og ? (
              <button
                type="button"
                onClick={() => {
                  form.setValue("seo_og_image", null, { shouldDirty: true });
                  auto.flush();
                }}
                aria-label="إزالة الصورة"
                className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:size-8"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="sr-only" onChange={(ev) => pick(ev.target.files?.[0])} tabIndex={-1} />
          </div>
        </SettingRow>
        <section className="flex flex-col gap-3 py-5" aria-label="معاينة نتيجة البحث">
          <h3 className="text-sm font-medium">معاينة نتيجة البحث</h3>
          <div className="flex flex-col gap-1 rounded-lg border border-border p-4" data-testid="serp-preview">
            <Mono dir="ltr" className="truncate text-xs text-muted-foreground">
              {settings.store_url}
            </Mono>
            <span className="truncate text-base text-foreground underline-offset-4">{title || settings.store_name}</span>
            <span className="line-clamp-2 text-sm text-muted-foreground">{desc || "أضف وصفاً ليظهر هنا بدل نص يختاره محرك البحث."}</span>
          </div>
        </section>
      </fieldset>
    </form>
  );
}

// ── Announcement bar ─────────────────────────────────────────────────────────────────
export function AnnouncementSection() {
  return <SectionLoader section="announcement">{(s) => <AnnouncementForm settings={s} />}</SectionLoader>;
}

const PLACEMENTS = [
  { key: "show_banner_on_home", label: "الصفحة الرئيسية" },
  { key: "show_banner_on_products", label: "صفحات المنتجات" },
  { key: "show_banner_on_product_detail", label: "صفحة المنتج" },
  { key: "show_banner_on_checkout", label: "صفحة الدفع" },
] as const;

function AnnouncementForm({ settings }: { settings: StoreSettings }) {
  const { canEdit, readOnlyReason } = useSectionAccess("announcement");
  const form = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementInputSchema),
    defaultValues: pickValues(settings, [
      "enable_announcement_bar",
      "announcement_text",
      "announcement_bg_color",
      "announcement_text_color",
      "announcement_scroll_speed",
      "show_banner_on_home",
      "show_banner_on_products",
      "show_banner_on_product_detail",
      "show_banner_on_checkout",
    ]),
    mode: "onChange",
  });
  const auto = useAutoSave({ section: "announcement", form });
  const v = useWatch({ control: form.control });
  const e = form.formState.errors;
  const text = v.announcement_text ?? "";
  const bg = v.announcement_bg_color ?? DEFAULT_ANNOUNCEMENT_COLORS.bg;
  const fg = v.announcement_text_color ?? DEFAULT_ANNOUNCEMENT_COLORS.text;
  const ratio = contrastRatio(bg, fg);
  useFocusHash(true);

  return (
    <form onBlur={auto.flush} onSubmit={(ev) => ev.preventDefault()} data-testid="settings-announcement">
      <SectionHeader section="announcement" indicator={<SaveIndicator section="announcement" onRetry={auto.retry} />} readOnlyReason={readOnlyReason} />
      <section className="flex flex-col gap-2 border-b border-border py-5" aria-label="المعاينة">
        <h3 className="text-sm font-medium">المعاينة بأبعاد المتجر</h3>
        <div className="overflow-hidden rounded-lg border border-border" data-testid="announcement-preview">
          {text.trim() ? (
            <AnnouncementBar text={text} background={bg} color={fg} seconds={SCROLL_SPEED_SECONDS[v.announcement_scroll_speed ?? "medium"]} className={cn(!v.enable_announcement_bar && "opacity-40")} />
          ) : (
            <p className="flex h-9 items-center px-3 text-xs text-muted-foreground">اكتب نص الشريط لمعاينته.</p>
          )}
          <div className="h-16 bg-muted/40" aria-hidden />
        </div>
        {!v.enable_announcement_bar ? <p className="text-xs text-muted-foreground">الشريط متوقف — لا يظهر في المتجر.</p> : null}
      </section>
      <fieldset disabled={!canEdit} className="min-w-0">
        <SettingRow label="تفعيل الشريط" description="يظهر أعلى الصفحات المختارة أدناه." htmlFor="enable_announcement_bar" error={e.enable_announcement_bar?.message}>
          <Controller
            control={form.control}
            name="enable_announcement_bar"
            render={({ field }) => <Switch id="enable_announcement_bar" checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} className="self-end" />}
          />
        </SettingRow>
        <SettingRow
          label="النص"
          description={text.length > ANNOUNCEMENT_SOFT_MAX ? <span className="text-warning">نص طويل — قد يمر ببطء على الجوال.</span> : "جملة واحدة قصيرة تقرأ أثناء الحركة."}
          htmlFor="announcement_text"
          error={e.announcement_text?.message}
          counter={{ value: text.length, max: ANNOUNCEMENT_SOFT_MAX }}
        >
          <input id="announcement_text" {...form.register("announcement_text")} className={inputClass} aria-invalid={Boolean(e.announcement_text)} />
        </SettingRow>
        <SettingRow label="لون الخلفية" htmlFor="announcement_bg_color" error={e.announcement_bg_color?.message}>
          <Controller
            control={form.control}
            name="announcement_bg_color"
            render={({ field }) => <ColorInput id="announcement_bg_color" value={field.value} onChange={field.onChange} disabled={!canEdit} fallback={DEFAULT_ANNOUNCEMENT_COLORS.bg} />}
          />
        </SettingRow>
        <SettingRow
          label="لون النص"
          description={
            ratio < 4.5 ? (
              <span className="text-warning" data-testid="contrast-warning">
                تباين أقل من AA (<Mono dir="ltr">{ratio.toFixed(1)}:1</Mono>) — قد يصعب قراءته.
              </span>
            ) : (
              <>
                التباين <Mono dir="ltr">{ratio.toFixed(1)}:1</Mono>
              </>
            )
          }
          htmlFor="announcement_text_color"
          error={e.announcement_text_color?.message}
        >
          <Controller
            control={form.control}
            name="announcement_text_color"
            render={({ field }) => <ColorInput id="announcement_text_color" value={field.value} onChange={field.onChange} disabled={!canEdit} fallback={DEFAULT_ANNOUNCEMENT_COLORS.text} />}
          />
        </SettingRow>
        <SettingRow label="سرعة الحركة" description="تتوقف الحركة لمن فعّل «تقليل الحركة» في جهازه." htmlFor="announcement_scroll_speed">
          <Controller
            control={form.control}
            name="announcement_scroll_speed"
            render={({ field }) => (
              <Segmented
                name="announcement_scroll_speed"
                label="سرعة الحركة"
                value={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
                options={SCROLL_SPEEDS.map((s) => ({ value: s, label: SCROLL_SPEED_LABELS[s] }))}
              />
            )}
          />
        </SettingRow>
        <SettingBlock label="أماكن الظهور">
          <div className="grid gap-x-6 sm:grid-cols-2">
            {PLACEMENTS.map((p) => (
              <Controller
                key={p.key}
                control={form.control}
                name={p.key}
                render={({ field }) => (
                  <label htmlFor={p.key} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-b border-border py-1 text-sm last:border-0 sm:[&:nth-last-child(2)]:border-0">
                    {p.label}
                    <Switch id={p.key} checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
                  </label>
                )}
              />
            ))}
          </div>
        </SettingBlock>
      </fieldset>
    </form>
  );
}
