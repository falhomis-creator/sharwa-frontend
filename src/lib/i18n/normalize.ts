/**
 * Arabic search normalization (M48 FR-48.05) — one implementation shared by the command
 * palette and every list search box (M04, M05, M06), so «الكترونيات» finds «إلكترونيات»
 * everywhere or nowhere.
 *
 * Rules (M48 US-48.5.2): أ/إ/آ/ٱ → ا · ة → ه · ى → ي · ؤ → و · ئ → ي · tashkeel and tatweel
 * removed · Arabic-Indic and Persian digits → western · lowercase · whitespace collapsed.
 */
const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

export function normalizeArabic(input: string): string {
  return input
    .replace(TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip the Arabic definite article from a single token («الطلبات» → «طلبات»). */
function stripArticle(token: string): string {
  return token.length > 3 && token.startsWith("ال") ? token.slice(2) : token;
}

/** Levenshtein distance capped at `max` (early exit) — small strings only. */
function boundedDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * Score a query against a list of haystack strings (title + keywords), higher is better,
 * 0 = no match. Order of preference (FR-48.05): word start > substring > fuzzy.
 */
export function matchScore(query: string, haystacks: readonly string[]): number {
  const q = normalizeArabic(query);
  if (!q) return 0;
  const qTokens = q.split(" ").map(stripArticle);
  let best = 0;
  for (const raw of haystacks) {
    const h = normalizeArabic(raw);
    if (!h) continue;
    if (h === q) return 100;
    const words = h.split(" ").map(stripArticle);
    let score = 0;
    let all = true;
    for (const t of qTokens) {
      if (!t) continue;
      if (words.some((w) => w.startsWith(t))) score += 30;
      else if (h.includes(t)) score += 18;
      else {
        const tolerance = t.length >= 6 ? 2 : t.length >= 4 ? 1 : 0;
        if (tolerance > 0 && words.some((w) => boundedDistance(w.slice(0, t.length + 1), t, tolerance) <= tolerance)) {
          score += 8;
        } else {
          all = false;
          break;
        }
      }
    }
    if (all && score > best) best = score;
  }
  return best;
}

/** `true` when every token of the query is found in the text after normalization. */
export function includesNormalized(text: string, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  const h = normalizeArabic(text);
  return q.split(" ").every((t) => h.includes(t));
}
