"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Control, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { normalizePhone } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { suggestSubdomain } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { FieldError, FormError, applyApiError } from "@/features/dashboard-shell/components/auth/form-error";
import {
  NORMALIZED_PHONE_RE,
  marketCategoriesSchema,
  merchantPhoneSchema,
  registerResponseSchema,
  registrationDraftSchema,
  storeNameSchema,
  type RegistrationDraft,
  type RegistrationValues,
} from "@/features/onboarding/schemas";
import { messages, register as copy, terms } from "@/features/onboarding/onboarding.content";
import { subdomainCheckKey, useSubdomainCheck, type SubdomainCheck } from "@/features/onboarding/hooks/use-subdomain-check";
import { useOnboardingHydrated, useOnboardingStore } from "@/stores/onboarding";

const FIELDS = ["store_name", "merchant_phone", "subdomain", "interested_categories", "agree_terms"] as const;

/**
 * Panel 01 (US-02.1, US-02.2): exactly the `TenantRegistrationForm` fields (FR-02.02).
 *
 * - The submit stays disabled until the three text fields pass locally and the live
 *   check has not said "taken". The consent box is checked on submit instead, so pressing
 *   the button without it moves focus there with its message (US-02.1.3).
 * - Personal data leaves this panel only through the Zustand store (FR-02.10): the next
 *   URL is the bare `/register/verify`.
 */
export function RegisterForm({ initialStoreName, baseDomain }: { initialStoreName: string; baseDomain: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useOnboardingHydrated();
  const setDraft = useOnboardingStore((s) => s.setDraft);
  const startOtp = useOnboardingStore((s) => s.startOtp);
  const clearDraftErrors = useOnboardingStore((s) => s.clearDraftErrors);
  const [formError, setFormError] = useState("");
  /** Once the merchant types in the subdomain field, the name stops suggesting one. */
  const subdomainEdited = useRef(false);
  const restored = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<RegistrationDraft, unknown, RegistrationValues>({
    resolver: zodResolver(registrationDraftSchema),
    mode: "onTouched",
    defaultValues: {
      store_name: initialStoreName,
      merchant_phone: "",
      subdomain: suggestSubdomain(initialStoreName),
      interested_categories: [],
      agree_terms: false,
    },
  });

  const draftErrors = useOnboardingStore((s) => s.draftErrors);

  // A fresh mount after a reload: restore the stored draft once.
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const { draft } = useOnboardingStore.getState();
    if (!draft) return;
    subdomainEdited.current = true;
    reset(draft);
  }, [hydrated, reset]);

  // Sent back from panel 02 by a server rejection (US-02.3.4): the message lands on its
  // field. Subscribed rather than run-once, because Next re-shows this route from a hidden
  // Activity with its values intact instead of remounting it.
  useEffect(() => {
    if (!hydrated) return;
    const entries = Object.entries(draftErrors).filter(([, message]) => message);
    if (entries.length === 0) return;
    for (const [field, message] of entries) {
      setError(field as Path<RegistrationDraft>, { type: "server", message }, { shouldFocus: true });
    }
    clearDraftErrors();
  }, [hydrated, draftErrors, setError, clearDraftErrors]);

  const [storeName, phone, subdomain] = useWatch({ control, name: ["store_name", "merchant_phone", "subdomain"] });
  const check = useSubdomainCheck(subdomain);
  const normalizedPhone = phone ? normalizePhone(phone) : "";

  const subdomainServerError = errors.subdomain?.type === "server" ? errors.subdomain.message : undefined;
  // A server verdict stands until its field is edited — even over a live check that says
  // «متاح» (the live check and the final validation can disagree, M02 §8).
  const serverRejected = (["store_name", "merchant_phone", "subdomain"] as const).some(
    (field) => errors[field]?.type === "server",
  );
  const fieldsValid =
    !serverRejected &&
    storeNameSchema.safeParse(storeName).success &&
    merchantPhoneSchema.safeParse(phone).success &&
    (check.state === "available" || check.state === "unknown");

  /** A server message is about the value it judged; editing that field retires it. */
  function retireServerError(field: Path<RegistrationDraft>) {
    if (errors[field as keyof typeof errors]?.type === "server") clearErrors(field);
  }

  const storeNameField = register("store_name");
  const phoneField = register("merchant_phone");
  const subdomainField = register("subdomain");

  async function onValid(values: RegistrationValues) {
    setFormError("");
    setDraft({ ...values, agree_terms: true });
    try {
      const otp = await apiFetch("/api/bff/public/register", registerResponseSchema, {
        json: { ...values, merchant_phone: normalizePhone(values.merchant_phone) },
      });
      startOtp(otp);
      router.push("/register/verify");
    } catch (error) {
      if (!isApiError(error)) {
        setFormError(messages.network);
        return;
      }
      const subdomainMessage = error.fields?.subdomain?.[0];
      if (subdomainMessage) {
        // The old «متاح» must not survive a server "taken" (M02 §8).
        queryClient.setQueryData(subdomainCheckKey(values.subdomain), { available: false, reason: subdomainMessage });
      }
      setFormError(applyApiError(error, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <FormError message={formError} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="store_name">{copy.storeName.label}</Label>
        <Input
          id="store_name"
          autoComplete="organization"
          enterKeyHint="next"
          placeholder={copy.storeName.placeholder}
          maxLength={100}
          className="h-11"
          aria-invalid={Boolean(errors.store_name)}
          {...storeNameField}
          onChange={(event) => {
            retireServerError("store_name");
            if (!subdomainEdited.current) {
              setValue("subdomain", suggestSubdomain(event.target.value), {
                shouldValidate: Boolean(touchedFields.subdomain),
              });
            }
            void storeNameField.onChange(event);
          }}
        />
        <FieldError message={errors.store_name?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="merchant_phone">{copy.phone.label}</Label>
        <Input
          id="merchant_phone"
          dir="ltr"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          enterKeyHint="next"
          placeholder={copy.phone.placeholder}
          className="h-11 text-start font-mono tabular-nums"
          aria-invalid={Boolean(errors.merchant_phone)}
          aria-describedby="merchant_phone-hint"
          {...phoneField}
          onChange={(event) => {
            retireServerError("merchant_phone");
            void phoneField.onChange(event);
          }}
        />
        {errors.merchant_phone ? (
          <p id="merchant_phone-hint" className="text-sm text-destructive">
            {errors.merchant_phone.message}
            {errors.merchant_phone.message === messages.phoneTaken ? (
              <>
                {" — "}
                <Link href="/login" className="text-foreground underline underline-offset-4">
                  {copy.merchantLogin}
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <p id="merchant_phone-hint" className="text-sm text-muted-foreground">
            {NORMALIZED_PHONE_RE.test(normalizedPhone) ? (
              <>
                {copy.phone.normalizedLabel} <Mono className="text-foreground">{normalizedPhone}</Mono>
              </>
            ) : (
              copy.phone.hint
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subdomain">{copy.subdomain.label}</Label>
        <div
          dir="ltr"
          className={cn(
            "flex h-11 min-w-0 items-center rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
            (subdomainServerError || check.state === "taken" || (check.state === "invalid" && touchedFields.subdomain)) &&
              "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20",
          )}
        >
          <input
            id="subdomain"
            dir="ltr"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder={copy.subdomain.placeholder}
            maxLength={63}
            className="-my-px h-11 w-0 min-w-0 flex-1 bg-transparent ps-3 font-mono text-base outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            aria-invalid={Boolean(subdomainServerError) || check.state === "taken" || check.state === "invalid"}
            aria-describedby="subdomain-status"
            {...subdomainField}
            onChange={(event) => {
              subdomainEdited.current = true;
              retireServerError("subdomain");
              void subdomainField.onChange(event);
            }}
          />
          <Mono className="shrink-0 pe-3 text-sm text-muted-foreground">.{baseDomain}</Mono>
          <SubdomainStatus check={check} serverError={subdomainServerError} touched={Boolean(touchedFields.subdomain)} />
        </div>
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {subdomain ? (
            <>
              {copy.subdomain.preview}{" "}
              <Mono className="text-foreground">
                {subdomain}.{baseDomain}
              </Mono>
            </>
          ) : (
            copy.subdomain.hint
          )}
        </p>
      </div>

      <CategoryChips control={control} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <label htmlFor="agree_terms" className="flex min-h-11 cursor-pointer items-center gap-3">
            <input id="agree_terms" type="checkbox" className="peer sr-only" {...register("agree_terms")} />
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-input text-background transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-aria-invalid:border-destructive [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span>{copy.terms.before}</span>
          </label>
          <TermsDialog />
          <span>{copy.terms.after}</span>
        </div>
        <FieldError message={errors.agree_terms?.message} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-card px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" size="lg" className="h-11 w-full" disabled={!fieldsValid || isSubmitting}>
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>
      </div>
    </form>
  );
}

/** The live result, inside the field (FR-02.04) — not a separate alert. */
function SubdomainStatus({
  check,
  serverError,
  touched,
}: {
  check: SubdomainCheck;
  serverError?: string;
  touched: boolean;
}) {
  let text = "";
  let tone = "text-muted-foreground";
  if (serverError) {
    text = serverError;
    tone = "text-destructive";
  } else if (check.state === "invalid" || check.state === "taken") {
    text = check.reason;
    tone = "text-destructive";
  } else if (check.state === "empty" && touched) {
    text = "فارغ";
    tone = "text-destructive";
  } else if (check.state === "checking") {
    text = copy.subdomain.checking;
  } else if (check.state === "available") {
    text = copy.subdomain.available;
    tone = "text-success";
  } else if (check.state === "unknown") {
    text = copy.subdomain.unchecked;
  }
  return (
    // LTR like the field it sits in, so `border-s` lands between the domain and the
    // result; only the words inside are RTL.
    <span
      id="subdomain-status"
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-full shrink-0 items-center border-s border-border px-3 text-xs font-medium whitespace-nowrap empty:hidden",
        tone,
      )}
    >
      {text ? (
        <span dir="rtl" className="flex items-center gap-1">
          {check.state === "available" && !serverError ? <Check className="size-3.5" aria-hidden /> : null}
          {text}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Optional sectors as toggle chips. Skeleton while loading; hidden silently when the list
 * is unavailable or empty (US-02.1.4).
 */
function CategoryChips({ control }: { control: Control<RegistrationDraft, unknown, RegistrationValues> }) {
  const categories = useQuery({
    queryKey: storeKey(null, "onboarding", "market-categories"),
    queryFn: ({ signal }) => apiFetch("/api/bff/public/market-categories", marketCategoriesSchema, { signal }),
    staleTime: Infinity,
    retry: false,
  });

  if (categories.isError || (categories.isSuccess && categories.data.length === 0)) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex items-baseline gap-1.5 text-sm font-medium">
        {copy.categories.label}
        <span className="text-xs font-normal text-muted-foreground">{copy.categories.optional}</span>
      </legend>
      {categories.isPending ? (
        <div className="flex flex-wrap gap-2" aria-hidden>
          {[88, 72, 96, 64, 80].map((w) => (
            <Skeleton key={w} className="h-11 md:h-9" style={{ width: w }} />
          ))}
        </div>
      ) : (
        <Controller
          control={control}
          name="interested_categories"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {categories.data.map((category) => {
                const selected = field.value.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      field.onChange(
                        selected ? field.value.filter((id) => id !== category.id) : [...field.value, category.id],
                      )
                    }
                    className={cn(
                      "inline-flex h-11 items-center rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        />
      )}
    </fieldset>
  );
}

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex h-11 items-center font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {copy.terms.link}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-lg">
        <DialogTitle className="text-lg">{terms.title}</DialogTitle>
        <ol className="flex list-decimal flex-col gap-3 ps-5 text-sm leading-relaxed text-muted-foreground">
          {terms.paragraphs.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <DialogClose render={<Button variant="outline" className="h-11" />}>{terms.close}</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
