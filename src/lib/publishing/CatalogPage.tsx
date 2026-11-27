import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BioPage } from "@/lib/renderer/BioPage";
import { PageTracker } from "@/lib/publishing/PageTracker";
import { getPublishedPage } from "@/lib/publishing/published";
import { findCategory } from "@/templates/catalog";

/**
 * V2-31b: /{slug}/{category}[/{subcategory}]. Reads the same cached snapshot (and cache tags) as /{slug},
 * so publish, rename and delete refresh category views too (V2-32a not needed).
 */
export async function CatalogContent({
  slug,
  category,
  subcategory,
}: {
  slug: string;
  category: string;
  subcategory?: string;
}) {
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  // Renamed page: keep the category part. The proxy answers 308 first; this covers client navigations.
  if ("redirectTo" in page)
    permanentRedirect(
      [page.redirectTo, category, subcategory].filter(Boolean).join("/"),
    );
  const match = findCategory(page.site, category, subcategory);
  if (!match) notFound();
  return (
    <main className="min-h-dvh">
      <BioPage site={page.site} view={match} />
      {/* Views count per page; the events API only knows /{slug}. */}
      <PageTracker path={`/${slug}`} />
    </main>
  );
}

export async function catalogMetadata(
  slug: string,
  category: string,
  subcategory?: string,
): Promise<Metadata> {
  const page = await getPublishedPage(slug);
  if (!page || "redirectTo" in page) return {};
  const match = findCategory(page.site, category, subcategory);
  if (!match) return {};
  const name = (match.subcategory ?? match.category).name;
  return { title: `${name} · ${page.site.profile.title}` };
}
