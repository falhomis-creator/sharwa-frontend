import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

/**
 * Validated environment (contracts/bff-cross-cutting.md §8).
 * The build fails loudly when TENANT_BASE_DOMAIN or API_INTERNAL_URL are missing —
 * never a silent fallback to localhost in production (M47 edge case).
 */
export const env = createEnv({
  server: {
    TENANT_BASE_DOMAIN: z
      .string()
      .min(1, "TENANT_BASE_DOMAIN مطلوب (مثال: localhost أو sharwaah.com)")
      .regex(/^[a-z0-9.-]+$/, "TENANT_BASE_DOMAIN يجب أن يكون نطاقاً صغير الأحرف بلا بروتوكول"),
    API_INTERNAL_URL: z.url("API_INTERNAL_URL يجب أن يكون رابطاً كاملاً (مثال: http://localhost:8000)"),
    API_PROXY_URL: z.url().optional(),
    SHARWA_MOCKS: z.enum(["on", "off"]).default(isProd ? "off" : "on"),
    /** Integrated modules served by Django while mocks are on (`reports`, or `*`). */
    SHARWA_LIVE_MODULES: z
      .string()
      .regex(/^[A-Za-z0-9_*,\s-]*$/, "SHARWA_LIVE_MODULES قائمة وحدات مفصولة بفواصل (مثال: reports)")
      .optional(),
  },
  client: {
    NEXT_PUBLIC_TENANT_BASE_DOMAIN: z.string().min(1),
    NEXT_PUBLIC_PLATFORM_WHATSAPP: z
      .string()
      .regex(/^\d{9,15}$/, "رقم واتساب المنصة بصيغة دولية بلا + (مثال: 967700000000)"),
  },
  runtimeEnv: {
    TENANT_BASE_DOMAIN: process.env.TENANT_BASE_DOMAIN,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    API_PROXY_URL: process.env.API_PROXY_URL,
    SHARWA_MOCKS: process.env.SHARWA_MOCKS,
    SHARWA_LIVE_MODULES: process.env.SHARWA_LIVE_MODULES,
    NEXT_PUBLIC_TENANT_BASE_DOMAIN: process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN,
    NEXT_PUBLIC_PLATFORM_WHATSAPP: process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
