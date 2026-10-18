/**
 * Structured data as a `<script type="application/ld+json">` (M09 FR-09.10, M10 US-10.7.4).
 * `<` is escaped so merchant text can never close the script element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
