import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogContent, catalogMetadata } from "@/lib/publishing/CatalogPage";

type Params = Promise<{ slug: string; category: string; subcategory: string }>;

// V2-31b: a subcategory (depth 2, the maximum) of a published page. Unknown ones answer 404 in the proxy.
export default function SubcategoryPage({ params }: { params: Params }) {
  // cacheComponents is on: runtime params must be read inside <Suspense>
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Params }) {
  const { slug, category, subcategory } = await params;
  return (
    <CatalogContent slug={slug} category={category} subcategory={subcategory} />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, category, subcategory } = await params;
  return catalogMetadata(slug, category, subcategory);
}
