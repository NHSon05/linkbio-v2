import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogContent, catalogMetadata } from "@/lib/publishing/CatalogPage";

type Params = Promise<{ slug: string; category: string }>;

// V2-31b: a category of a published page. Unknown categories answer 404 in the proxy first.
export default function CategoryPage({ params }: { params: Params }) {
  // cacheComponents is on: runtime params must be read inside <Suspense>
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Params }) {
  const { slug, category } = await params;
  return <CatalogContent slug={slug} category={category} />;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, category } = await params;
  return catalogMetadata(slug, category);
}
