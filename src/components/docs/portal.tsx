import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type * as PageTree from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import type { MDXComponents } from "mdx/types";
import { getDocsSettings, isSectionEnabled } from "@/features/docs/api/docs-settings";
import { portals, type PortalKey } from "@/lib/docs/source";
import { baseOptions } from "@/lib/docs/layout.shared";
import { AR_TRANSLATIONS } from "@/lib/docs/translations";
import { getMDXComponents } from "@/mdx-components";
import { DocumentDirection } from "./document-direction";
import { OpenAPIPage } from "./api-page";

/** The shape every portal loader exposes, without the per-collection generics. */
interface AnyPage {
  url: string;
  path: string;
  data: {
    type?: "mdx" | "openapi";
    title?: string;
    description?: string;
    status?: string;
    full?: boolean;
    toc?: TOCItemType[];
    body?: React.ComponentType<{ components?: MDXComponents }>;
    getOpenAPIPageProps?: () => React.ComponentProps<typeof OpenAPIPage>;
  };
}
interface AnySource {
  getPage(slugs: string[] | undefined): AnyPage | undefined;
  getPageTree(): PageTree.Root;
  generateParams(): { slug: string[] }[];
}

const sourceOf = (key: PortalKey) => portals[key].source as unknown as AnySource;

/**
 * Provider + layout for one portal: direction, language, search scope, sidebar tree.
 * A portal whose section switch is off (platform console → docs settings) redirects to /docs.
 */
export async function PortalLayout({
  portal,
  tree,
  children,
}: {
  portal: PortalKey;
  /** Override the sidebar tree (developer portal, see src/lib/docs/trees.ts). */
  tree?: PageTree.Root;
  children: ReactNode;
}) {
  const p = portals[portal];
  if (!p.public) notFound();
  const settings = await getDocsSettings();
  if (!isSectionEnabled(settings, portal)) redirect("/docs");
  return (
    <>
      <DocumentDirection dir={p.dir} lang={p.lang} />
      <RootProvider
        dir={p.dir}
        // next-themes is already provided by the root layout (src/app/layout.tsx).
        theme={{ enabled: false }}
        search={{
          // Search is scoped to the current portal (spec §8.4). No tag switcher: in
          // fumadocs-ui 16.17.9 its footer renders outside the dialog box.
          options: { api: "/api/docs/search", defaultTag: portal },
        }}
        i18n={p.lang === "ar" ? { locale: "ar", translations: AR_TRANSLATIONS } : undefined}
      >
        <DocsLayout tree={tree ?? sourceOf(portal).getPageTree()} {...baseOptions(p.lang, settings)}>
          {children}
        </DocsLayout>
      </RootProvider>
    </>
  );
}

/** The raw developer page tree, for src/lib/docs/trees.ts. */
export const developerTree = () => sourceOf("developer").getPageTree();

/** All page slugs of a portal. */
export const portalSlugs = (portal: PortalKey) => sourceOf(portal).generateParams().map((p) => p.slug);

/** Renders one portal page: MDX, or a generated OpenAPI operation. */
export async function PortalPage({ portal, slug }: { portal: PortalKey; slug: string[] | undefined }) {
  const p = portals[portal];
  if (!p.public) notFound();
  const page = sourceOf(portal).getPage(slug);
  if (!page) notFound();

  if (page.data.type === "openapi" && page.data.getOpenAPIPageProps) {
    return (
      <DocsPage full>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <OpenAPIPage {...page.data.getOpenAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  const Mdx = page.data.body;
  if (!Mdx) notFound();
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Mdx components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function portalMetadata(portal: PortalKey, slug: string[] | undefined): Metadata {
  const p = portals[portal];
  const page = p.public ? sourceOf(portal).getPage(slug) : undefined;
  if (!page) return {};
  const scaffold = page.data.status === "scaffold";
  return {
    title: `${page.data.title} — ${p.title}`,
    description: page.data.description,
    // Operator/internal portals and unwritten scaffold pages stay out of search engines.
    robots: p.indexed && !scaffold ? undefined : { index: false, follow: true },
  };
}

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

/** page.tsx exports for one portal's `[[...slug]]` route. `exclude` drops slugs served elsewhere. */
export function portalPage(portal: PortalKey, exclude?: (slug: string[]) => boolean) {
  const p = portals[portal];

  async function Page({ params }: PageProps) {
    const { slug } = await params;
    if (slug && exclude?.(slug)) notFound();
    return <PortalPage portal={portal} slug={slug} />;
  }

  function generateStaticParams() {
    // Cache Components needs at least one param; a hidden portal renders notFound().
    if (!p.public) return [{ slug: [] }];
    return portalSlugs(portal)
      .filter((slug) => !exclude?.(slug))
      .map((slug) => ({ slug }));
  }

  async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    return portalMetadata(portal, slug);
  }

  return { Page, generateStaticParams, generateMetadata };
}
