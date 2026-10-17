import { z, type ZodType } from "zod";

/** DRF PageNumberPagination envelope. */
export function paginated<T>(item: ZodType<T>) {
  return z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(item),
  });
}

export type Paginated<T> = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export const pageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});
