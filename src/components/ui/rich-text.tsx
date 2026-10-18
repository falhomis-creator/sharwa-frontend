import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The tiny text format of store policies (M34 US-34.4.1 «عناوين/فقرات/قوائم»): a line
 * starting with `## ` is a heading, `- ` a list item, a blank line separates paragraphs.
 * Rendered as React elements — never as HTML — by the storefront policy page (M09) and the
 * settings preview, so what the merchant previews is what the buyer reads.
 */
export function RichText({ source, className }: { source: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="list-disc space-y-1 ps-5">
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={`p${blocks.length}`}>{para.join(" ")}</p>);
      para = [];
    }
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushPara();
    } else if (line.startsWith("## ")) {
      flushList();
      flushPara();
      blocks.push(
        <h3 key={`h${blocks.length}`} className="text-base font-semibold">
          {line.slice(3)}
        </h3>,
      );
    } else if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushList();
  flushPara();
  return <div className={cn("flex flex-col gap-3 text-sm leading-relaxed", className)}>{blocks}</div>;
}
